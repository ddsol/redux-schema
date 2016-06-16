import schemaStore, { type } from '../../src';
import { createStore } from 'redux';
import { expect, should } from 'chai';
import { baseTypeProperties, checkProperties } from './utils';

should();

describe('Union', () => {
  let schema
    , store
    , actions
    ;

  context('type', () => {
    beforeEach(() => {
      store = schemaStore(type([Number, String]), { debug: true }, createStore);
      schema = store.schema;
      actions = [];
      let origDispatch = store.dispatch;
      store.dispatch = function(action) {
        actions.push(action);
        return origDispatch(action);
      };
    });

    checkProperties(() => schema, Object.assign({}, baseTypeProperties, {
      name: 'union(number, string)',
      kind: 'union',
      storageKinds: ['number', 'string']
    }));
  });

  context('instance', () => {
    context('non-clashing types', () => {
      beforeEach(() => {
        store = schemaStore(type([Number, String]), { debug: true }, createStore);
        schema = store.schema;
        actions = [];
        let origDispatch = store.dispatch;
        store.dispatch = function(action) {
          actions.push(action);
          return origDispatch(action);
        };
      });

      it('should be the first type\'s default by default ', () => {
        store.instance.should.equal(0);
      });

      it('should allow correct state assignment', () => {
        store.state = '';
      });

      it('should disallow incorrect state assignment', () => {
        expect(() => store.state = true).to.throw(TypeError);
      });

      it('should allow assignment of each constituent type', () => {
        store.instance = 8675309;
        store.state.should.equal(8675309);
        store.instance = 'Foo the Bar';
        store.state.should.equal('Foo the Bar');
      });

      it('should reject incorrect type assignment', () => {
        expect(()=>store.instance = true).to.throw(TypeError);
      });
    });

    context('clashing types', () => {
      beforeEach(() => {
        store = schemaStore(type([{ prop: Number }, { prop: String} ]), { debug: true }, createStore);
        schema = store.schema;
        actions = [];
        let origDispatch = store.dispatch;
        store.dispatch = function(action) {
          actions.push(action);
          return origDispatch(action);
        };
      });

      it('should be the first type\'s default by default ', () => {
        store.instance.toObject().should.deep.equal({ prop: 0 });
      });

      it('should allow correct state assignment', () => {
        store.state = {
          type: '2:object',
          value: {
            prop: 'Foo'
          }
        };
      });

      it('should disallow incorrect state assignment', () => {
        expect(() => store.state = 0).to.throw(TypeError);
        expect(() => store.state = { prop:0 }).to.throw(TypeError);
        expect(() => store.state = {
          type: '1:object',
          value: {
            prop: 'Foo'
          }
        }).to.throw(TypeError);
        expect(() => store.state = {
          type: '2:object',
          value: {
            prop: 42
          }
        }).to.throw(TypeError);
      });

      it('should allow assignment of each constituent type', () => {
        store.instance = { prop: 8675309 };
        store.state.should.deep.equal({
          type: '1:object',
          value: {
            prop: 8675309
          }
        });
        store.instance = { prop: 'Foo the Bar' };
        store.state.should.deep.equal({
          type: '2:object',
          value: {
            prop: 'Foo the Bar'
          }
        });
      });

      it('should reject incorrect type assignment', () => {
        expect(()=>store.instance = true).to.throw(TypeError);
      });
    });
  });
});
