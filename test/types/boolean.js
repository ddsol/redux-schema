import { type, Store } from '../../src'; //, model, optional, Nil, bare, reference, collections
import { createStore } from 'redux';
import { expect, should } from 'chai';
import { baseTypeProperties, checkProperties } from './utils';

should();

describe('Boolean', () => {
  var schema
    , store
    , actions
    ;

  beforeEach(() => {
    store = new Store({ schema: type(Boolean), debug: true });
    store.store = createStore(store.reducer);
    schema = store.schema;
    actions = [];
    var origDispatch = store.dispatch;
    store.dispatch = function(action) {
      actions.push(action);
      return origDispatch(action);
    };
  });

  context('type', () => {
    checkProperties(() => schema, Object.assign({}, baseTypeProperties, {
      name: 'boolean',
      kind: 'boolean',
      storageKinds: ['boolean']
    }));
  });

  context('instance', () => {
    it('should be false by default ', () => {
      store.instance.should.equal(false);
    });

    it('should allow correct state assignment', () => {
      store.state = (store.state);
    });

    it('should disallow incorrect state assignment', () => {
      expect(() => store.state = 0).to.throw(TypeError);
    });

    it('should allow assignment of a boolean value', () => {
      store.instance = true;
      store.state.should.equal(true);
    });

    it('should reject non-boolean assignment', () => {
      expect(()=>store.instance = 7).to.throw(TypeError);
    });
  });
});
