const JSON_RPC_VERSION = '2.0';

/**
 * @typedef {Object} JsonRpcRequest
 * @property {'2.0'} jsonrpc
 * @property {string} method
 * @property {*} params
 * @property {string | null} [id]
 */

/**
 * @typedef {Object} JsonRpcResultResponse
 * @property {'2.0'} jsonrpc
 * @property {*} result
 * @property {string | null} [id]
 */

/**
 * @typedef {Object} JsonRpcErrorResponse
 * @property {'2.0'} jsonrpc
 * @property {JsonRpcErrorInterface} error
 * @property {string | null} [id]
 */

/**
 * @typedef {Object} JsonRpcErrorInterface
 * @property {number | string} code
 * @property {string} message
 * @property {*} [data]
 */

/**
 * @typedef {JsonRpcResultResponse | JsonRpcErrorResponse} JsonRpcResponse
 * @typedef {function(method: string, params: any): Promise<*>} RpcApiCallerFunction
 */

/**
 * Format Error
 * @param {number | string} code
 * @param {string} message
 * @param {*} [data]
 * @return {JsonRpcErrorInterface}
 */
function formatError(code, message, data) {
  return { code, message, data };
}

/**
 * -32700 Parse error
 * Invalid JSON was received by the server.
 * An error occurred on the server while parsing the JSON text.
 * @return {JsonRpcErrorInterface}
 */
function rpcParseError() {
  return formatError(-32700, 'Parse error');
}

/**
 * -32600  Invalid Request
 * The JSON sent is not a valid Request object.
 * @param {string} [message]
 * @param {*} [data]
 * @return {JsonRpcErrorInterface}
 */
function rpcInvalidRequest(message, data) {
  return formatError(-32700, message || 'Invalid Request', data);
}

/**
 * -32601  Method not found
 * The method does not exist / is not available.
 * @param {*} [data]
 * @return {JsonRpcErrorInterface}
 */
function rpcMethodNotFound(data) {
  return formatError(-32601, 'Method not found', data);
}

/**
 * -32602  Invalid params
 * Invalid method parameter(s).
 * @param {string} [message]
 * @param {*} [data]
 * @return {JsonRpcErrorInterface}
 */
function rpcInvalidParams(message, data) {
  return formatError(-32602, message || 'Invalid params', data);
}

/**
 * -32603  Internal error
 * Internal JSON-RPC error.
 * @param {*} [data]
 * @return {JsonRpcErrorInterface}
 */
function rpcInternalError(data) {
  return formatError(-32603, 'Internal error', data);
}

/**
 * -32000 to -32099  Server error
 * Reserved for implementation-defined server-errors.
 * @param {number} code
 * @param {string} message
 * @param {*} [data]
 * @return {JsonRpcErrorInterface}
 */
function rpcServerError(code, message = 'Server error', data) {
  return formatError(-(32000 + Math.min(Math.abs(code), 99)), message, data);
}

/**
 * Format response
 * @private
 * @param {JsonRpcErrorInterface | Error | undefined} error
 * @param {*} [result]
 * @param {string | null} [id]
 * @return {JsonRpcResponse}
 */
function formatResponse(error, result, id) {
  const res = { jsonrpc: JSON_RPC_VERSION, id };
  if (error) {
    if (error instanceof Error) {
      const { name, code, message, data } = error;
      return Object.assign(res, { error: formatError(code || name, message, data) });
    }

    return Object.assign(res, { error });
  }

  if (result === undefined) {
    return Object.assign(res, { error: rpcInternalError() });
  }

  return Object.assign(res, { result });
}

/**
 * response
 * @param {JsonRpcRequest} request
 * @param {RpcApiCallerFunction} apiCaller
 * @return {Promise<JsonRpcResponse>}
 */
async function response(request, apiCaller) {
  const { jsonrpc, method, params, id = null } = request;

  if (jsonrpc !== JSON_RPC_VERSION || !method || (params && typeof params !== 'object')) {
    return formatResponse(rpcInvalidRequest());
  }

  return apiCaller(method, params)
    .then((result) => formatResponse(undefined, result, id))
    .catch((reason) => formatResponse(reason, undefined, id));
}

/**
 * jsonRpc
 * @param {string | Object} value
 * @param {RpcApiCallerFunction} apiCaller
 * @return {Promise<string>}
 */
async function jsonRpc(value, apiCaller) {
  let response;
  try {
    response = await parsedJsonRpc(typeof value === 'object' ? value : JSON.parse(String(value)), apiCaller);
  } catch (error) {
    response = formatResponse(rpcParseError());
  }
  return JSON.stringify(response);
}

/**
 * parsedJsonRpc
 * @param {JsonRpcRequest | JsonRpcRequest[]} value
 * @param {RpcApiCallerFunction} apiCaller
 * @return {Promise<JsonRpcResponse | JsonRpcResponse[]>}
 */
async function parsedJsonRpc(value, apiCaller) {
  if (Array.isArray(value)) {
    return Promise.all(value.map((request) => response(request, apiCaller)));
  }

  return response(value, apiCaller);
}

module.exports = {
  JSON_RPC_VERSION,
  formatError,
  formatResponse,
  rpcParseError,
  rpcInvalidRequest,
  rpcMethodNotFound,
  rpcInvalidParams,
  rpcInternalError,
  rpcServerError,
  response,
  jsonRpc,
  parsedJsonRpc
};
