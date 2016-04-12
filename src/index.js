import extend from 'extend';
import { isArray, isPlainObject, guid, pathToStr, namedFunction } from './utils';
import { functionIsType, basicTypes } from './basic';
import Store from './store';
import hydrate from './hydrate';

export function union() {
  var types = Array.prototype.slice.call(arguments);
  if (!types.length) throw new TypeError('Union requires subtypes.');

  function Union(typeMoniker) {
    var simple       = true
      , storageKinds = {}
      , kinds        = {}
      , handlersById = {}
      , handlerIds
      , handlers
      ;

    handlers = types.map(type => parseType(typeMoniker, type));

    handlers.map((handler) => {
      handler.storageKinds.forEach((kind) => {
        if (storageKinds[kind]) {
          simple = false;
        } else {
          storageKinds[kind] = true;
        }
      });
      if (!kinds[handler.kind]) {
        kinds[handler.kind] = 0;
      }
      kinds[handler.kind]++;
      handlersById[kinds[handler.kind] + ':' + handler.kind] = handler;
    });

    handlerIds = Object.keys(handlersById);

    function idOfHandler(handler) {
      for (var i = 0; i < handlerIds.length; i++) {
        if (handlersById[handlerIds[i]] === handler) return handlerIds[i];
      }
    }

    var thisType = {
      isType: true,
      name: 'union(' + handlers.map(handler => handler.kind).join(', ') + ')',
      kind: 'union',
      storageKinds: Object.keys(storageKinds),
      validateData: function(value, instancePath) {
        instancePath = instancePath || typeMoniker;
        if (!simple) {
          if (typeof value.type !== 'string') {
            return 'Required type field not found for union "' + instancePath + '"';
          }
          if (!handlersById[value.type]) {
            return 'Unexpected type "' + value.type + '" for union "' + instancePath + '"';
          }
          return handlersById[value.type].validateData(value.data, instancePath);
        }
        return (
          !handlers.some(handler => handler.validateData(value, instancePath))
          && 'No matching data type for union "' + instancePath + '"'
        );
      },
      validateAssign: function(value, instancePath) {
        instancePath = instancePath || typeMoniker;
        var handler
          , message
          , messages = []
          ;

        for (var i = 0; i < handlers.length; i++) {
          message = handlers[i].validateAssign(value);
          if (!message) {
            handler = handlers[i];
            break;
          }
          messages.push(message);
        }
        if (!handler) {
          return 'Incompatible value ' + value + ' for ' + instancePath + '. ' + messages.join(' -or- ') +'.';
        }
      },
      pack: function(value) {
        var handler
          , packed
          , message
          , messages = []
          ;
        for (var i = 0; i < handlers.length; i++) {
          message = handlers[i].validateAssign(value);
          if (!message) {
            handler = handlers[i];
            break;
          }
          messages.push(message);
        }
        if (!handler) {
          throw new TypeError('Incompatible value ' + value + ' for ' + thisType.name + '. ' + messages.join(' -or- ') +'.');
        }
        packed = handler.pack(value);
        if (simple) {
          return packed;
        }
        return {
          type: idOfHandler(handler),
          value: packed
        };
      },
      unpack: function(store, path, instancePath, currentInstance) {
        if (currentInstance) throw new Error('Union types cannot modify a data instance');
        var value = store.get(path);
        if (simple) {
          for (var i = 0; i < handlers.length; i++) {
            if (!handlers[i].validateData(value, instancePath)) {
              return store.unpack(handlers[i], path, instancePath);
            }
          }
          throw new TypeError('No matching data type for union "' + instancePath + '"');
        } else {
          if (!handlersById[value.type]) {
            return 'Unexpected type "' + value.type + '" for union "' + instancePath + '"';
          }
          return store.unpack(handlersById[value.type], path.concat('value'), instancePath);
        }
      },
      defaultValue: function(){
        return (
          simple
            ? handlers[0].defaultValue()
            : {
            type: idOfHandler(handlers[0]),
            value: handlers[0].defaultValue()
          }
        );
      }
    };
    return thisType;
  }

  Union.isType = true;
  return Union;
}

export function optional(baseType) {
  if (parseType([], baseType).storageKinds.indexOf('undefined') !== -1) {
    return baseType;
  }

  function Optional(typeMoniker) {
    var base = parseType(typeMoniker, baseType)
      , out  = parseType(typeMoniker, union(undefined, baseType))
      ;
    out.name = 'optional(' + base.name + ')';
    return out;
  }

  Optional.isType = true;
  return Optional;
}

