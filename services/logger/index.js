const { ConsoleLogger } = require('../../core/application');

/**
 * @class ApplicationLogger
 */
class ApplicationLogger extends ConsoleLogger {
  /**
   * @param {*[]} args
   */
  fatal(...args) {
    this.error(...args);
  }

  deprecate(...args) {
    this.debug(...args);
  }

  /**
   * @param {fastify.Bindings} bindings
   * @return {*}
   */
  child(bindings) {
    return new ApplicationLogger(Object.assign(bindings, this.config), this.id);
  }
}

/**
 * initApplicationLogger
 * @param {ConsoleLoggerConfig} config
 * @param {string | number} id
 * @return {Promise<LoggerInterface>}
 */
async function initApplicationLogger(config, id) {
  return new ApplicationLogger(config, id);
}

module.exports = initApplicationLogger;
module.exports.ApplicationLogger = ApplicationLogger;
