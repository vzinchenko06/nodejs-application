/**
 * @class AbstractService
 * @implements ServiceInterface
 * @abstract
 */
class AbstractService {
  /**
   * @override
   * @abstract
   * @readonly
   * @type string
   */
  ID;

  /**
   * @override
   * @abstract
   * @return {Promise<void>}
   */
  shutdown() {}

  /**
   * @readonly
   * @type {BaseApplicationInterface | ApplicationInterface}
   */
  application;
  /**
   * @readonly
   * @type ConfigInterface
   */
  config;

  /**
   * constructor
   * @protected
   * @param {BaseApplicationInterface} application
   * @param [config]
   */
  constructor(application, config) {
    this.application = application;
    this.config = config || application.config;
  }

  /**
   * @return {LoggerInterface}
   */
  get logger() {
    return this.application.logger;
  }
}

module.exports = AbstractService;
