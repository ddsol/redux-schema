import schemaStore, { model, ObjectId, collection } from '../../src';
import { createStore } from 'redux';
import { expect, should } from 'chai';
import { baseTypeProperties, checkProperties } from './utils';

should();

describe('model', () => {
  context('type', () => {
    let schema
      , store
      ;

    store = schemaStore(model('Model', { p:Number }),{ debug: true }, createStore);
    schema = store.schema;

    checkProperties(() => schema, Object.assign({}, baseTypeProperties, {
      name: 'Model',
      kind: 'object',
      storageKinds: ['object']
    }));

    context('Should throw on attempts to create a model from a type that isn\'t an object', () => {
      it('with undefined', () => {
        expect(() => {
          schemaStore(model('Model', undefined), { debug: true }, createStore); //eslint-disable-line no-new
        }).to.throw();
      });

      it('with null', () => {
        expect(() => {
          schemaStore(model('Model', null), { debug: true }, createStore); //eslint-disable-line no-new
        }).to.throw();
      });

      it('with Boolean', () => {
        expect(() => {
          schemaStore(model('Model', Boolean), { debug: true }, createStore); //eslint-disable-line no-new
        }).to.throw();
      });

      it('with String', () => {
        expect(() => {
          schemaStore(model('Model', String), { debug: true }, createStore); //eslint-disable-line no-new
        }).to.throw();
      });
    });

    it('should create an id property if none passed', () => {
      let store = schemaStore(model('Model', {}), { debug: true }, createStore);
      store.schema.properties.should.have.property('id');
      store.schema.properties.id.name.should.equal('objectid');
    });

    it('should allow creation of a differently named id property', () => {
      let store = schemaStore(model('Model', { ident: ObjectId }), { debug: true }, createStore);
      store.schema.properties.should.not.have.property('id');
      store.schema.properties.should.have.property('ident');
      store.schema.properties.ident.name.should.equal('objectid');
    });

    it('should throw when the id property is set to a different type thasn ObjectId', () => {
      expect(() => {
        schemaStore(model('Model', { id: String }), { debug: true }, createStore); //eslint-disable-line no-new
      }).to.throw;
    });
  });

  context('instance', () => {
    it('should throw on attempt to create new instance without a collection', () => {
      expect(() => {
        let store = schemaStore(model('Model', {}), { debug: true }, createStore)
          , Model = store.schema
          ;

        new Model(); //eslint-disable-line no-new
      }).to.throw();
    });

    it('should create new instance when in a collection', () => {
      let store = schemaStore(collection(model('Model', {})), { debug: true }, createStore)
        , Model = store.instance.model
        , instance
        ;

      instance = new Model();
      instance.id.should.be.ok;

      store.instance.get(instance.id).should.equal(instance);
    });

    it('should create an instance when called without new', () => {
      let store = schemaStore(collection(model('Model', {})), { debug: true }, createStore)
        , Model = store.instance.model
        , instance
        ;

      instance = Model();
      instance.id.should.be.ok;

      store.instance.get(instance.id).should.equal(instance);
    });

    it('should set properties when passed into the default constructor', () => {
      let store = schemaStore(collection(model('Model', { foo: String, bar: Number, '*': Boolean })), { debug: true }, createStore)
        , Model = store.instance.model
        , instance
        ;

      instance = Model({ foo: 'baz', bar: 42, other: true });
      instance.foo.should.equal('baz');
      instance.bar.should.equal(42);
      instance.get('other').should.equal(true);
    });
  });
});
