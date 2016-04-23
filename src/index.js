import { isArray, isPlainObject, guid, pathToStr, namedFunction } from './utils';
import { functionIsType, basicTypes } from './basic';
import Store from './store';
import { hydratePrototype, hydrateInstance } from './hydrate';
import { arrayMethods, arrayVirtuals } from './array';
import serializeError from 'serialize-error';
import SimpExp from 'simpexp';

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
      , handlerIds
      , handlers
      ;

    handlers = types.map(type => parseType(options, type));

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
      options: options,
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
      unpack: function(store, path, instancePath, currentInstance) {
        if (currentInstance) throw new Error('Union types cannot modify a data instance');
        var value = store.get(path);
        if (simple) {
          for (var i = 0; i < handlers.length; i++) {
            if (!handlers[i].validateData(value, instancePath)) {
              return store.unpack(handlers[i], path, instancePath);
            }
          }
          throw new TypeError('No matching data type for union "' + pathToStr(instancePath) + '"');
        } else {
          if (!handlersById[value.type]) {
            return 'Unexpected type "' + value.type + '" for union "' + pathToStr(instancePath) + '"';
          }
          return store.unpack(handlersById[value.type], path.concat('value'), instancePath);
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
      handlers: handlers
    };

    return finalizeType(thisType);
  }

  Union.isType = true;
  return Union;
}

export function optional(baseType) {
  if (parseType({ typeMoniker: [] }, baseType).storageKinds.indexOf('undefined') !== -1) {
    return baseType;
  }

  function Optional(options) {
    var base = parseType(options, baseType)
      , out  = parseType(options, union(undefined, baseType))
      ;
    out.name = 'optional(' + base.name + ')';
    return out;
  }

  Optional.isType = true;
  return Optional;
}

