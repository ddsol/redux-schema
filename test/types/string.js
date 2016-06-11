import { type, Store } from '../../src'; //, model, optional, Nil, bare, reference, collections
import { createStore } from 'redux';
import { expect, should } from 'chai';
import { baseTypeProperties, checkProperties } from './utils';

should();

describe('String', () => {
  let schema
    , store
    , actions
    ;

  beforeEach(() => {
    store = new Store({ schema: type(String), debug: true });
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
      name: 'string',
      kind: 'string',
      storageKinds: ['string']
    }));
  });

  context('instance', () => {
    it('should be \'\' by default ', () => {
      store.instance.should.equal('');
    });

    it('should allow correct state assignment', () => {
      store.state = (store.state);
    });

    it('should disallow incorrect state assignment', () => {
      expect(() => store.state = 0).to.throw(TypeError);
    });

    it('should allow assignment of a string', () => {
      store.instance = 'Foo the Bar';
      store.state.should.equal('Foo the Bar');
    });

    it('should reject non-string assignment', () => {
      expect(()=>store.instance = 12).to.throw(TypeError);
    });
  });
});
