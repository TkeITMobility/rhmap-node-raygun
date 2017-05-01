'use strict';

const env = require('env-var');
const assert = require('assert');
const raygun = require('raygun');


/**
 * Creates a raygun instance.
 * @param  {Object} config
 * @return {Object}
 */
module.exports = function getRaygunInstance (config) {

  const apiKey = config.apiKey || env('RAYGUN_API_KEY').asString();

  assert(
    typeof apiKey === 'string' && apiKey !== '',
    'RAYGUN_API_KEY env var or config.apiKey must be a non empty string'
  );

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
};
