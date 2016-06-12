import { Store, model, collection } from '../../src';
import { createStore } from 'redux';
import { expect, should } from 'chai';
import { baseTypeProperties, checkProperties } from './utils';

should();

describe('collection', () => {

  let schema
    , store
    , instance
    ;

  beforeEach(() => {
    let type = model('Model', { p:Number });
    store = new Store({ schema: collection(type), debug: true });
    store.store = createStore(store.reducer);
    schema = store.schema;
    instance = store.instance;
  });

  context('type', () => {
    checkProperties(() => schema, Object.assign({}, baseTypeProperties, {
      name: 'collection(Model)',
      kind: 'object',
      storageKinds: ['object']
    }));
  });

  context('instance', () => {
    it('should accept anything that is a model instance', () => {
      instance.set('someid', { id: 'someid', p:1 });
    });

    it('#model should return the child model', () => {
      var model = instance.model;
      model.should.be.an.instanceof(Function);
      model.name.should.equal('Model');
      model.kind.should.equal('object');
    });

    it('should reject anything that isn\'t a model instance', () => {
      expect(() => {
        instance.set('someid', {});
      }).to.throw();
    });

    it('.all should return all children', () => {
      new instance.model(); //eslint-disable-line no-new, new-cap
      new instance.model(); //eslint-disable-line no-new, new-cap
      let all = instance.all;
      all.should.be.an.instanceof(Array);
      all.should.have.length(2);
      all[0].p.should.equal(0);
    });

    it('#create should create model instances', () => {
      instance.create();
      instance.create();
      instance.create();
      let all = instance.all;
      all.should.be.an.instanceof(Array);
      all.should.have.length(3);
      all[0].p.should.equal(0);
    });

    context('#remove', () => {

      it('should delete model instances by id', () => {
        let all
          , second
          ;
        new instance.model(); //eslint-disable-line no-new, new-cap
        second = new instance.model(); //eslint-disable-line no-new, new-cap
        new instance.model(); //eslint-disable-line no-new, new-cap

        instance.remove(second.id);
        all = instance.all;

        all.should.be.an.instanceof(Array);
        all.should.have.length(2);
      });

      it('should delete model instances by reference', () => {
        let all
          , second
          ;
        new instance.model(); //eslint-disable-line no-new, new-cap
        second = new instance.model(); //eslint-disable-line no-new, new-cap
        new instance.model(); //eslint-disable-line no-new, new-cap

        instance.remove(second);
        all = instance.all;

        all.should.be.an.instanceof(Array);
        all.should.have.length(2);
      });

      it('should throw if object not found', () => {
        expect(() => {
          new instance.model(); //eslint-disable-line no-new, new-cap
          new instance.model(); //eslint-disable-line no-new, new-cap

          instance.remove('notpresent');
        }).to.throw();
      });
    });
  });
});
