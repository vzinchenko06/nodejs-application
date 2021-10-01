const { AbstractSession } = require('../../core/application');

/**
 * @typedef {Object} ClientSessionData
 * @property {string} token
 * @property {*&{}} user
 */

/**
 * @class ClientSession
 */
class ClientSession extends AbstractSession {
  /**
   * @constructor
   * @param {ClientSessionData} [value]
   */
  constructor(value) {
    super();
    if (typeof value === 'object') this.authorize(value);
  }

  valueOf() {
    return this.store.size ? Object.fromEntries(this.store) : undefined;
  }

  /**
   * @return {boolean}
   */
  get authorized() {
    return this.store.has('token') && !this.expired;
  }

  /**
   * @return {boolean}
   */
  get expired() {
    // const exp = Number(this.get('exp'), 0);
    // const now = Math.floor(Date.now() / 1000);
    // return now > exp;
    return false;
  }

  /**
   * @return {string}
   */
  get token() {
    return this.get('token');
  }

  /**
   * @return {string}
   */
  get id() {
    return this.get('username');
  }

  /**
   * @param {ClientSessionData} value
   * @return {[string, *][]}
   */
  toEntries(value) {
    return value?.token ? Object.entries(value) : [];
  }
}

module.exports = ClientSession;
