'use strict';

const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;
const env = require('env-var');
const proxyquire = require('proxyquire').noCallThru();

chai.use(require('chai-truthy'));

require('sinon-as-promised');

describe('rhmap-raygun-nodejs', () => {
  let raygunInit, raygunSend;

  const RAYGUN = 'raygun';
  const ENV = 'env-var';

  function createModule(mockEnvVars) {
    const mockEnv = env.mock(Object.assign({
      RAYGUN_API_KEY: 'raygunkey',
      FH_INSTANCE: 'instance',
      FH_WIDGET: 'widget',
      FH_ENV: 'tke-test'
    }, mockEnvVars));

    raygunSend = sinon.stub();
    raygunInit = sinon.stub();

    const stubs = {
      [RAYGUN]: {
        Client: function () {
          raygunInit.returns(this);
          this.init = raygunInit;
          this.send = raygunSend;

          return this;
        }
      },
      [ENV]: mockEnv
    };

    return proxyquire(__filename.replace('.test', ''), stubs);
  }

  it('should throw an assertion error due to missing apiKey and default env', () => {
    const mod = createModule({
      RAYGUN_API_KEY: null
    });
    expect(() => {
      mod({});
    }).to.throw('RAYGUN_API_KEY must be set for this environment');
  });

  it('should prefer config.apiKey over env var', () => {
    const mod = createModule();

    mod({
      apiKey: '0987654321'
    });

    expect(raygunInit.callCount).to.eql(1);
    expect(raygunInit.getCall(0).args[0]).to.eql({
      apiKey: '0987654321'
    });
  });

  it('should use the env var if apiKey is not passed', () => {
    const mod = createModule();

    mod();

    expect(raygunInit.callCount).to.eql(1);
    expect(raygunInit.getCall(0).args[0]).to.eql({
      apiKey: 'raygunkey'
    });
  });

  it('Should create a dummy raygun client if no api key is given but it is a local env', () => {
    const mod = createModule({
      RAYGUN_API_KEY: null,
      FH_ENV: 'local-env'
    });

    const instance = mod();
    return instance.send()
      .then(() => {
        expect(raygunInit.callCount).to.eql(0);
        expect(raygunSend.callCount).to.eql(0);
      });
  });

  describe('#send', () => {
    let mod;
    beforeEach(() => {
      mod = createModule();
    });

    it('should send with expected params injected plus extras', () => {
      const err = new Error('an error occurred in our node code');
      const instance = mod();

      expect(raygunInit.calledOnce).to.be.truthy();

      raygunSend.yields(null);

      return instance.send(err, {
        username: 'test'
      })
        .then(() => {
          const args = raygunSend.getCall(0).args;
          expect(args[0]).to.eql(err);
          expect(args[1]).to.eql({
            appId: 'instance',
            env: 'tke-test',
            projectId: 'widget',
            username: 'test'
          });
        });
    });

    it('should not allow extra rhmap data to be overwritten', () => {
      const err = new Error('an error occurred in our node code');
      const instance = mod();

      expect(raygunInit.calledOnce).to.be.truthy();

      raygunSend.yields(null, 'ok');

      return instance.send(err, {
        appId: 'should not be injected'
      })
        .then(() => {
          const args = raygunSend.getCall(0).args;
          expect(args[0]).to.eql(err);
          expect(args[1]).to.eql({
            appId: 'instance',
            env: 'tke-test',
            projectId: 'widget'
          });
        });
    });

    it('should return errors from raygun', () => {
      const err = new Error('an error occurred in our node code');
      const instance = mod();

      expect(raygunInit.calledOnce).to.be.truthy();

      raygunSend.yields(new Error('raygun error'));

      return instance.send(err)
        .catch((e) => {
          expect(e.message).contain('raygun error');
        });
    });
  });

});