export function reference(target) {
  function Reference(typeMoniker) {
    return {
      isType: true,
      name: pathToStr(typeMoniker),
      kind: 'reference',
      storageKinds: ['string'],
      validateData: function(value, instancePath) {
        instancePath = instancePath || typeMoniker;
        if (typeof value !== 'string') {
          return 'Reference data for "' + instancePath + '" must be a string';
        }
        if (!value) return 'Reference cannot be empty';
      },
      validateAssign: function(value, instancePath) {
        instancePath = instancePath || typeMoniker;
        if (typeof value !== 'object' || !value._meta || !value._meta.idKey) {
          return 'Reference for "' + instancePath + '" must be an object of type "' + target + '"';
        }
      },
      pack: function(value) {
        return value[value._meta.idKey];
      },
      unpack: function(store, path) {
        var id = store.get(path);
        if (!id || id === '<unknown>') throw new TypeError('Cannot dereference: No "' + target + '" id present');
        var result = store.rootInstance.get(target.toLowerCase()).get(id);
        if (!result) throw new TypeError('Cannot dereference: No "' + target + '" with id "' + id + '" exists');
        return result;
      },
      defaultValue: function() {
        return '<unknown>';
      }
    };
  }

  Reference.isType = true;
  return Reference;
}

export function ObjectId(typeMoniker) {
  var base = parseType(typeMoniker, String);
  base.name = 'objectid';
  return base;
}

ObjectId.isType = true;

export const Any = union(Object, Array, null, undefined, Number, Boolean, String);

export const Nil = union(null, undefined);

function parseObjectType(typeMoniker, type) {
  if (type === Object) return parseObjectType(typeMoniker, {});
  if (typeof type !== 'object') throw new TypeError(typeMoniker + ' type must be an object');

  var propNames = Object.keys(type)
    , thisType
    , props     = {}
    , virtuals  = {}
    , methods   = {}
    , meta      = {}
    , restType
    ;

  if (!propNames.length) {
    return parseType(typeMoniker, Object);
  }

  if (propNames.indexOf('*') !== -1) {
    propNames.splice(propNames.indexOf('*'), 1);
    if (!propNames.length && type['*'] === Any) return parseType(typeMoniker, Object);
    restType = parseType(typeMoniker.concat('*'), type['*']);
  }

  propNames.forEach((prop) => {
    var descriptor = Object.getOwnPropertyDescriptor(type, prop);
    if (descriptor.get
      || descriptor.set
      || (typeof descriptor.value === 'function' && !functionIsType(descriptor.value))
    ) {
      if (descriptor.value) {
        methods[prop] = descriptor.value;
      } else {
        var virtual = {};
        if (descriptor.get) {
          virtual.get = descriptor.get;
        }
        if (descriptor.set) {
          virtual.set = descriptor.set;
        }
        virtuals[prop] = virtual;
      }
    } else {
      props[prop] = parseType(typeMoniker.concat(prop), type[prop]);
      if (props[prop].name === 'objectid' && !meta.idKey) {
        meta.idKey = prop;
      }
    }
  });

  thisType = {
    isType: true,
    name: pathToStr(typeMoniker),
    kind: 'object',
    storageKinds: ['object'],
    validateData: function(value, instancePath) {
      instancePath = instancePath || typeMoniker;
      if (typeof value !== 'object') {
        return 'Type of "' + pathToStr(instancePath) + '" data must be object';
      }
      return (
        propNames.reduce((message, name) => message || props[name].validateData(value[name], instancePath.concat(name)), null)
        || Object.keys(value).reduce((message, name) => {
          if (message) return message;
          if (restType) {
            if (propNames.indexOf(name) !== -1) return null;
            return restType.validateData(value[name], instancePath.concat(name));
          } else {
            if (propNames.indexOf(name) !== -1) return 'Unknown data property "' + pathToStr(instancePath.concat(name)) + '"';
          }
        }, null)
      );
    },
    validateAssign: function(value, instancePath) {
      instancePath = instancePath || typeMoniker;
      if (typeof value !== 'object') {
        return 'Type of "' + pathToStr(instancePath) + '" must be object';
      }
      instancePath = instancePath || typeMoniker;
      return (
        propNames.reduce((message, name) => message || props[name].validateAssign(value[name], instancePath.concat(name)), null)
        || Object.keys(value).reduce((message, name) => {
          if (message) return message;
          if (restType) {
            if (propNames.indexOf(name) !== -1) return null;
            return restType.validateAssign(value[name], instancePath.concat(name));
          } else {
            if (propNames.indexOf(name) === -1) {
              return 'Unknown property "' + pathToStr(instancePath.concat(name)) + '"';
            }
          }
        }, null)
      );
    },
    pack: function(value) {
      var out = {};
      propNames.forEach(name => out[name] = props[name].pack(value[name]));
      if (restType) {
        Object.keys(value).forEach((name) => {
          if (propNames.indexOf(name) === -1) {
            out[name] = restType.pack(value[name]);
          }
        });
      }
      return out;
    },
    unpack: function(store, path, instancePath, currentInstance) {
      return hydrate(store, thisType, typeMoniker, path, instancePath, (name) => {
        var type;
        if (propNames.indexOf(name) !== -1) {
          type = props[name];
        } else {
          if (!restType) throw new TypeError('Unknown property ' + pathToStr(instancePath.concat(name)));
          type = restType;
        }
        return store.unpack(type, path.concat(name), instancePath.concat(name));
      }, (name, value) => {
        if (propNames.indexOf(name) !== -1) {
          type = props[name];
        } else {
          if (!restType) throw new TypeError('Unknown property ' + pathToStr(instancePath.concat(name)));
          type = restType;
        }
        store.put(path.concat(name), type.pack(value));
      }, props, methods, virtuals, meta, currentInstance);
    },
    defaultValue: function() {
      var defaultValue = {};
      Object.keys(props).forEach(name => defaultValue[name] = props[name].defaultValue());
      return defaultValue;
    },
    properties: props,
    restType: restType,
    methods: methods,
    virtuals: virtuals
  };
  return thisType;
}

