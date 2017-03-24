'use strict';

const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;
const proxyquire = require('proxyquire').noCallThru();

chai.use(require('chai-truthy'));

require('sinon-as-promised');

describe('rhmap-raygun-nodejs', () => {
  let mod, stubs, raygunInit, raygunSend, envStub;

  const RAYGUN = 'raygun';
  const ENV = 'env-var';

  beforeEach(() => {
    envStub = sinon.stub();

    envStub.withArgs('RAYGUN_API_KEY').returns({
      asString: sinon.stub().returns('raygunkey')
    });
    envStub.withArgs('FH_INSTANCE').returns({
      asString: sinon.stub().returns('instance')
    });
    envStub.withArgs('FH_WIDGET').returns({
      asString: sinon.stub().returns('widget')
    });
    envStub.withArgs('FH_ENV').returns({
      asString: sinon.stub().returns('env')
    });;

    stubs = {
      [RAYGUN]: {
        Client: function () {
          raygunSend = this.send = sinon.stub();
          raygunInit = this.init = sinon.stub().returns(this);

          return this;
        }
      },
      [ENV]: envStub
    };

    mod = proxyquire(__filename.replace('.test', ''), stubs);
  });

  it('should throw an assertion error due to missing apiKey', () => {
    // We want the env var to seem missing
    envStub.withArgs('RAYGUN_API_KEY').returns({
      asString: sinon.stub().returns(undefined)
    });

    expect(() => {
      mod({});
    }).to.throw('AssertionError');
  });

  it('should prefer RAYGUN_API_KEY env var', () => {
    mod({
      apiKey: '0987654321'
    });

    expect(raygunInit.calledWith({
      apiKey: 'raygunkey'
    })).to.be.truthy();
  });

  it('should use the supplied apiKey if env var is not set', () => {
    envStub.withArgs('RAYGUN_API_KEY').returns({
      asString: sinon.stub().returns(undefined)
    });

    const key = '0987654321';

    mod({
      apiKey: key
    });

    expect(raygunInit.calledWith({
      apiKey: key
    })).to.be.truthy();
  });

  describe('#send', () => {
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
          expect(raygunSend.calledWith(err, {
            appId: 'instance',
            env: 'env',
            projectId: 'widget',
            username: 'test'
          })).to.be.truthy();
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
          expect(raygunSend.calledWith(err, {
            appId: 'instance',
            env: 'env',
            projectId: 'widget'
          })).to.be.truthy();
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
