const console = require('console');

/**
 * @typedef {Object} ConsoleLoggerConfig
 * @property {boolean} debug
 * @property {boolean} info
 * @property {boolean} warn
 * @property {boolean} error
 */

/**
 * @class ConsoleLogger
 * @implements LoggerInterface
 */
class ConsoleLogger extends console.Console {
  /**
   * constructor
   * @param {ConsoleLoggerConfig} config
   * @param {string | number} id
   */
  constructor(config, id) {
    super({ stdout: process.stdout, stderr: process.stderr });
    this.config = config;
    this.id = id;
    const { debug = true, info = true, warn = true, error = true } = config || {};
    const bindArgs = [];
    if (id) {
      bindArgs.push(`[#${id}]`);
    }
    this.debug = debug ? super.debug.bind(this, ...bindArgs) : () => undefined;
    this.log = debug ? super.log.bind(this, ...bindArgs) : () => undefined;
    this.info = info ? super.info.bind(this, ...bindArgs) : () => undefined;
    this.warn = warn ? super.warn.bind(this, ...bindArgs) : () => undefined;
    this.error = error ? super.error.bind(this, ...bindArgs) : () => undefined;
  }
}

/**
 * initConsoleLogger
 * @param {ConsoleLoggerConfig} config
 * @param {string | number} id
 * @return {LoggerInterface}
 */
function initConsoleLogger(config, id) {
  return new ConsoleLogger(config, id);
}

module.exports = initConsoleLogger;
module.exports.ConsoleLogger = ConsoleLogger;
