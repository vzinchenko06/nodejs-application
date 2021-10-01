/**
 * healthCheck Api Method
 * @param {AppContext} context
 * @return {Promise<*&{startTime: string, name: string, description: string, version: string}>}
 */
async function healthCheck(context) {
  return Object.assign(context.config.about);
}

module.exports = healthCheck;

module.exports.access = true;
