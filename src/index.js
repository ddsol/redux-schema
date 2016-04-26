import { isArray, isPlainObject, guid, pathToStr, namedFunction } from './utils';
import { functionIsType, basicTypes } from './basic';
import _Store from './store';
import { hydratePrototype, hydrateInstance } from './hydrate';
import { arrayMethods, arrayVirtuals } from './array';
import serializeError from 'serialize-error';
import SimpExp from 'simpexp';

export const Store = _Store;

function freeze(obj) {
  if (Object.freeze) {
    Object.freeze(obj);
  }
}

function packVerify(type) {
  type.origPack = type.pack;
  type.pack = function(value) {
    var options = type.options
      , packed
      ;
    if (options.validate) {
      var message = type.validateAssign(value);
      if (message) {
        throw new TypeError(message);
      }
    }
    packed = type.origPack(value);
    if (options.freeze) {
      freeze(packed);
    }
    return packed;
  };
}

function finalizeType(type) {
  var options = type.options;
  if (options.validate || options.freeze) {
    packVerify(type);
  }
  return type;
}

export function union() {
  var types = Array.prototype.slice.call(arguments);
  if (!types.length) throw new TypeError('Union requires subtypes.');

  function Union(options) {
    var typeMoniker  = options.typeMoniker
      , simple       = true
      , storageKinds = {}
      , kinds        = {}
      , handlersById = {}
      , self         = { options }
      , handlerIds
      , handlers
      ;

    handlers = types.map(type => parseType({ ...options, parent: options.self || self, self: null }, type));

    //Flatten all unions: union(union(null, undefined), union(Number, String)) => union(null, undefined, Number, String)
    handlers = Array.prototype.concat.apply([], handlers.map(handler => handler.kind === 'union' ? handler.handlers : handler));

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
      options,
      validateData: function(value, instancePath) {
        instancePath = instancePath || typeMoniker;
        if (!simple) {
          if (typeof value.type !== 'string') {
            return 'Required type field not found for union "' + pathToStr(instancePath) + '"';
          }
          if (!handlersById[value.type]) {
            return 'Unexpected type "' + value.type + '" for union "' + pathToStr(instancePath) + '"';
          }
          return handlersById[value.type].validateData(value.data, instancePath);
        }
        return (
          !handlers.some(handler => handler.validateData(value, instancePath))
          && 'No matching data type for union "' + pathToStr(instancePath) + '"'
        );
      },
      validateAssign: function(value, instancePath) {
        instancePath = instancePath || typeMoniker;
        var messages = []
          , handler
          , message
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
          return 'Incompatible value ' + value + ' for ' + pathToStr(instancePath) + '. ' + messages.join(' -or- ') + '.';
        }
      },
      pack: function(value) {
        var messages = []
          , handler
          , packed
          , message
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
          throw new TypeError('Incompatible value ' + value + ' for ' + thisType.name + '. ' + messages.join(' -or- ') + '.');
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
      unpack: function(store, path, instancePath, currentInstance, owner) {
        if (currentInstance) throw new Error('Union types cannot modify a data instance');
        var value = store.get(path);
        if (simple) {
          for (var i = 0; i < handlers.length; i++) {
            if (!handlers[i].validateData(value, instancePath)) {
              return store.unpack(handlers[i], path, instancePath, null, owner);
            }
          }
          throw new TypeError('No matching data type for union "' + pathToStr(instancePath) + '"');
        } else {
          if (!handlersById[value.type]) {
            return 'Unexpected type "' + value.type + '" for union "' + pathToStr(instancePath) + '"';
          }
          return store.unpack(handlersById[value.type], path.concat('value'), instancePath, null, owner);
        }
      },
      defaultValue: function() {
        return (
          simple
            ? handlers[0].defaultValue()
            : {
            type: idOfHandler(handlers[0]),
            value: handlers[0].defaultValue()
          }
        );
      },
      handlers
    };

    return Object.assign(self, finalizeType(thisType));
  }

  Union.isType = true;
  return Union;
}

