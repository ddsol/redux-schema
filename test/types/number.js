import { type, Store } from '../../src'; //, model, optional, Nil, bare, reference, collections
import { createStore } from 'redux';
import { expect, should } from 'chai';
import { baseTypeProperties, checkProperties } from './utils';

should();

describe('Number', () => {
  let schema
    , store
    , actions
    ;

  beforeEach(() => {
    store = new Store({ schema: type(Number), debug: true });
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
      name: 'number',
      kind: 'number',
      storageKinds: ['number']
    }));
  });

  context('instance', () => {
    it('should be 0 by default ', () => {
      store.instance.should.equal(0);
    });

    it('should allow correct state assignment', () => {
      store.state = (store.state);
    });

    it('should disallow incorrect state assignment', () => {
      expect(() => store.state = true).to.throw(TypeError);
    });

    it('should allow assignment of a number', () => {
      store.instance = 17;
      store.state.should.equal(17);
    });

    it('should reject non-number assignment', () => {
      expect(()=>store.instance = '12').to.throw(TypeError);
    });
  });
});
