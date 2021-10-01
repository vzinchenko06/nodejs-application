const fastifyFactory = require('fastify');
const WebSocket = require('ws');
const { URLSearchParams } = require('url');
const ClientSession = require('./client-session');

const authConnections = new Map();

async function restoreSession(app, authorization) {
  const session = new ClientSession();
  app.logger.debug('Restore Session:', authorization);
  if (authorization) {
    const { cognito, providers } = app.services;
    try {
      const cognitoUser = await cognito.loginDataByToken(authorization);
      const dbUser = await providers.userProvider.findOne({ userName: cognitoUser.username });
      session.authorize(Object.assign({}, cognitoUser, dbUser));
    } catch (error) {
      app.logger.debug('Restore Session:', error.message);
    }
  }

  return session;
}

/**
 * @param {ApplicationInterface} app
 * @param {WebSocket} ws
 * @param {http.IncomingMessage} [req]
 */
function onWebSocket(app, ws, req) {
  const [, searchParamsStr] = String(req.url).split('?');
  const searchParams = new URLSearchParams(searchParamsStr);
  const whenSessionReady = restoreSession(app, searchParams.get('authToken'));

  ws.on('message', async (message) => {
    whenSessionReady
      .then((session) => app.callRpcApi(message.toString(), session))
      .then(ws.send.bind(ws))
      .catch(app.logger.error);
  });

  ws.on('close', async () => {
    whenSessionReady
      .then((session) => {
        if (session.id) {
          authConnections.delete(session.id);
        }
      })
      .catch(app.logger.warn);
  });

  whenSessionReady
    .then((session) => {
      if (session.id) {
        authConnections.set(session.id, ws);
      }
    })
    .catch(app.logger.warn);
}

// function onUserSession(app, id, payload) {
//   app.logger.debug('-> onUserSession WS', authConnections.has(id));
//   if (!authConnections.has(id)) return;

//   /** @type {WebSocket} */
//   const ws = authConnections.get(id);
//   if (ws && ws.readyState === WebSocket.OPEN) {
//     ws.send(JSON.stringify(payload));
//   }
// }

/**
 * initWebServer
 * @param {ApplicationImpl & ApplicationInterface} app
 * @return {Promise<Readonly<ServiceInterface>>}
 */
async function initWebServer(app) {
  const { config, logger } = app;

  const fastify = fastifyFactory({
    logger: logger,
    disableRequestLogging: true,
    ignoreTrailingSlash: true
  });

  fastify.register(require('fastify-cors'), config.serverCors);

  fastify.register(require('fastify-helmet'));

  const wss = new WebSocket.Server({ server: fastify.server });

  fastify.get('/', async () => `${config.about.description} (${config.about.version})`);

  fastify.get('/download/:id', async (request, reply) => {
    const id = request.params.id;

    try {
      const linkObject = await app.callApi('shortLink', { id }, {});

      if (linkObject) return reply.redirect(linkObject.longLink);

      reply.code(404);
      return new Error('Not Found');
    } catch (e) {
      return app.logger.warn;
    }
  });

  fastify.get('/*', async (request, reply) => {
    reply.code(400);
    return Promise.reject(new Error('Bad request'));
  });

  fastify.post('/rpc', async (request, reply) => {
    const session = await restoreSession(app, request.headers.authorization);
    reply.header('Content-Type', 'application/json');
    return app.callRpcApi(request.body, session);
  });

  wss.on('connection', onWebSocket.bind(null, app));

  fastify.listen(config.server);

  return Object.freeze({
    ID: 'web-server',
    async shutdown() {
      wss.close();
      await fastify.close();
      logger.info('Web Server is stopped.');
    }
  });
}

module.exports = initWebServer;
module.exports.ClientSession = ClientSession;
