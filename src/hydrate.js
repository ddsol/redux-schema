import { snakeCase, pathToStr, namedFunction, toObject } from './utils';

function freezeObject(obj) {
  if (Object.freeze) {
    Object.freeze(obj);
  }
}

export function hydratePrototype({ type, typePath, getter, setter, keys, properties = {}, methods = {}, virtuals = {}, meta = {}, freeze, namedFunctions }) {
  var prototype = Object.create(type.kind === 'array' ? Array.prototype : Object.prototype)
    , define    = {}
    , typeSnake = snakeCase(pathToStr(typePath)).replace('.', '_')
    ;

  meta = { ...meta, type, typePath };

  Object.defineProperty(meta, 'state', {
    get: function() {
      return this.store.get(this.storePath);
    },
    set: function(value) {
      this.store.put(this.storePath, value);
    }
  });

  define.get = {
    enumerable: true,
    value: function(propName) {
      var meta = this._meta;
      return getter.call(this, propName, meta.store, meta.storePath, meta.instancePath, this);
    }
  };

  define.set = {
    enumerable: true,
    value: function(propName, value) {
      var meta = this._meta;
      return setter.call(this, propName, value, meta.store, meta.storePath, meta.instancePath, this);
    }
  };

  define.keys = {
    enumerable: false,
    get: keys
  };

  if (freeze) {
    freezeObject(meta);
  }

  define._meta = {
    enumerable: false,
    value: meta
  };

  define.toObject = {
    enumerable: false,
    value: function() {
      return toObject(this);
    }
  };

  define.inspect = {
    enumerable: false,
    value: function() {
      return toObject(this);
    }
  };

  Object.keys(properties).forEach((propName) => {
    define[propName] = {
      enumerable: true,
      get: function() {
        var meta = this._meta;
        return getter.call(this, propName, meta.store, meta.storePath, meta.instancePath, meta.instance);
      },
      set: function(value) {
        var meta = this._meta;
        return setter.call(this, propName, value, meta.store, meta.storePath, meta.instancePath, meta.instance);
      }
    };
  });

  Object.keys(methods).forEach((methodName) => {
    var invokeName = methodName
      , method     = methods[methodName]
      , actionType = typeSnake + '_' + snakeCase(methodName)
      ;

    if (method.noWrap) {
      define[methodName] = {
        enumerable: true,
        value: method
      };
    } else {
      if (methodName === 'constructor') {
        invokeName = typePath[0];
      }
      define[methodName] = {
        enumerable: true,
        value: namedFunction(invokeName, function invokeMethod() {
          var meta = this._meta
            , path = meta.instancePath.concat(methodName)
            ;
          return meta.store.invoke(this, actionType, path, methods[methodName], Array.prototype.slice.call(arguments));
        }, method, !namedFunctions)
      };
    }
  });

  Object.keys(virtuals).forEach((virtualName) => {
    var actionType = typeSnake + '_SET_' + snakeCase(virtualName)
      , prop       = virtuals[virtualName]
      ;

    define[virtualName] = {
      enumerable: true,
      get: prop.get,
      set: function(value) {
        var meta             = this._meta
          , propInstancePath = meta.instancePath.concat(virtualName)
          ;
        meta.store.setVirtual(this, actionType, propInstancePath, prop.set, value);
      }
    };
  });

  Object.defineProperties(prototype, define);
  if (freeze) {
    freezeObject(prototype);
  }
  return prototype;
}

export function hydrateInstance({ prototype, store, storePath, instancePath, currentInstance, meta, freeze }) {
  var instance = currentInstance || Object.create(prototype);

  meta = Object.create(instance._meta, meta || {});

  meta.store = store;
  meta.storePath = storePath;
  meta.instancePath = instancePath;

  if (freeze) {
    freezeObject(meta);
  }

  Object.defineProperty(instance, '_meta', {
    enumerable: false,
    value: meta
  });

  if (freeze && Object.seal) {
    Object.seal(instance);
  }

  return instance;
}
