'use strict';

const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;
const proxyquire = require('proxyquire').noCallThru();
const env = require('env-var');

chai.use(require('chai-truthy'));

require('sinon-as-promised');

describe('rhmap-raygun-nodejs', () => {
  let stubs, raygunInit, raygunSend, raygunSetTags;

  const RAYGUN = 'raygun';
  const ENV = 'env-var';

  function init(envVars) {
    let envStub = env.mock(Object.assign({
      RAYGUN_API_KEY: 'raygunkey',
      FH_INSTANCE: 'instance',
      FH_WIDGET: 'widget',
      FH_ENV: 'env',
      FH_TITLE: 'title'
    }, envVars));

    stubs = {
      [RAYGUN]: {
        Client: function () {
          raygunSend = this.send = sinon.stub();
          raygunInit = this.init = sinon.stub().returns(this);
          raygunSetTags = this.setTags = sinon.stub();

          return this;
        }
      },
      [ENV]: envStub
    };

    return proxyquire(__filename.replace('.test', ''), stubs);
  };

  describe('api key setup', function() {

    it('should throw an assertion error due to missing apiKey', () => {
      // We want the env var to seem missing
      let mod = init({
        RAYGUN_API_KEY: undefined
      });

      expect(() => {
        mod({});
      }).to.throw('AssertionError');
    });

    it('should prefer config.apiKey over env var', () => {
      let mod = init();

      mod({
        apiKey: '0987654321'
      });

      expect(raygunInit.calledWith({
        apiKey: '0987654321'
      })).to.be.truthy();
    });

    it('should use the env var if apiKey is not passed', () => {
      let mod = init({
        RAYGUN_API_KEY: 'raygun'
      });

      mod({});

      expect(raygunInit.calledWith({
        apiKey: 'raygun'
      })).to.be.truthy();
    });

  });

  describe('#send', () => {
    let mod;
    beforeEach(() => {
      mod = init();
    });

    it('should send with expected params injected plus extras', () => {
      const err = new Error('an error occurred in our node code');
      const instance = mod({});

      expect(raygunInit.calledOnce).to.be.truthy();

      raygunSend.yields(null, 'ok');

      return instance.send(err, {
        username: 'test'
      })
        .then((res) => {
          expect(res).to.equal('ok');
          const sendArgs = raygunSend.getCall(0).args;
          expect(sendArgs[0]).to.eql(err);
          expect(sendArgs[1]).to.eql({
            appId: 'instance',
            projectId: 'widget',
            username: 'test'
          });

          const tags = raygunSetTags.getCall(0).args[0];
          expect(tags).to.contain('title');
          expect(tags).to.contain('env');
        });
    });

    it('should not allow extra rhmap data to be overwritten', () => {
      const err = new Error('an error occurred in our node code');
      const instance = mod({});

      expect(raygunInit.calledOnce).to.be.truthy();

      raygunSend.yields(null, 'ok');

      return instance.send(err, {
        appId: 'should not be injected'
      })
        .then((res) => {
          expect(res).to.equal('ok');
          const sendArgs = raygunSend.getCall(0).args;
          expect(sendArgs[0]).to.eql(err);
          expect(sendArgs[1]).to.eql({
            appId: 'instance',
            projectId: 'widget'
          });
        });
    });

    it('should return errors from raygun', () => {
      const err = new Error('an error occurred in our node code');
      const instance = mod({});

      expect(raygunInit.calledOnce).to.be.truthy();

      raygunSend.yields(new Error('raygun error'), 'ok');

      return instance.send(err)
        .catch((e) => {
          expect(e.toString()).contain('raygun error');
        });
    });
  });

});
