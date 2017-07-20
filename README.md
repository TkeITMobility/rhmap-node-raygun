# rhmap-raygun-nodejs

A wrapper around raygun for use in rhmap node.js applications. Ensures that
the following application metadata is included in sent payloads:

* App Title (FH_TITLE) (as a Raygun tag)
* Environment (FH_ENV) (as a Raygun tag)
* App ID (FH_INSTANCE) (as metadata on each error)
* Project ID (FH_WIDGET) (as metadata on each error)

## Requirements for deployment
Make sure that `RAYGUN_API_KEY` environment variable is set in the app being deployed.
(Optionally, you may provide your own apiKey when instantiating the Raygun client. See below.)

An api key MUST be configured if `FH_ENV` is set to one of `[tke-dev, tke-test, tke-pre-prod, tke-prod]`

## Local Development
If no Raygun api key is configured, and `FH_ENV` is not one of the above environments, then Raygun is not 
configured, and no errors will be sent to it.

This is to allow for easier local development (where you usually don't care about errors).

## Install

Add the following to your package.json:

```
"rhmap-raygun-nodejs": "TkeITMobility/rhmap-raygun-nodejs.git#VERSION"
```

## Usage

Simply require, optionally pass an API Key, and use.

```js
// Passing in no config will result in it using the env var RAYGUN_API_KEY by default.
// This is the recommended way of configuring Raygun.
const raygun = require('rhmap-raygun-nodejs')();

// OR you can pass in an apiKey manually
const raygun = require('rhmap-raygun-nodejs')({
  apiKey: 'YOUR_RAYGUN_API_KEY'
});

raygun.send(new Error('something unexpected happened!'), {
  extra: 'data'
})
  .then(() => console.log('raygun error sent'));
  .catch((err) => console.log('raygun error', err));
```

It would also be worth adding listeners for the events described [here](http://bluebirdjs.com/docs/api/error-management-configuration.html#global-rejection-events).

Here's a sample using node.js 4.4.3 and Bluebird:

```js
Promise.onPossiblyUnhandledRejection(function (err, promise) {
  raygun.send(err, {
    msg: 'this was an unhandled rejection'
  });
});
```