function anyObject(typeMoniker, arrayType) {

  arrayType = Boolean(arrayType);

  var kind     = arrayType ? 'array' : 'object'
    , thisType
    ;

  function isValidObject(value, forceArray) {
    if (!isPlainObject(value) && !isArray(value)) {
      return false;
    }

    if (typeof forceArray !== 'undefined') {
      if (isArray(value) !== forceArray) return false;
    }

    var keys = Object.keys(value)
      , propVal
      ;
    for (var i = 0; i < keys.length; i++) {
      propVal = value[keys[i]];
      if (typeof propVal === 'object' && propVal !== null && !isValidObject(propVal)) {
        return false;
      }
    }
    return true;
  }

  function clone(obj) {
    if (typeof value !== 'object' && value === null) {
      return obj;
    }
    var out  = isArray(obj) ? [] : {}
      , keys = Object.keys(obj)
      , key
      , value
      ;

    for (var i = 0; i < keys.length; i++) {
      key = keys[i];
      value = obj[key];
      if (typeof value === 'object' && value !== null) {
        value = clone(value);
      }
      out[key] = value;
    }
    return out;
  }

  thisType = {
    isType: true,
    name: pathToStr(typeMoniker),
    kind: kind,
    storageKinds: [kind],
    validateData: function(value, instancePath) {
      instancePath = instancePath || typeMoniker;
      if (!isValidObject(value, arrayType)) {
        return 'Type of "' + pathToStr(instancePath) + '" data must be ' + kind;
      }
    },
    validateAssign: function(value, instancePath) {
      instancePath = instancePath || typeMoniker;
      if (!isValidObject(value, arrayType)) {
        return 'Type of "' + pathToStr(instancePath) + '" data must be ' + kind;
      }
    },
    pack: function(value) {
      if (!isValidObject(value, arrayType)) {
        throw new TypeError(pathToStr(typeMoniker) + ' only accepts simple ' + kind + 's');
      }
      return clone(value);
    },
    unpack: function(store, path, instancePath, currentInstance) {
      //TODO: Add array methods.
      return hydrate(store, thisType, typeMoniker, path, instancePath, (name) => {
        var storeValue = store.get(path)
          , propValue  = storeValue[name]
          , array      = isArray(propValue)
          , pathName   = arrayType ? '[' + name + ']' : name
          , type
          ;

        if (typeof propValue === 'object' && propValue !== null) {
          type = anyObject(typeMoniker.concat(pathName), array);
          return store.unpack(type, path.concat(pathName), instancePath.concat(pathName), currentInstance);
        } else {
          return propValue;
        }
      }, (name, value) => {
        var pathName = arrayType ? '[' + name + ']' : name;
        if (typeof value !== 'object' || value === null || !isValidObject(value)) {
          throw new TypeError(pathToStr(typeMoniker.concat(pathName)) + ' only accepts simple types');
        }
        store.put(path.concat(name), clone(value));
      }, {}, {}, {}, {}, currentInstance);
    },
    defaultValue: function() {
      return arrayType ? [] : {};
    },
    properties: {},
    methods: {},
    virtuals: {}
  };

  return thisType;
}

