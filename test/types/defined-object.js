import { type, Store } from '../../src';
import { createStore } from 'redux';
import { expect, should } from 'chai';
import { baseTypeProperties, checkProperties } from './utils';

should();

describe('Object (defined)', () => {
  let schema
    , store
    , actions
    ;

  beforeEach(() => {
    store = new Store({ schema: type({ v: Number }), debug: true });
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
      name: 'object',
      kind: 'object',
      storageKinds: ['object']
    }));
  });

  context('instance', () => {
    it('should allow empty object assignment', () => {
      store.instance = { v: 1 };
      store.state.should.deep.equal({ v: 1 });
    });

    it('should allow correct state assignment', () => {
      store.state = (store.state);
    });

    it('should disallow incorrect state assignment', () => {
      expect(() => store.state = 0).to.throw(TypeError);
    });

    it('should allow single property object assignment', () => {
      store.instance = { v: 1 };
      store.state.should.deep.equal({ v: 1 });
    });
  });

  context('properties', () => {
    it('should allow setting a defined property directly', () => {
      store.instance.v = 5;
      store.instance.v.should.equal(5);
    });

    context('#get', () => {
      it('should not mutate the object', () => {
        let pre = store.state;
        store.instance.get('v');
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should get properties from the object', () => {
        store.state = { v: 7 };
        store.instance.get('v').should.equal(7);
      });

      it('should return undefined for properties that don\'t exist', () => {
        store.state = { v: 1 };
        expect(store.instance.get('d')).to.be.undefined;
        expect(store.instance.get(0)).to.be.undefined;
        expect(store.instance.get()).to.be.undefined;
        expect(store.instance.get('missing')).to.be.undefined;
      });
    });

    context('#set', () => {
      it('should mutate the object', () => {
        let pre = store.state;
        store.instance.set('v', 3);
        actions.should.have.length(1);
        store.state.should.not.equal(pre);
      });

      it('should set properties in the object', () => {
        store.state = { v: 7 };
        store.instance.set('v', 17);
        store.state.should.deep.equal({ v: 17 });
      });

      it('should fail to extend the object when setting an undefined property', () => {
        store.state = { v: 5 };
        expect(() => store.instance.set('x', 8)).to.throw(TypeError);
      });
    });
  });
});
