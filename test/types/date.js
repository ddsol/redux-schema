import schemaStore, { type } from '../../src';
import { createStore } from 'redux';
import { expect, should } from 'chai';
import { baseTypeProperties, checkProperties } from './utils';

should();

describe('Date', () => {
  let schema
    , store
    , actions
    ;

  beforeEach(() => {
    store = schemaStore(type(Date), { debug: true }, createStore);
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
      name: 'date',
      kind: 'date',
      storageKinds: ['string']
    }));
  });

  context('instance', () => {
    it('should be invalid by default ', () => {
      let v = store.instance;
      v.should.be.instanceOf(Date);
      String(v).should.match(/\binvalid\b/i);
    });

    it('should allow correct state assignment', () => {
      store.state = (store.state);
      store.instance = new Date();
      store.state = (store.state);
    });

    it('should disallow incorrect state assignment', () => {
      expect(() => store.state = 0).to.throw(TypeError);
    });

    it('should allow assignment and retrieval of a date object', () => {
      let dateIn = new Date()
        , dateOut
        ;

      store.instance = dateIn;
      dateOut = store.instance;
      dateIn.getTime().should.equal(dateOut.getTime());
      store.state.should.equal(dateIn.toISOString());
    });

    it('should reject non-Date assignment', () => {
      expect(()=>store.instance = (new Date()).toISOString()).to.throw(TypeError);
    });
  });
});
