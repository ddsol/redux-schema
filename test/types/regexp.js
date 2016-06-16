import schemaStore, { type } from '../../src';
import { createStore } from 'redux';
import { expect, should } from 'chai';
import { baseTypeProperties, checkProperties } from './utils';

should();

describe('RegExp', () => {
  let schema
    , store
    , actions
    ;

  beforeEach(() => {
    store = schemaStore(type(RegExp), { debug: true }, createStore);
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
      name: 'regexp',
      kind: 'regexp',
      storageKinds: ['object']
    }));
  });

  context('instance', () => {
    it('should be empty regexp by default ', () => {
      let v = store.instance;
      v.should.be.instanceOf(RegExp);
      String(v).should.match(/^[^a-z]*$/i);
    });

    it('should allow correct state assignment', () => {
      store.state = (store.state);
    });

    it('should disallow incorrect state assignment', () => {
      expect(() => store.state = 0).to.throw(TypeError);
    });

    it('should allow assignment and retrieval of a RegExp object', () => {
      let str      = 'testa12 testb34foo'
        , regExpIn = /test[abc](12|34)(:?foo)/ig
        , regExpOut
        ;

      regExpIn.exec(str);

      regExpIn.custom = 'extra info';
      store.instance = regExpIn;
      regExpOut = store.instance;
      regExpIn.source.should.equal(regExpOut.source);
      regExpIn.global.should.equal(regExpOut.global);
      regExpIn.ignoreCase.should.equal(regExpOut.ignoreCase);
      regExpIn.multiline.should.equal(regExpOut.multiline);
      regExpIn.lastIndex.should.equal(regExpOut.lastIndex);
    });

    it('should reject non-RegExp assignment', () => {
      expect(()=>store.instance = {}).to.throw(TypeError);
    });
  });
});
