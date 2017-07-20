'use strict';

const env = require('env-var');
const raygun = require('raygun');
const log = require('tke-logger').getLogger(__filename);

// If FH_ENV is one of these values, then RAYGUN_API_KEY must be present
const REQUIRED_ENVS = [
  'tke-dev',
  'tke-test',
  'tke-preprod',
  'tke-prod'
];

/**
 * Creates a raygun instance.
 * @param  {Object} config
 * @return {Object}
 */
module.exports = function getRaygunInstance(config) {

  config = config || {};

  const apiKey = config.apiKey || env('RAYGUN_API_KEY').asString();

  if (apiKey) {
    return createRaygunClient(apiKey);
  }

  if (envRequiresRaygun()) {
    throw new Error('RAYGUN_API_KEY must be set for this environment');
  }

  log.warn('Raygun not configured because the RAYGUN_API_KEY env var was not found. Not sending errors to Raygun');
  return createDummyClient();
};

function envRequiresRaygun() {
  // If FH_ENV is set, and it's one of our deployed environments, then we
  //  need a Raygun key.
  const curEnv = env('FH_ENV').asString();
  return curEnv && REQUIRED_ENVS.find((e) => e === curEnv);
}

function createDummyClient() {
  return {
    send: () => Promise.resolve()
  };
}

function createRaygunClient(apiKey) {
  const client = new raygun.Client().init({
    apiKey: apiKey
  });

  // On RHMAP these variables are always defined. Locally we use stubs.
  const INSTANCE = env('FH_INSTANCE', 'local-instance').asString();
  const WIDGET = env('FH_WIDGET', 'local-project').asString();
  const ENV = env('FH_ENV').asString();
  const APP_NAME = env('FH_TITLE').asString();

  const tags = [];
  if (APP_NAME) {
    tags.push(APP_NAME);
  }
  if (ENV) {
    tags.push(ENV);
  }
  client.setTags(tags);

  return {
    /**
     * Send data to raygun using their documented send function, but include
     * the app id and environment
     * @param  {Error}    err
     * @param  {Object}   [extraData]
     * @return {Promise}
     */
    send: (err, extraData) => {
      return new Promise((resolve, reject) => {
        const data = Object.assign({}, extraData || {}, {
          appId: INSTANCE,
          projectId: WIDGET
        });

        client.send(err, data, (err, res) => {
          if (err) {
            reject(err);
          } else {
            resolve(res);
          }
        });
      });
    }
  };
}
