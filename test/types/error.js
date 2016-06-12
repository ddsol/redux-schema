import { type, Store } from '../../src';
import { createStore } from 'redux';
import { expect, should } from 'chai';
import { baseTypeProperties, checkProperties } from './utils';

should();

describe('Error', () => {
  let schema
    , store
    , actions
    ;

  beforeEach(() => {
    store = new Store({ schema: type(Error), debug: true });
    store.store = createStore(store.reducer);
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
      name: 'error',
      kind: 'error',
      storageKinds: ['object']
    }));
  });

  context('instance', () => {
    it('should be an empty error by default ', () => {
      let v = store.instance;
      v.should.be.instanceOf(Error);
      String(v).should.match(/\bError\b/i);
    });

    it('should allow correct state assignment', () => {
      store.state = (store.state);
    });

    it('should disallow incorrect state assignment', () => {
      expect(() => store.state = 0).to.throw(TypeError);
    });

    it('should allow assignment and retrieval of an Error object', () => {
      let errorIn = new Error('message here')
        , errorOut
        ;

      errorIn.custom = 'extra info';
      store.instance = errorIn;
      errorOut = store.instance;
      errorIn.stack.should.equal(errorOut.stack);
      errorIn.custom.should.equal(errorOut.custom);
    });

    it('should reject non-Error assignment', () => {
      expect(()=>store.instance = {}).to.throw(TypeError);
    });
  });
});
