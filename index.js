const path = require('path');
const { worker } = require('cluster');
const { Application } = require('./core/application');
const importConfig = require('./config');
const initApplicationLogger = require('./services/logger');
const initWebServer = require('./services/web-server');

/**
 * MAIN
 */
(async function () {
  const config = await importConfig(path.resolve(__dirname, 'config'));
  const logger = await initApplicationLogger(config.logger, worker?.id);
  const appName = `Application${worker?.id ? ' #' + String(worker?.id) : ''}`;

  const application = new Application(config, logger, appName);

  // application.setAccessMethod();
  // application.setValidateMethod();
  // await application.initServices();

  await application.initServices(initWebServer);

  await application.startApi(path.resolve(__dirname, 'api'));

  return application;
})();
