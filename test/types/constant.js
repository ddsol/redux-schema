import schemaStore, { type, constant } from '../../src';
import { createStore } from 'redux';
import { expect, should } from 'chai';
import { baseTypeProperties, checkProperties } from './utils';

should();

describe('Constant', () => {
  let schema
    , store
    , actions
  ;

  beforeEach(() => {
    store = schemaStore(type(constant('Test')), { debug: true }, createStore);
    schema = store.schema;
    actions = [];
    let origDispatch = store.dispatch;
    store.dispatch = function(action) {
      actions.push(action);
      return origDispatch(action);
    };
  });

  context('type', () => {
    checkProperties(() => schema, Object.assign({}, baseTypeProperties, {
      name: 'constant(Test)',
      kind: 'string',
      storageKinds: ['string']
    }));
  });

  context('instance', () => {
    it('should have the correct default value', () => {
      store.instance.should.equal('Test');
    });

    it('should allow correct state assignment', () => {
      store.state = (store.state);
    });

    it('should disallow incorrect state assignment', () => {
      expect(() => store.state = 'wrong').to.throw(TypeError);
    });

    it('should allow assignment of same constant value', () => {
      store.instance = 'Test';
      store.state.should.equal('Test');
    });

    it('should reject different constant assignment', () => {
      expect(() => store.instance = 'wrong').to.throw(TypeError);
    });
  });
});
