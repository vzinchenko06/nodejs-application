const environment = process.env.NODE_ENV || 'production';
const { description, name, version } = require('../package.json');

/**
 * @return {ConfigInterface & *}
 */
 async function importConfig() {
  return Object.freeze({
    about: { description, name, version },
    environment,
    logger: {
      debug: environment === 'development',
      log: environment === 'development',
      info: true,
      warn: true,
      error: true
    },
    domain: process.env.PORT  | 'htp://localhost:8000',
    server: {
      host: '0.0.0.0',
      port: process.env.PORT || 8000
    }
  });
}

module.exports = importConfig;