export function validate(baseType, validation) {
  function Validate(options) {
    var type          = { ...parseType(options, baseType) }
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

    return finalizeType(type);
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
      options: options,
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
      unpack: function(store, path) {
        var id = store.get(path);
        if (!id || id === '<unknown>') throw new TypeError('Cannot dereference: No "' + target + '" id present');
        var result = store.instance.get(target.toLowerCase()).get(id);
        if (!result) throw new TypeError('Cannot dereference: No "' + target + '" with id "' + id + '" exists');
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

  var typeMoniker = options.typeMoniker
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

  if (arrayType) {
    if (!type.length) {
      return parseType(options, Array);
    }

    if (type.length === 1) {
      restType = parseType({ ...options, typeMoniker: typeMoniker.concat('*') }, type[0]);
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
      restType = parseType({ ...options, typeMoniker: typeMoniker.concat('*') }, type['*']);
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
      properties[prop] = parseType({ ...options, typeMoniker: typeMoniker.concat(prop) }, type[prop]);
      if (properties[prop].name === 'objectid' && !meta.idKey) {
        meta.idKey = prop;
      }
    }
  });

  thisType = {
    isType: true,
    name: pathToStr(typeMoniker),
    kind: kind,
    storageKinds: [kind],
    options: options,
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
      var out = {};
      propNames.forEach(name => out[name] = properties[name].pack(value[name]));
      if (restType) {
        Object.keys(value).forEach((name) => {
          if (propNames.indexOf(name) === -1) {
            out[name] = restType.pack(value[name]);
          }
        });
      }
      return out;
    },
    unpack: function(store, storePath, instancePath, currentInstance) {
      return hydrateInstance({ ...options, prototype, store, storePath, instancePath, currentInstance });
    },
    defaultValue: function() {
      var defaultValue = arrayType ? [] : {};
      Object.keys(properties).forEach(name => defaultValue[name] = properties[name].defaultValue());
      return defaultValue;
    },
    properties: properties,
    restType: restType,
    methods: methods,
    virtuals: virtuals,
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

  prototype = hydratePrototype({
    ...options,
    type: thisType,
    typePath: typeMoniker,
    getter(name) {
      var meta = this._meta
        , type
        ;
      if (propNames.indexOf(name) !== -1) {
        type = properties[name];
      } else {
        if (!restType) throw new TypeError('Unknown property ' + pathToStr(meta.instancePath.concat(name)));
        type = restType;
        if (!name in this._meta.state) return;
      }
      return meta.store.unpack(type, meta.storePath.concat(name), meta.instancePath.concat(name));
    },
    setter(name, value) {
      var meta = this._meta;

      if (propNames.indexOf(name) !== -1) {
        type = properties[name];
      } else {
        if (!restType) throw new TypeError('Unknown property ' + pathToStr(meta.instancePath.concat(name)));
        type = restType;
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

  thisType.prototype = prototype;

  return finalizeType(thisType);
}

function anyObject(options, arrayType) {

  arrayType = Boolean(arrayType);

  var kind = arrayType ? 'array' : 'object'
    , prototype
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
    if (typeof value !== 'object' || value === null) {
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
    name: pathToStr(options.typeMoniker),
    kind: kind,
    storageKinds: [kind],
    options: options,
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
    unpack: function(store, storePath, instancePath, currentInstance) {
      return hydrateInstance({ ...options, prototype, store, storePath, instancePath, currentInstance });
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

  prototype = hydratePrototype({
    type:thisType,
    typePath: options.typeMoniker,
    getter(name) {
      var meta       = this._meta
        , storeValue = meta.store.get(meta.storePath)
        , propValue  = storeValue[name]
        , array      = isArray(propValue)
        , type
        ;

      if (typeof propValue === 'object' && propValue !== null) {
        type = anyObject(options.typeMoniker.concat(name), array);
        return meta.store.unpack(type, meta.storePath.concat(name), meta.instancePath.concat(name), this);
      } else {
        return propValue;
      }
    }, setter(name, value) {
      var meta = this._meta;
      if (typeof value === 'object' && value === null && !isValidObject(value)) {
        throw new TypeError(pathToStr(options.typeMoniker.concat(name)) + ' only accepts simple types');
      }
      meta.store.put(meta.storePath.concat(name), clone(value));
    }, keys() {
      return Object.keys(this._meta.state);
    },
    methods: arrayType ? arrayMethods : {},
    virtuals: arrayType ? arrayVirtuals : {}
  });

  thisType.prototype = prototype;

  return finalizeType(thisType);
}

function basicType(options, type) {

  var upName = type.name[0].toUpperCase() + type.name.substr(1);

  return finalizeType({
    isType: true,
    name: pathToStr(options.typeMoniker),
    kind: type.name,
    storageKinds: [type.name],
    options: options,
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
  return finalizeType({
    isType: true,
    name: pathToStr(options.typeMoniker),
    kind: 'regexp',
    storageKinds: ['object'],
    options: options,
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
        || Object.keys.length(value) !== props
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
        return 'Type of "' + pathToStr(instancePath) + '" data must be RegExp data object';
      }
    },
    validateAssign: function(value, instancePath) {
      instancePath = instancePath || options.typeMoniker;
      if (!(value instanceof RegExp)) {
        return 'Type of "' + pathToStr(instancePath) + '" must be RegExp';
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
  return finalizeType({
    isType: true,
    name: pathToStr(options.typeMoniker),
    kind: 'date',
    storageKinds: ['string'],
    options: options,
    validateData: function(value, instancePath) {
      instancePath = instancePath || options.typeMoniker;
      if (typeof value === 'string' && (new Date(value)).toJSON() === value) {
        return 'Type of "' + pathToStr(instancePath) + '" data must be Date string';
      }
    },
    validateAssign: function(value, instancePath) {
      instancePath = instancePath || options.typeMoniker;
      if (!(value instanceof Date)) {
        return 'Type of "' + pathToStr(instancePath) + '" must be Date';
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
  return finalizeType({
    isType: true,
    name: pathToStr(options.typeMoniker),
    kind: 'error',
    storageKinds: ['object'],
    options: options,
    validateData: function(value, instancePath) {
      instancePath = instancePath || options.typeMoniker;
      if (typeof value === 'string' && (new Date(value)).toJSON() === value) {
        return 'Type of "' + pathToStr(instancePath) + '" data must be and Error object';
      }
    },
    validateAssign: function(value, instancePath) {
      instancePath = instancePath || options.typeMoniker;
      if (!(value instanceof Error)) {
        return 'Type of "' + pathToStr(instancePath) + '" must be Error';
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
              EvalError: EvalError,
              RangeError: RangeError,
              ReferenceError: ReferenceError,
              SyntaxError: SyntaxError,
              TypeError: TypeError,
              URIError: URIError
            }[value.name] || Error
        ;

      if (value.stack && value.stack.join) {
        value.stack = value.stack.join('\n');
      }
      if (type.prototype.name === value.name) {
        delete value.name;
      }

      return {
        ...Object.create(type.prototype),
        ...value,
        toString() {
          return this.message ? this.name + ': ' + this.message : this.name;
        },
        inspect() {
          return '[' + this.toString() + ']';
        }
      };
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
  if (typeof type === 'function' && type.isType) return type(options);
  if (type && type.isType) return { ...type, name: pathToStr(options.typeMoniker) };

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
          console.log(err);
        }
      }

      return parseObjectType(options, type);
    }
  }

  throw new TypeError('Unknown type ' + type);
}

function collection(schema) {
  if (!schema.isSchema) {
    throw new TypeError('Collection items must be Schemas');
  }
  function Collection(options) {
    var type     = {
          '*': schema.type,
          create: namedFunction('create' + schema.name, function() {
            var instance = Object.create(schema.prototype)
              , args     = Array.prototype.slice.call(arguments);
            args.unshift(this._store);
            return schema.apply(instance, arguments);
          }, 'function(){\n  return new ' + schema.name + '(...arguments);\n}', !options.namedFunctions),
          get all() {
            return Object.keys(this._meta.store.get([schema.collection.toLowerCase()])).map(id => this.get(id));
          }
        },
        thisType = parseType(options, type);
    thisType.name = 'collection(' + schema.collection + ')';
    thisType.collection = schema.collection;
    thisType.isCollection = true;
    return thisType;
  }

  Collection.isType = true;
  return Collection;
}

function collections(schemas) {
  function Collections(options) {
    var type = {}
      , thisType
      ;

    schemas.forEach(schema => type[schema.collection] = collection(schema));
    thisType = parseType(options, type);
    thisType.name = 'collections(' + schemas.map(schema => schema.name).join(', ') + ')';
    thisType.collections = Object.keys(type).map(name => type[name]);
    return thisType;
  }

  Collections.isType = true;
  return Collections;
}

export default function schema(name, schema, options) {
  if (isArray(name) && arguments.length === 1) {
    return collections(name);
  }
  if (typeof schema !== 'object') throw new TypeError('schema definitions must be objects');

  options = { ...options || {} };

  if (options.debug) {
    options.freeze = true;
    options.validate = true;
    options.namedFunctions = true;
  }

  var resultType = parseObjectType({ ...options, typeMoniker: [name] }, schema)
    , collection = name[0].toLowerCase() + name.substr(1)
    , rebuild    = false
    , idKey
    , ResultSchema
    ;

  Object.keys(resultType.properties || {}).forEach((name) => {
    if (resultType.properties[name].name === 'objectid') {
      idKey = name;
    }
  });

  if (!resultType.methods.hasOwnProperty('constructor')) {
    schema.constructor = function() {
    };
    rebuild = true;
  }

  if (!idKey) {
    if (resultType.properties.id) {
      throw new TypeError('The "id" property of "' + name + '" must be an ObjectId');
    }
    schema.id = ObjectId;
    idKey = 'id';
    rebuild = true;
  }
  if (rebuild) {
    resultType = parseObjectType({ ...options, typeMoniker: [name] }, schema);
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
  }, origConstructor || function() {}, !options.namedFunctions);

  ResultSchema = namedFunction(name, function(store) {

    if (!(this instanceof ResultSchema)) {
      return new ResultSchema(...arguments);
    }

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
  }, resultType.constructor, !options.namedFunctions);

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

  Object.assign(ResultSchema, {
    prototype: resultType.prototype,
    type: resultType,
    collection: collection,
    options: options,
    schema: schema,
    hydrate: hydrateFromStore,
    isSchema: true
  });

  return ResultSchema;
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

Object.assign(schema, {
  Any: Any,
  Nil: Nil,
  ObjectId: ObjectId,

  union: union,

  optional: optional,
  validate: validate,

  collection: collection,
  collections: collections,

  reducer: reducer,
  bare: bare,
  autoResolve: autoResolve,

  reference: reference,

  Store: Store
});

