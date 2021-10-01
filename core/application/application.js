const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');
const { ForbiddenRequestError, MethodNotFoundError, onCatchError } = require('./errors');
const { jsonRpc } = require('./json-rpc');

const apiExtension = path.extname(__filename);

/**
 * @typedef {function(ApplicationInterface)} ApplicationServiceFactory
 * @typedef {function(context: ContextInterface, access: *): Promise<boolean>} ApplicationAccessFunction
 * @typedef {function(context: ContextInterface, validate: , params: *): Promise<>} ApplicationValidateFunction
 */
/**
 * @class Application
 * @implements ApplicationInterface
 * @property {boolean} _finalization
 * @property {ConfigInterface} _config
 * @property {LoggerInterface} _logger
 * @property {Map<string, ApiMethodInterface>} api
 * @property {Map<string, Buffer>} static
 * @property {function} methodAccess
 * @property {function} methodValidate
 */
class Application extends EventEmitter {
  /**
   * @param {LoggerInterface} logger
   * @param {function(): Promise<void>} shutdown
   */
  static applyProcessEvents(logger, shutdown) {
    process.on('message', async (msg) => {
      if (msg === 'shutdown') return shutdown('MESSAGE.SHUTDOWN');
    });
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('uncaughtException', logger.error);
    process.on('warning', logger.warn);
    process.on('unhandledRejection', logger.error);
  }

  /**
   * @private
   */
  _finalization = false;
  /**
   * @protected
   */
  api = new Map();
  /**
   * @private
   */
  static = new Map();
  /**
   * @type {Record<string, ServiceInterface>}
   * @private
   */
  _services = {};
  /**
   * @type ServiceInterface[]
   * @private
   */
  _servers = [];

  /**
   * @param {ConfigInterface} config
   * @param {LoggerInterface} logger
   * @param {string} [name]
   */
  constructor(config, logger, name) {
    super();
    this._config = config || {};
    this._logger = logger || console;
    this.applicationName = name || 'Application';

    Application.applyProcessEvents(this._logger, (message) => {
      if (message) logger.warn('Shutdown reason:', message);
      return this.shutdown()
        .catch(logger.error)
        .finally(() => process.exit(0));
    });
  }

  /**
   * @return {boolean}
   */
  get finalization() {
    return this._finalization;
  }

  /**
   * @property config
   * @return {ConfigInterface}
   */
  get config() {
    return this._config;
  }

  get isProduction() {
    return this.config && this.config.environment === 'production';
  }

  /**
   * @property logger
   * @return {LoggerInterface}
   */
  get logger() {
    return this._logger;
  }

  /**
   * @property services
   * @return {Record<string, ServiceInterface>}
   */
  get services() {
    return this._services;
  }

  /**
   * @property servers
   * @return {ServiceInterface[]}
   */
  get servers() {
    return this._servers;
  }

  /**
   * @param {string} name
   * @return {*}
   */
  getStaticFile(name) {
    return this.static.get(name);
  }

  /**
   * @param {string} name
   * @return {ApiMethodInterface}
   */
  getApiMethod(name) {
    return this.api.get(name.toLowerCase());
  }

  /**
   * @param {string} name
   * @return {ApiMethodInterface}
   */
  getService(name) {
    return this.services[name] || undefined;
  }

  /**
   * @param {ApplicationAccessFunction} [methodAccess]
   */
  setAccessMethod(methodAccess) {
    this.methodAccess = methodAccess || null;
  }

  /**
   * @param {ApplicationValidateFunction} [methodValidate]
   */
  setValidateMethod(methodValidate) {
    this.methodValidate = methodValidate || null;
  }

  /**
   * @param {ApplicationServiceFactory | function(ApplicationInterface)} factory
   * @return {Promise<ServiceInterface>}
   */
  async initServer(factory) {
    const server = await factory(this);
    this._servers.push(server);
    return server;
  }

  /**
   * @param {string} name
   * @param {ApplicationServiceFactory | function(ApplicationInterface)} factory
   * @return {Promise<ServiceInterface>}
   */
  async initService(name, factory) {
    return (this._services[String(name)] = await factory(this));
  }

  /**
   * @param {ApplicationServiceFactory | Record<string, ApplicationServiceFactory> | [string, ApplicationServiceFactory]} factories
   * @return {Promise<void>}
   */
  async initServices(...factories) {
    for (const factory of factories) {
      if (typeof factory === 'function') {
        await this.initServer(factory);
      } else if (Array.isArray(factory) && typeof factory[1] === 'function') {
        await this.initService(...factory);
      } else if (typeof factory === 'object' && Object.keys(factory).length) {
        await Promise.all(Object.entries(factory).map((args) => this.initService(...args)));
      }
    }
  }

  /**
   * @param {string} apiPath
   * @param {string} [staticPath]
   * @return {Promise<void>}
   */
  async startApi(apiPath, staticPath) {
    Object.freeze(this._services);
    Object.freeze(this._servers);
    await this.loadApi(apiPath);
    if (staticPath) await this.loadStatic(staticPath);
    this.logger.info(`${this.applicationName} API started`);
  }