export function optional(baseType) {
  function Optional(options) {
    var self = { options }
      , base = parseType({ ...options, parent: options.self || self, self: null }, baseType)
      , out  = union(undefined, baseType)(options)
      ;
    if (base.storageKinds.indexOf('undefined') !== -1) {
      return parseType(options, baseType);
    }

    out.name = 'optional(' + base.name + ')';
    return Object.assign(self, out);
  }

  Optional.isType = true;
  return Optional;
}

export function validate(baseType, validation) {
  function Validate(options) {
    var self          = { options }
      , type          = { ...parseType({ ...options, self: options.self }, baseType) }
      , origValidator = type.validateAssign
      , typeMoniker   = options.typeMoniker
      , regExp
      , origDefault
      , defaultValue
      ;

    if (validation instanceof RegExp) {
      regExp = validation;
      defaultValue = new SimpExp(validation).gen();
      origDefault = type.defaultValue;
      type.defaultValue = () => {
        var value = origDefault();
        return regExp.test(value) ? value : defaultValue;
      };
      validation = value => regExp.test(value) ? null : 'Must match ' + String(regExp);
    }

    type.validateAssign = function(value, instancePath) {
      var instanceName = pathToStr(instancePath || typeMoniker)
        , message
        ;

      try {
        message = validation(value);
      } catch (err) {
        message = err.message;
      }
      if (message === true) {
        message = null;
      }
      if (message) {
        return 'Can\'t assign "' + instanceName + '": ' + message;
      } else {
        return origValidator(value, instancePath);
      }
    };

    if (type.origPack) {
      type.pack = type.origPack;
      type.origPack = undefined;
    }

    return Object.assign(self, finalizeType(type));
  }

  Validate.isType = true;
  return Validate;
}

export function reference(target) {
  function Reference(options) {
    return finalizeType({
      isType: true,
      name: pathToStr(options.typeMoniker),
      kind: 'reference',
      storageKinds: ['string'],
      options,
      validateData: function(value, instancePath) {
        instancePath = instancePath || options.typeMoniker;
        if (typeof value !== 'string') {
          return 'Reference data for "' + pathToStr(instancePath) + '" must be a string';
        }
        if (!value) return 'Reference cannot be empty';
      },
      validateAssign: function(value, instancePath) {
        instancePath = instancePath || options.typeMoniker;
        if (typeof value !== 'object' || !value._meta || !value._meta.idKey) {
          return 'Reference for "' + pathToStr(instancePath) + '" must be an object of type "' + target + '"';
        }
      },
      pack: function(value) {
        return value[value._meta.idKey];
      },
      unpack: function(store, storePath, instancePath, currentInstance, owner) {
        const findCollection = () => {
          var ancestor = owner
            , found
            , type
            , collection
            ;

          while (true) {
            if (!ancestor || !ancestor._meta) break;
            type = ancestor._meta.type;
            if (!type) break;
            if (type.isCollections && type.properties[target] && type.properties[target].isCollection) {
              collection = ancestor[target];
              if (collection && collection._meta && (type = collection._meta.type) && type.model && type.model.prototype === Object.getPrototypeOf(owner)) {
                found = collection;
                break;
              }
            }
            ancestor = ancestor._meta.owner;
          }
          return found;
        };

        var id = store.get(storePath);
        if (!id || id === '<unknown>') throw new ReferenceError('Cannot dereference: No "' + target + '" id present');

        var collection = findCollection();

        if (!collection) throw new TypeError('Cannot find collection of type "' + target + '"');

        var result = collection.get(id);
        if (!result) throw new ReferenceError('Cannot dereference: No "' + target + '" with id "' + id + '" exists');
        return result;
      },
      defaultValue: function() {
        return '<unknown>';
      }
    });
  }

  Reference.isType = true;
  return Reference;
}

export function ObjectId(options) {
  var base = parseType(options, String);
  base.name = 'objectid';
  return base;
}
ObjectId.isType = true;

export const Any = union(Object, Array, null, undefined, Number, Boolean, String);

export const Nil = union(null, undefined);

