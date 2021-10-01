/**
 * @class AbstractSession
 * @implements SessionInterface
 * @abstract
 */
class AbstractSession {
  store = new Map();

  /**
   * @override
   * @abstract
   * @param {*} value
   * @return {[string, unknown][]}
   */
  // eslint-disable-next-line no-unused-vars
  toEntries(value) {}

  /**
   * @override
   * @abstract
   * @return {*}
   */
  valueOf() {}

  /**
   * @override
   * @abstract
   * @return boolean
   */
  get authorized() {
    return false;
  }

  /**
   * @param {*} value
   */
  authorize(value) {
    this.destroy();
    this.toEntries(value).forEach((args) => this.store.set(...args));
  }

  destroy() {
    this.store.clear();
  }

  /**
   * @param {string} key
   * @param {* | undefined} [defaultValue]
   * @return {* | undefined}
   */
  get(key, defaultValue) {
    return this.store.get(key) || defaultValue;
  }

  /**
   * @param {string} key
   * @param {*} value
   * @return {this}
   */
  set(key, value) {
    if (value === undefined || value === null) this.store.delete(key);
    else this.store.set(key, value);
    return this;
  }
}

module.exports = AbstractSession;
