# rhmap-raygun-nodejs

A wrapper around raygun for use in rhmap node.js applications. Ensures that
the following application metadata is included in sent payloads:

* App ID (FH_INSTANCE)
* Environment (FH_ENV)
* Project ID (FH_WIDGET)


## Local Development
During local development the above variables will default to the values:

* local-instance
* local-project
* local-env


## Install

Add the following to your package.json:

```
"rhmap-raygun-nodejs": "git+https://github.com/TkeITMobility/rhmap-raygun-nodejs.git#VERSION"
```

## Usage

Simply require, pass an API Key and use.

```js
const raygun = require('rhmap-raygun-nodejs')({
  // or you can set an environment variable RAYGUN_API_KEY as a fallback
  apiKey: 'YOUR_RAYGUN_API_KEY'
});

raygun.send(new Error('something unexpected happened!'), {
  extra: 'data'
})
  .then((res) => console.log('raygun response', res));
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
