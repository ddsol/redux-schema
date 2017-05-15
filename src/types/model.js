import { namedFunction, guid } from '../utils';
import parseType from '../parse/parse-type';
import ObjectId from './object-id';

const isOwner = {};

export default function model(name, model) {
  let collection = name[0].toLowerCase() + name.substr(1);

  function Model(options = { typeMoniker: [] }) {
    if (typeof model !== 'object') throw new TypeError('model definitions must be objects');

    let rebuild = false
      , ResultModel
      , resultType
      , idKey
      ;

    ResultModel = namedFunction(name, function(...args) {

      if (!(this instanceof ResultModel)) {
        return new ResultModel(...args);
      }

      let owner = args[0]
        , store = options.store
        , id    = guid(24)
        , storePath
        , instancePath
        ;
      if (owner && (owner.isOwner === isOwner) && owner.owner && owner.owner._meta && owner.owner._meta.store) {
        args.shift();
        if (owner.id) {
          id = owner.id;
        }
        owner = owner.owner;
      } else {
        owner = null;
      }
      if (!store || !store.isStore) {
        throw new Error(`Cannot create new ${name}. No store assigned`);
      }
      if (!owner) {
        throw new Error(`Cannot create new ${name}. New instances only allowed for models in a collection.`);
      }

      storePath = owner._meta.storePath.concat(id);
      instancePath = owner._meta.instancePath.concat(id);
      store.unpack(resultType, storePath, instancePath, this, owner);
      this.constructor.apply(this, args);
    }, model.constructor, !options.namedFunctions);

    resultType = parseType({ ...options, self: ResultModel }, model);

    Object.keys(resultType.properties || {}).forEach((name) => {
      if (resultType.properties[name].name === 'objectid') {
        idKey = name;
      }
    });

    if (!resultType.methods.hasOwnProperty('constructor')) {
      model.constructor = function(values) {
        if (values) {
          Object.keys(values).forEach(prop => this.set(prop, values[prop]));
        }
      };
      rebuild = true;
    }

    let origConstructor = model.constructor;

    model.constructor = namedFunction(name, function() {
      let storeInstance
        , path = this._meta.storePath
        ;

      storeInstance = resultType.defaultValue();
      storeInstance[idKey] = path[path.length - 1];
      this._meta.store.put(path, storeInstance);

      if (origConstructor) {
        origConstructor.apply(this, arguments);
      }
    }, origConstructor, !options.namedFunctions);

    if (!idKey) {
      if (resultType.properties.id) {
        throw new TypeError(`The "id" property of "${name}" must be an ObjectId`);
      }
      model.id = ObjectId;
      idKey = 'id';
      rebuild = true;
    }
    if (rebuild) {
      resultType = parseType({ ...options, self: ResultModel }, model);
    }

    const origCoerceData = resultType.coerceData;
    resultType.coerceData = function(value, instancePath) {
      const coerced = origCoerceData(value, instancePath);
      if (!instancePath || !instancePath.length) return coerced;
      coerced.id = instancePath[instancePath.length - 1];
      return coerced;
    };

    Object.assign(ResultModel, resultType, {
      prototype: resultType.prototype,
      collection,
      idKey,
      model,
      isModel: true
    });

    return ResultModel;
  }

  Model.collection = collection;
  Model.modelName = name;
  Model.isType = true;
  Model.isModel = true;
  return Model;
}

export const makeOwner = (owner, id) => ({
  isOwner,
  owner,
  id
});
