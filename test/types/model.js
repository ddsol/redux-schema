import { Store, model, ObjectId, collection } from '../../src';
import { createStore } from 'redux';
import { expect, should } from 'chai';
import { baseTypeProperties, checkProperties } from './utils';

should();

describe('model', () => {
  context('type', () => {
    let schema
      , store
      ;

    store = new Store({ schema: model('Model', { p:Number }), debug: true });
    store.store = createStore(store.reducer);
    schema = store.schema;

    checkProperties(() => schema, Object.assign({}, baseTypeProperties, {
      name: 'Model',
      kind: 'object',
      storageKinds: ['object']
    }));

    context('Should throw on attempts to create a model from a type that isn\'t an object', () => {
      it('with undefined', () => {
        expect(() => {
          new Store({ schema: model('Model', undefined), debug: true }); //eslint-disable-line no-new
        }).to.throw();
      });

      it('with null', () => {
        expect(() => {
          new Store({ schema: model('Model', null), debug: true }); //eslint-disable-line no-new
        }).to.throw();
      });

      it('with Boolean', () => {
        expect(() => {
          new Store({ schema: model('Model', Boolean), debug: true }); //eslint-disable-line no-new
        }).to.throw();
      });

      it('with String', () => {
        expect(() => {
          new Store({ schema: model('Model', String), debug: true }); //eslint-disable-line no-new
        }).to.throw();
      });
    });

    it('should create an id property if none passed', () => {
      let store = new Store({ schema: model('Model', {}), debug: true });
      store.schema.properties.should.have.property('id');
      store.schema.properties.id.name.should.equal('objectid');
    });

    it('should allow creation of a differently named id property', () => {
      let store = new Store({ schema: model('Model', { ident: ObjectId }), debug: true });
      store.schema.properties.should.not.have.property('id');
      store.schema.properties.should.have.property('ident');
      store.schema.properties.ident.name.should.equal('objectid');
    });

    it('should throw when the id property is set to a different type thasn ObjectId', () => {
      expect(() => {
        new Store({ schema: model('Model', { id: String }), debug: true }); //eslint-disable-line no-new
      }).to.throw;
    });
  });

  context('instance', () => {
    it('should throw on attempt to create new instance without a collection', () => {
      expect(() => {
        let store = new Store({ schema: model('Model', {}), debug: true })
          , Model = store.schema
          ;

        store.store = createStore(store.reducer);
        new Model(); //eslint-disable-line no-new
      }).to.throw();
    });

    it('should create new instance when in a collection', () => {
      let store = new Store({ schema: collection(model('Model', {})), debug: true })
        , Model = store.instance.model
        , instance
        ;

      store.store = createStore(store.reducer);

      instance = new Model();
      instance.id.should.be.ok;

      store.instance.get(instance.id).should.equal(instance);
    });

    it('should cerate an instabnce when called without new', () => {
      let store = new Store({ schema: collection(model('Model', {})), debug: true })
        , Model = store.instance.model
        , instance
        ;

      store.store = createStore(store.reducer);

      instance = Model();
      instance.id.should.be.ok;

      store.instance.get(instance.id).should.equal(instance);
    });
  });
});
