/**
 * _toJSON
 * @private
 * @param {Error} error
 * @return {*&{error: string, message: string}}
 * @private
 */
function _toJSON(error) {
  // eslint-disable-next-line no-unused-vars
  const { stack, name, message, ...rest } = error;

  return {
    error: name,
    message,
    ...Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== null && v !== undefined))
  };
}

/**
 * @class ApplicationError
 * @property {*} data
 */
class ApplicationError extends Error {
  /**
   * constructor
   * @param {string} message
   * @param {*} [data]
   */
  constructor(message, data) {
    super(message);
    this.data = data;
    this.name = this.constructor.name;
  }

  toJSON() {
    return _toJSON(this);
  }
}

/**
 * @class InvalidParamsError
 */
class InvalidParamsError extends ApplicationError {
  /**
   * constructor
   * @param {string} [message]
   * @param {*} [data]
   */
  constructor(message, data) {
    super(message || 'Invalid method arguments.', data);
  }
}

/**
 * @class MethodNotFoundError
 */
class MethodNotFoundError extends ApplicationError {
  /**
   * constructor
   * @param {string} [message]
   */
  constructor(message) {
    super(message || 'The method does not exist.');
  }
}

/**
 * @class ForbiddenRequestError
 */
class ForbiddenRequestError extends ApplicationError {
  /**
   * constructor
   * @param {string} [message]
   */
  constructor(message) {
    super(message || 'Forbidden request');
  }
}

/**
 * @class UnAuthorizedRequestError
 */
class UnAuthorizedRequestError extends ApplicationError {
  /**
   * constructor
   * @param {string} [message]
   */
  constructor(message) {
    super(message || 'Unauthorized request');
  }
}

/**
 * @class ServerError
 * @property {number|string} code
 */
class ServerError extends ApplicationError {
  /**
   * constructor
   * @param {string} message
   * @param {number|string} code
   * @param {string} [data]
   */
  constructor(message, code, data) {
    super(message || 'Server Error', data instanceof Error ? errorToJSON(data) : data);
    this.code = code;
  }
}

/**
 * errorToJSON
 * @param {Error | *} error
 * @return {*}
 */
function errorToJSON(error) {
  if (error instanceof ApplicationError) return error.toJSON();
  return _toJSON(error instanceof Error ? error : new Error(String(error)));
}

/**
 * rejectValidationError
 * @param {Error || string} error
 * @param {*} [data]
 * @return {Promise<never>}
 */
function rejectApplicationError(error, data) {
  const message = error instanceof Error ? error.message : String(error);
  return Promise.reject(new ApplicationError(message, (error && error.data) || data));
}

/**
 * rejectValidationError
 * @param {Error & { details: any, errors: any, data: any }}error
 * @return {Promise<never>}
 */
function rejectValidationError(error) {
  const data = error.details || error.errors || error.data;
  return Promise.reject(new InvalidParamsError(error.message, data));
}

/**
 * rejectServerError
 * @param {Error & { code: any }} error
 * @return {Promise<never>}
 */
function rejectServerError(error) {
  const { code } = error;
  return Promise.reject(new ServerError(undefined, code && Number(code), errorToJSON(error)));
}

/**
 * onCatchError
 * @param {string[]} validationErrors
 * @return {function(Error): (Promise<never>)}
 */
function onCatchError(validationErrors = ['ValidationError']) {
  return (reason) => {
    if (reason instanceof ApplicationError) return Promise.reject(reason);

    if (reason && validationErrors.includes(reason.name)) {
      return rejectValidationError(reason);
    }

    return rejectServerError(reason);
  };
}

module.exports = {
  ApplicationError,
  InvalidParamsError,
  MethodNotFoundError,
  ForbiddenRequestError,
  UnAuthorizedRequestError,
  ServerError,
  errorToJSON,
  rejectValidationError,
  rejectServerError,
  rejectApplicationError,
  onCatchError
};