  /**
   * @return {Promise<void>}
   */
  async shutdown(onShutdown = true) {
    if (this._finalization) return;
    this._finalization = true;
    this.logger.info(`Shutdown ${this.applicationName}...`);

    if (onShutdown) await Promise.resolve(this.emit('shutdown')).catch(this.logger.warn);

    await Promise.all(this.servers.map((module) => module && module.shutdown && module.shutdown()));
    await Promise.all(Object.values(this.services).map((module) => module && module.shutdown && module.shutdown()));

    this._services = {};
    this._servers = [];
    this.api.clear();
    this.static.clear();
    this.logger.info(`${this.applicationName} stopped`);
  }

  /**
   * @param {string} method
   * @param {*} params
   * @param {SessionInterface} session
   * @return {Promise<any>}
   */
  async callApi(method, params, session) {
    this.logger.debug('RPC:', method);
    const apiMethod = this.getApiMethod(method);
    if (!(apiMethod && typeof apiMethod.call === 'function')) throw new MethodNotFoundError();
    const context = this.contextApi(session);
    if (!(await this.accessApi(context, apiMethod.access))) throw new ForbiddenRequestError();
    params = await this.validateApi(context, apiMethod.validate, params);

    return Promise.resolve(apiMethod.call(context, params)).catch(onCatchError());
  }

  /**
   * @param {string} request
   * @param {SessionInterface} session
   * @return {Promise<string>}
   */
  async callRpcApi(request, session) {
    return jsonRpc(request, (method, params) =>
      this.callApi(method, params, session).catch((error) => {
        this.logger.error(error);
        return Promise.reject(error);
      })
    );
  }

  /**
   * @param {Record<string, any>} [extension]
   * @return {Record<string, ServiceInterface>}
   */
  getContext(extension) {
    return Object.assign(
      {},
      this.services,
      {
        config: this.config,
        logger: this.logger
      },
      extension
    );
  }

  /**
   * @param {SessionInterface} [session]
   * @return {Readonly<Record<string, ServiceInterface>>}
   */
  contextApi(session) {
    return Object.freeze(this.getContext({ session }));
  }

  /**
   * @protected
   * @param {ContextInterface} context
   * @param {*} access
   * @return {Promise<boolean>}
   */
  accessApi(context, access = false) {
    if (typeof this.methodAccess === 'function') {
      return this.methodAccess(context, access);
    }

    return typeof access === 'function'
      ? access(context)
      : Promise.resolve(context.session.authorized || Boolean(access));
  }

  /**
   * @protected
   * @param {ContextInterface} context
   * @param {*} validate
   * @param {*} params
   * @return {Promise<*>}
   */
  validateApi(context, validate, params) {
    if (typeof this.methodValidate === 'function') {
      return this.methodValidate(context, validate, params);
    }

    return typeof validate === 'function' ? validate(params, context) : Promise.resolve(params);
  }

  /**
   * @protected
   * @param {string} dir
   * @param {function(filePath: string)} loader
   * @return {Promise<void>}
   */
  async loadDir(dir, loader) {
    const files = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const file of files) {
      const filePath = path.join(dir, file.name);
      if (file.isDirectory()) await this.loadDir(filePath, loader);
      else await loader(filePath);
    }
  }

  /**
   * @protected
   * @param {string} dir
   * @return {Promise<void>}
   */
  async loadStatic(dir) {
    return this.loadDir(dir, async (filePath) => {
      const name = filePath.substring(dir.length);
      try {
        this.static.set(name, await fs.promises.readFile(filePath));
      } catch (error) {
        if (error.code !== 'ENOENT') {
          this.logger.error(error);
        }
      }
    });
  }

  /**
   * @protected
   * @param {string} relPath
   * @return string
   */
  static apiFunctionName(relPath) {
    const { dir, name } = path.parse(relPath);

    return path.join(dir, name).split(path.sep).join('.').toLowerCase();
  }

  /**
   * @protected
   * @param {string} dir
   * @return {Promise<void>}
   */
  async loadApi(dir) {
    return this.loadDir(dir, async (filePath) => {
      return this.loadEntrypoint(dir, filePath);
    });
  }

  /**
   *
   *
   * @param {string} dir
   * @param {string} filePath
   * @returns {Promise<void>}
   */
  async loadEntrypoint(dir, filePath) {
    if (apiExtension !== path.extname(filePath) || filePath.endsWith('.test.js')) return;

    const name = Application.apiFunctionName(path.relative(dir, filePath));
    const method = require(filePath);
    const { default: callDefault, access = false, validate } = method;
    const call =
      typeof method === 'function'
        ? method.bind(null)
        : typeof callDefault === 'function'
        ? callDefault.bind(null)
        : undefined;

    this.api.set(name, { name, call, access, validate });
  }
}

module.exports = Application;