function parseObjectType(options, type, arrayType) {
  if (type === Object) return parseType(options, {});
  if (type === Array) return parseType(options, []);

  if (typeof type !== 'object') throw new TypeError(pathToStr(options.typeMoniker) + ' type must be an object');

  arrayType = Boolean(arrayType);

  var self        = { options }
    , typeMoniker = options.typeMoniker
    , propNames   = Object.keys(type)
    , properties  = {}
    , virtuals    = {}
    , methods     = {}
    , meta        = {}
    , kind        = arrayType ? 'array' : 'object'
    , prototype
    , thisType
    , restType
    ;

  if (options.self) {
    self = Object.assign(options.self, self);
  }

  if (arrayType) {
    if (!type.length) {
      return parseType(options, Array);
    }

    if (type.length === 1) {
      restType = parseType({ ...options, parent: self, self: null, typeMoniker: typeMoniker.concat('*') }, type[0]);
      propNames = [];
      methods = { ...arrayMethods };
      virtuals = { ...arrayVirtuals };
    }
  } else {
    if (!propNames.length) {
      return parseType(options, Object);
    }

    if (propNames.indexOf('*') !== -1) {
      propNames.splice(propNames.indexOf('*'), 1);
      if (!propNames.length && type['*'] === Any) return parseType(options, Object);
      restType = parseType({ ...options, parent: self, self: null, typeMoniker: typeMoniker.concat('*') }, type['*']);
    }
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
      properties[prop] = parseType({
        ...options,
        parent: self,
        self: null,
        typeMoniker: typeMoniker.concat(prop)
      }, type[prop]);
      if (properties[prop].name === 'objectid' && !meta.idKey) {
        meta.idKey = prop;
      }
    }
  });

  thisType = {
    isType: true,
    name: pathToStr(typeMoniker) || arrayType ? 'array' : 'object',
    kind,
    storageKinds: [kind],
    options,
    validateData: function(value, instancePath) {
      instancePath = instancePath || typeMoniker;
      if (typeof value !== 'object') {
        return 'Type of "' + pathToStr(instancePath) + '" data must be object';
      }
      return (
        propNames.reduce((message, name) => message || properties[name].validateData(value[name], instancePath.concat(name)), null)
        || Object.keys(value).reduce((message, name) => {
          if (message) return message;
          if (restType) {
            if (propNames.indexOf(name) !== -1) return null;
            return restType.validateData(value[name], instancePath.concat(name));
          } else {
            if (propNames.indexOf(name) === -1) {
              return 'Unknown data property "' + pathToStr(instancePath.concat(name)) + '"';
            }
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
        propNames.reduce((message, name) => message || properties[name].validateAssign(value[name], instancePath.concat(name)), null)
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
      var out = arrayType ? [] : {};
      propNames.forEach(name => out[name] = properties[name].pack(value[name]));

      if (restType) {
        Object.keys(value).forEach((name) => {
          if (propNames.indexOf(name) === -1) {
            if ((isNaN(name) || ((Number(name) % 1) !== 0) || Number(name) < 0 || String(Number(name)) !== String(name))) {
              throw new TypeError('Cannot set "' + pathToStr(options.typeMoniker.concat(name)) + '" property on array');
            }
            out[name] = restType.pack(value[name]);
          }
        });
      }
      return out;
    },
    unpack: function(store, storePath, instancePath, currentInstance, owner) {
      return hydrateInstance({
        ...options,
        prototype,
        store,
        storePath,
        instancePath,
        currentInstance,
        meta: { owner }
      });
    },
    defaultValue: function() {
      var defaultValue = arrayType ? [] : {};
      Object.keys(properties).forEach(name => defaultValue[name] = properties[name].defaultValue());
      return defaultValue;
    },
    properties,
    restType,
    methods,
    virtuals,
    defaultRestProp: function() {
      if (restType) return restType.defaultValue();
    },
    packProp: function(name, value) {
      if (propNames.indexOf(name) !== -1) {
        type = properties[name];
      } else {
        if (!restType) throw new TypeError('Unknown property ' + pathToStr(typeMoniker.concat(name)));
        type = restType;
      }
      return type.pack(value);
    }
  };

  if (arrayType) {
    thisType.length = type.length;
  }

  if ('name' in self) {
    delete thisType.name;
  }
  Object.assign(self, finalizeType(thisType));

  prototype = hydratePrototype({
    ...options,
    type: self,
    typePath: typeMoniker,
    getter(name) {
      var meta = this._meta
        , ix   = Number(name)
        , type
        ;

      if (arrayType) {
        if (isNaN(name) || ((ix % 1) !== 0) || ix < 0 || String(ix) !== String(name) || ix >= this.length) {
          return undefined;
        }
      }

      if (propNames.indexOf(name) !== -1) {
        type = properties[name];
      } else {
        if (!restType) {
          return;
        }
        type = restType;
        if (!name in this._meta.state) return;
      }
      return meta.store.unpack(type, meta.storePath.concat(name), meta.instancePath.concat(name), null, this);
    },
    setter(name, value) {
      var meta = this._meta
        , ix   = Number(name)
        , newState
        ;

      if (propNames.indexOf(name) !== -1) {
        type = properties[name];
      } else {
        if (!restType) throw new TypeError('Unknown property ' + pathToStr(meta.instancePath.concat(name)));
        type = restType;
      }

      if (arrayType) {
        if (isNaN(name) || ((ix % 1) !== 0) || ix < 0 || String(ix) !== String(name)) {
          throw new TypeError('Cannot set "' + pathToStr(options.typeMoniker.concat(name)) + '" property on array');
        }
        newState = meta.store.get(meta.storePath);
        if (ix > this.length) {
          newState = newState.slice();
          while (ix > newState.length) {
            newState.push(type.defaultValue());
          }
          newState.push(type.pack(value));
          return meta.store.put(meta.storePath, newState);
        }
      }

      meta.store.put(meta.storePath.concat(name), type.pack(value));
    }, keys() {
      return Object.keys(this._meta.state);
    },
    properties,
    methods,
    virtuals,
    meta
  });

  self.prototype = prototype;

  return self;
}

function anyObject(options, arrayType) {

  arrayType = Boolean(arrayType);

  var self = { options }
    , kind = arrayType ? 'array' : 'object'
    , prototype
    , thisType
    ;

  if (options.self) {
    self = Object.assign(options.self, self);
  }

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
    if (typeof obj !== 'object' || obj === null) {
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
    name: pathToStr(options.typeMoniker) || arrayType ? 'array' : 'object',
    kind,
    storageKinds: [kind],
    options,
    validateData: function(value, instancePath) {
      instancePath = instancePath || options.typeMoniker;
      if (!isValidObject(value, arrayType)) {
        return 'Type of "' + pathToStr(instancePath) + '" data must be ' + kind;
      }
    },
    validateAssign: function(value, instancePath) {
      instancePath = instancePath || options.typeMoniker;
      if (!isValidObject(value, arrayType)) {
        return 'Type of "' + pathToStr(instancePath) + '" data must be ' + kind;
      }
    },
    pack: function(value) {
      if (!isValidObject(value, arrayType)) {
        throw new TypeError(pathToStr(options.typeMoniker) + ' only accepts simple ' + kind + 's');
      }
      return clone(value);
    },
    unpack: function(store, storePath, instancePath, currentInstance, owner) {
      return hydrateInstance({
        ...options,
        prototype,
        store,
        storePath,
        instancePath,
        currentInstance,
        meta: { owner }
      });
    },
    defaultValue: function() {
      return arrayType ? [] : {};
    },
    properties: {},
    methods: {},
    virtuals: {},
    defaultRestProp: function() {
      //
    },
    packProp: function(name, value) {
      if (typeof value === 'object' && value === null && !isValidObject(value)) {
        throw new TypeError(pathToStr(options.typeMoniker.concat(name)) + ' only accepts simple types');
      }
      return clone(value);
    }
  };

  if ('name' in self) {
    delete thisType.name;
  }
  self = Object.assign(self, finalizeType(thisType));

  prototype = hydratePrototype({
    type: self,
    typePath: options.typeMoniker,
    getter(name) {
      var meta       = this._meta
        , storeValue = meta.store.get(meta.storePath)
        , propValue  = storeValue[name]
        , array      = isArray(propValue)
        , ix         = Number(name)
        , type
        ;

      if (arrayType) {
        if (isNaN(name) || ((ix % 1) !== 0) || ix < 0 || String(ix) !== String(name) || ix >= this.length) {
          return undefined;
        }
      }

      if (typeof propValue === 'object' && propValue !== null) {
        type = anyObject({
          ...options,
          parent: self,
          self: null,
          typeMoniker: options.typeMoniker.concat(name)
        }, array);
        return meta.store.unpack(type, meta.storePath.concat(name), meta.instancePath.concat(name), null, this);
      } else {
        return propValue;
      }
    }, setter(name, value) {
      var meta = this._meta
        , ix   = Number(name)
        , newState
        ;
      if (typeof value === 'object' && value === null && !isValidObject(value)) {
        throw new TypeError(pathToStr(options.typeMoniker.concat(name)) + ' only accepts simple types');
      }
      if (arrayType) {
        if (isNaN(name) || ((ix % 1) !== 0) || ix < 0 || String(ix) !== String(name)) {
          throw new TypeError('Cannot set "' + pathToStr(options.typeMoniker.concat(name)) + '" property on array');
        }
        newState = meta.store.get(meta.storePath);
        if (ix > this.length) {
          newState = newState.slice();
          while (ix > newState.length) {
            newState.push(undefined);
          }
          newState.push(clone(value));
          return meta.store.put(meta.storePath, newState);
        }
      }
      meta.store.put(meta.storePath.concat(name), clone(value));
    }, keys() {
      return Object.keys(this._meta.state);
    },
    methods: arrayType ? arrayMethods : {},
    virtuals: arrayType ? arrayVirtuals : {}
  });

  self.prototype = prototype;

  return self;
}

function basicType(options, type) {

  var upName = type.name[0].toUpperCase() + type.name.substr(1);

  return finalizeType({
    isType: true,
    name: pathToStr(options.typeMoniker) || type.name,
    kind: type.name,
    storageKinds: [type.name],
    options,
    validateData: function(value, instancePath) {
      instancePath = instancePath || options.typeMoniker;
      if (!type.is(value)) {
        return 'Type of "' + pathToStr(instancePath) + '" data must be ' + type.name;
      }
    },
    validateAssign: function(value, instancePath) {
      instancePath = instancePath || options.typeMoniker;
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
  });
}

function regExp(options) {
  var name = pathToStr(options.typeMoniker) || 'regexp';

  return finalizeType({
    isType: true,
    name: name,
    kind: 'regexp',
    storageKinds: ['object'],
    options,
    validateData: function(value, instancePath) {
      var ok    = true
        , props = 2
        ;

      instancePath = instancePath || options.typeMoniker;
      if ('lastIndex' in value) {
        props++;
      }
      if (
        !value
        || typeof value !== 'object'
        || Object.keys(value).length !== props
        || typeof value.pattern !== 'string'
        || typeof value.flags !== 'string'
      ) {
        ok = false;
      } else {
        try {
          new RegExp(value.pattern, value.flags); //eslint-disable-line no-new
          if (props === 3) {
            if (typeof value.lastIndex !== 'number') {
              ok = false;
            }
          }
        } catch (err) {
          ok = false;
        }
      }
      if (!ok) {
        return 'Type of "' + (pathToStr(instancePath) || name) + '" data must be RegExp data object';
      }
    },
    validateAssign: function(value, instancePath) {
      instancePath = instancePath || options.typeMoniker;
      if (!(value instanceof RegExp)) {
        return 'Type of "' + (pathToStr(instancePath) || name) + '" must be RegExp';
      }
    },
    pack: function(value) {
      var result = {
        pattern: value.source,
        flags: String(value).match(/[gimuy]*$/)[0]
      };
      if (value.lastIndex) {
        result.lastIndex = value.lastIndex;
      }
      return result;
    },
    unpack: function(store, path, instancePath, currentInstance) {
      if (currentInstance) throw new Error('RegExp types cannot modify a data instance');
      var stored = store.get(path)
        , regExp = new RegExp(stored.pattern, stored.flags)
        ;
      if (stored.lastIndex) {
        regExp.lastIndex = stored.lastIndex;
      }
      return regExp;
    },
    defaultValue: function() {
      return {
        pattern: '',
        flags: ''
      };
    }
  });
}

function date(options) {
  var name = pathToStr(options.typeMoniker) || 'date';
  return finalizeType({
    isType: true,
    name: name,
    kind: 'date',
    storageKinds: ['string'],
    options,
    validateData: function(value, instancePath) {
      instancePath = instancePath || options.typeMoniker;
      if (value !== '' && (typeof value !== 'string' || (new Date(value)).toJSON() !== value)) {
        return 'Type of "' + (pathToStr(instancePath) || name) + '" data must be Date string';
      }
    },
    validateAssign: function(value, instancePath) {
      instancePath = instancePath || options.typeMoniker;
      if (!(value instanceof Date)) {
        return 'Type of "' + (pathToStr(instancePath) || name) + '" must be Date';
      }
    },
    pack: function(value) {
      return value.toJSON() || '';
    },
    unpack: function(store, path, instancePath, currentInstance) {
      if (currentInstance) throw new Error('Date types cannot modify a data instance');
      return new Date(store.get(path) || 'Invalid Date');
    },
    defaultValue: function() {
      return '';
    }
  });
}

function error(options) {
  var name = pathToStr(options.typeMoniker) || 'error';

  return finalizeType({
    isType: true,
    name: name,
    kind: 'error',
    storageKinds: ['object'],
    options,
    validateData: function(value, instancePath) {
      instancePath = instancePath || options.typeMoniker;
      if (!isPlainObject(value) || (typeof value.name !== 'string') || (typeof value.message !== 'string')) {
        return 'Type of "' + (pathToStr(instancePath) || name) + '" data must be and Error object';
      }
    },
    validateAssign: function(value, instancePath) {
      instancePath = instancePath || options.typeMoniker;
      if (!(value instanceof Error)) {
        return 'Type of "' + (pathToStr(instancePath) || name) + '" must be Error';
      }
    },
    pack: function(value) {
      var serializable = JSON.parse(JSON.stringify(serializeError(value)));
      if (serializable.stack) {
        serializable.stack = serializable.stack.split('\n');
      }
      return serializable;
    },
    unpack: function(store, path, instancePath, currentInstance) {
      if (currentInstance) throw new Error('Error types cannot modify a data instance');
      var value = { ...store.get(path) }
        , type  = {
              EvalError,
              RangeError,
              ReferenceError,
              SyntaxError,
              TypeError,
              URIError
            }[value.name] || Error
        ;

      if (value.stack && value.stack.join) {
        value.stack = value.stack.join('\n');
      }
      if (type.prototype.name === value.name) {
        delete value.name;
      }

      return Object.assign(Object.create(type.prototype), {
        ...value,
        toString() {
          return this.message ? this.name + ': ' + this.message : this.name;
        },
        inspect() {
          return '[' + this.toString() + ']';
        }
      });
    },
    defaultValue: function() {
      return {
        name: 'Error',
        message: ''
      };
    }
  });
}

function parseType(options, type) {
  if (typeof type === 'function' && type.isType && !type.storageKinds) return type(options);
  if (type && type.isType) return type;

  if (type === Object) return anyObject(options, false);
  if (type === Array) return anyObject(options, true);

  if (type === null) return basicType(options, basicTypes.Null);
  if (type === undefined) return basicType(options, basicTypes.Undefined);

  if (type === Number) return basicType(options, basicTypes.Number);
  if (type === Boolean) return basicType(options, basicTypes.Boolean);
  if (type === String) return basicType(options, basicTypes.String);

  if (type === RegExp) return regExp(options);
  if (type === Date) return date(options);
  if (type === Error) return error(options);

  if (typeof type === 'object') {
    if (isArray(type)) {
      if (!type.length) {
        return anyObject(options, true);
      } else if (type.length > 1) {
        return union.apply(null, type)(options);
      } else {
        return parseObjectType(options, type, true);
      }
    } else {

      if (functionIsType(type.type)) {
        try {
          var actual = parseType(options, type.type);
          if (type.validate) {
            actual = validate(actual, type.validate)(options);
          }
          if (type.optional) {
            actual = optional(actual)(options);
          }
          return actual;
        } catch (err) {
          //empty
        }
      }

      return parseObjectType(options, type);
    }
  }

  throw new TypeError('Unknown type ' + type);
}

export function collection(model) {
  if (!model.isModel) {
    throw new TypeError('Collection items must be Models');
  }
  function Collection(options) {
    var self          = { options, isCollection: true }
      , typeMoniker   = options.typeMoniker
      , parentMoniker = typeMoniker.slice(0, -1)
      , modelType     = model({
          ...options,
          typeMoniker: parentMoniker.concat(model.modelName),
          parent: options.self || self,
          self: null
        })
      , type          = {
          '*': modelType,
          create: namedFunction('create' + modelType.name, function() {
            return this.model.apply(null, arguments);
          }, 'function(){\n  return new ' + modelType.name + '(...arguments);\n}', !options.namedFunctions),
          get all() {
            return Object.keys(this._meta.store.get([model.collection.toLowerCase()])).map(id => this.get(id));
          },
          get model() {
            var bound = modelType.bind(null, this);
            bound.prototype = modelType.prototype;
            return bound;
          }
        }
      , thisType
      ;

    thisType = parseType({ ...options, self }, type);

    thisType.name = 'collection(' + modelType.name + ')';
    thisType.collection = model.collection;
    thisType.model = modelType;
    return Object.assign(self, thisType);
  }

  Collection.isType = true;
  return Collection;
}

export function collections(models) {
  function Collections(options) {
    var thisType = { options, isCollections: true }
      , type
      ;

    type = {
      get models() {
        var result = {};
        models.forEach(model => result[model.modelName] = this[model.collection].model);
        return result;
      }
    };

    models.forEach(model => type[model.collection] = collection(model)(options));

    Object.assign(thisType, parseType({ ...options, self: thisType }, type));
    thisType.name = 'collections(' + models.map(model => model.modelName).join(', ') + ')';
    thisType.collections = models.map(model => type[model.collection]);
    return thisType;
  }

  Collections.isType = true;
  return Collections;
}

export function model(name, model) {
  var collection = name[0].toLowerCase() + name.substr(1);

  function Model(options = { typeMoniker: [] }) {
    if (typeof model !== 'object') throw new TypeError('model definitions must be objects');

    var rebuild = false
      , ResultModel
      , resultType
      , idKey
      ;

    ResultModel = namedFunction(name, function(owner) {

      if (!(this instanceof ResultModel)) {
        return new ResultModel(...arguments);
      }

      var args  = Array.prototype.slice.call(arguments)
        , store = options.store
        , id    = guid(24)
        , storePath
        , instancePath
        ;
      if (owner && owner._meta && owner._meta.store) {
        args.shift();
      } else {
        owner = null;
      }
      if (!store || !store.isStore) {
        throw new Error('Store needed');
      }

      storePath = (owner ? owner._meta.storePath : [collection]).concat(id);
      instancePath = (owner ? owner._meta.instancePath : [collection]).concat(id);
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
        Object.assign(this, values);
      };
      rebuild = true;
    }

    if (!idKey) {
      if (resultType.properties.id) {
        throw new TypeError('The "id" property of "' + name + '" must be an ObjectId');
      }
      model.id = ObjectId;
      idKey = 'id';
      rebuild = true;
    }
    if (rebuild) {
      resultType = parseType({ ...options, self: ResultModel }, model);
    }

    var origConstructor = resultType.methods.constructor;

    resultType.methods.constructor = namedFunction(name, function() {
      var storeInstance
        , path = this._meta.storePath
        ;

      storeInstance = resultType.defaultValue();
      storeInstance[idKey] = path[path.length - 1];
      this._meta.store.put(path, storeInstance);

      if (origConstructor) {
        origConstructor.apply(this, arguments);
      }
    }, origConstructor, !options.namedFunctions);

    delete resultType.name;

    Object.assign(ResultModel, resultType, {
      prototype: resultType.prototype,
      collection,
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

export function bare(func) {
  func.noWrap = true;
  return func;
}

export function reducer(func) {
  func.reducer = true;
}

export function autoResolve(func) {
  func.autoResolve = true;
  return func;
}

export function type(type) {
  if (!type) throw new TypeError('Type expected');
  var name = type.name || (type.constructor && type.constructor.name) || 'Type';
  var result = namedFunction(name, function(options) {
    return parseType(options, type);
  });
  result.isType = true;
  return result;
}