function basicType(typeMoniker, type) {

  var upName = type.name[0].toUpperCase() + type.name.substr(1);

  return {
    isType: true,
    name: pathToStr(typeMoniker),
    kind: type.name,
    storageKinds: [type.name],
    validateData: function(value, instancePath) {
      instancePath = instancePath || typeMoniker;
      if (!type.is(value)) {
        return 'Type of "' + pathToStr(instancePath) + '" data must be ' + type.name;
      }
    },
    validateAssign: function(value, instancePath) {
      instancePath = instancePath || typeMoniker;
      if (!type.is(value)) {
        return 'Type of "' + pathToStr(instancePath) + '" must be ' + type.name;
      }
    },
    pack: function(value) {
      return value;
    },
    unpack: function(store, path, instancePath, currentInstance) {
      if (currentInstance) throw new Error(upName + ' types cannot modify a data instance');
      return store.get(path);
    },
    defaultValue: function() {
      return type.defaultValue;
    }
  };
}

function parseType(typeMoniker, type) {
  if (typeof type === 'function' && type.isType) return type(typeMoniker);
  if (type && type.isType) return extend({}, type, { name: pathToStr(typeMoniker) });

  if (type === Object) return anyObject(typeMoniker, false);
  if (type === Array) return anyObject(typeMoniker, true);

  if (type === null) return basicType(typeMoniker, basicTypes.Null);
  if (type === undefined) return basicType(typeMoniker, basicTypes.Undefined);

  if (type === Number) return basicType(typeMoniker, basicTypes.Number);
  if (type === Boolean) return basicType(typeMoniker, basicTypes.Boolean);
  if (type === String) return basicType(typeMoniker, basicTypes.String);

  if (typeof type === 'object') {
    if (isArray(type)) {
      //return parseArrayType(typeMoniker, type);
      throw new Error('Arrays are not yet supported');
    } else {
      return parseObjectType(typeMoniker, type);
    }
  }

  //Todo: Errors, Dates, RegExps

  throw new TypeError('Unknown type ' + type);
}

function rootSchema(schemas) {
  var rootType = {};
  schemas.forEach((schema) => {
    rootType[schema.collection] = {
      '*': schema.type,
      create: namedFunction('create' + schema.name, function() {
        var instance = Object.create(schema.prototype)
          , args     = Array.prototype.slice.call(arguments);
        args.unshift(this._store);
        return schema.apply(instance, arguments);
      }, 'function(){\n  return new ' + schema.name + '(...arguments);\n}'),
      enumerate: function() {
        return Object.keys(this._meta.store.get([schema.name.toLowerCase()]));
      }
    };

    rootType[schema.collection].enumerate.noWrap = true;

  });

  return parseType([], rootType);
}

export default function schema(name, schema, options) {
  if (isArray(name) && arguments.length === 1) {
    return rootSchema(name);
  }
  if (typeof schema !== 'object') throw new TypeError('schema definitions must be objects');

  options = extend({}, options || {});

  var resultType = parseObjectType([name], schema)
    , collection = name[0].toLowerCase() + name.substr(1)
    , idKey
    , resultSchema
    ;

  Object.keys(resultType.properties || {}).forEach((name) => {
    if (resultType.properties[name].name === 'objectid') {
      idKey = name;
    }
  });

  if (!idKey) {
    if (resultType.properties.id) {
      throw new TypeError('The "id" property of "' + name + '" must be an ObjectId');
    }
    schema.id = ObjectId;
    idKey = 'id';
    resultType = parseObjectType([name], schema);
  }

  var origConstructor = resultType.methods.constructor;

  resultType.methods.constructor = namedFunction(name, function(){
    var storeInstance
      , path = this._meta.storePath
      ;

    storeInstance = resultType.defaultValue();
    storeInstance[idKey] = path[path.length -1];
    this._meta.store.put(path, storeInstance);

    if (origConstructor) {
      origConstructor.apply(this, arguments);
    }
  }, origConstructor || function(){});

  resultSchema = namedFunction(name, function(store) {
    var args = Array.prototype.slice.call(arguments)
      , path
      ;
    if (!store || !store.isStore) {
      store = options.store;
    } else {
      args.shift();
    }
    if (!store || !store.isStore) {
      throw new Error('Store needed');
    }

    path = [collection, guid(24)];
    store.unpack(resultType, path, path, this);
    this.constructor.apply(this, args);
  }, resultType.constructor);

  function hydrateFromStore(store, id) {
    if (!store || !store.isStore) {
      id = store;
      store = options.store;
    }
    if (!store || !store.isStore) {
      throw new Error('Store needed');
    }

    var path = [collection, id];
    return store.unpack(resultType, path, path);
  }

  extend(resultSchema, {
    type: resultType,
    collection: collection,
    options: options,
    schema: schema,
    hydrate: hydrateFromStore,
    isSchema: true
  });

  return resultSchema;
}

extend(schema, {
  Any: Any,
  Nil: Nil,
  ObjectId: ObjectId,

  union: union,

  optional: optional,
  reference: reference,

  Store: Store
});

