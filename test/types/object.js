import { type, Store } from '../../src'; //, model, optional, Nil, bare, reference, collections
import { createStore } from 'redux';
import { expect, should } from 'chai';
import { baseTypeProperties, checkProperties } from './utils';

should();

describe('Object (plain)', () => {
  let schema
    , store
    , actions
    ;

  beforeEach(() => {
    store = new Store({ schema: type({}), debug: true });
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

    it('should treat {} and Object as equivalent', () => {
      let type1 = new Store({ schema: type({}) }).schema
        , type2 = new Store({ schema: type(Object) }).schema
        , prop1
        , prop2
        ;

      for (let prop in baseTypeProperties) {
        if (prop === 'options') return;
        prop1 = type1[prop];
        prop2 = type2[prop];
        if (typeof prop1 === 'function') prop1 = String(prop1);
        if (typeof prop2 === 'function') prop2 = String(prop2);
        expect(prop1).to.deep.equal(prop2);
      }
    });
  });

  context('instance', () => {
    it('should allow empty object assignment', () => {
      store.instance = {};
      store.state.should.deep.equal({});
    });

    it('should allow correct state assignment', () => {
      store.state = (store.state);
    });

    it('should disallow incorrect state assignment', () => {
      expect(() => store.state = 0).to.throw(TypeError);
    });

    it('should allow single property object assignment', () => {
      store.instance = { p: 1 };
      store.state.should.deep.equal({ p: 1 });
    });

    it('should allow multiple complex item object assignment', () => {
      const test = {
        prop1: {
          prop: {
            prop: 1
          }
        },
        prop2: {
          prop1: 1,
          prop2: [1, 2, 3]
        }
      };
      store.instance = test;
      store.state.should.deep.equal(test);
      store.state.should.not.equal(test);
    });
  });

  context('properties', () => {
    context('#get', () => {
      it('should not mutate the object', () => {
        let pre = store.state;
        store.instance.get(0);
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should get properties from the object', () => {
        store.state = { a: 1, b: 2, c: 3 };
        store.instance.get('b').should.equal(2);
      });

      it('should return undefined for properties that don\'t exist', () => {
        store.state = { a: 1, b: 2, c: 3 };
        expect(store.instance.get('d')).to.be.undefined;
        expect(store.instance.get(0)).to.be.undefined;
        expect(store.instance.get()).to.be.undefined;
        expect(store.instance.get('missing')).to.be.undefined;
      });
    });

    context('#set', () => {
      it('should mutate the object', () => {
        let pre = store.state;
        store.instance.set(0, 3);
        actions.should.have.length(1);
        store.state.should.not.equal(pre);
      });

      it('should set properties in the object', () => {
        store.state = { a: 1, b: 2, c: 3 };
        store.instance.set('c', 8);
        store.state.should.deep.equal({ a: 1, b: 2, c: 8 });
      });

      it('should extend the object when setting an undefined property', () => {
        store.state = { a: 1, b: 2, c: 3 };
        store.instance.set('x', 8);
        store.state.should.deep.equal({ a: 1, b: 2, c: 3, x: 8 });
      });
    });
  });
});
