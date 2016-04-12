import {snakeCase, pathToStr, namedFunction } from './utils';

export default function hydrate(store, type, typePath, storePath, instancePath, getter, setter, properties, methods, virtuals, meta, currentInstance) {
  var instance  = currentInstance || {}
    , define    = {}
    , typeSnake = snakeCase(pathToStr(typePath))
    ;

  meta = meta || {};
  meta.type = type;
  meta.store =store;
  meta.typePath = typePath;
  meta.storePath = storePath;
  meta.instancePath = instancePath;

  define.get = {
    enumerable: true,
    value: function(propName) {
      return getter(propName, store, storePath, instancePath, instance);
    }
  };

  define.set = {
    enumerable: true,
    value: function(propName, value) {
      return setter(propName, value, store, storePath, instancePath, instance);
    }
  };

  if (meta) {
    define._meta = {
      enumerable: false,
      value: meta
    };
  }

  Object.keys(properties).forEach((propName) => {
    define[propName] = {
      enumerable: true,
      get: function() {
        return getter(propName, store, storePath, instancePath, instance);
      },
      set: function(value) {
        return setter(propName, value, store, storePath, instancePath, instance);
      }
    };
  });

  Object.keys(methods).forEach((methodName) => {
    var actionType = typeSnake + '_' + snakeCase(methodName)
      , path       = instancePath.concat(methodName)
      , method     = methods[methodName]
      , invokeName = methodName
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
          return store.invoke(instance, actionType, path, methods[methodName], Array.prototype.slice.call(arguments));
        }, method)
      };
    }
  });

  Object.keys(virtuals).forEach((virtualName) => {
    var actionType       = typeSnake + '_SET_' + snakeCase(virtualName)
      , propInstancePath = instancePath.concat(virtualName)
      , prop             = virtuals[virtualName]
      ;

    define[virtualName] = {
      enumerable: true,
      get: prop.get,
      set: function(value) {
        store.setVirtual(instance, actionType, propInstancePath, prop.set, value);
      }
    };
  });

  Object.defineProperties(instance, define);

  if (Object.seal) Object.seal(instance);

  return instance;
}
