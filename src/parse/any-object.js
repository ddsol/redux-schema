import finalizeType from '../parse/finalize-type';
import { pathToStr, isArray, isPlainObject } from '../utils';
import { arrayMethods, arrayVirtuals } from './array';
import { hydratePrototype, hydrateInstance } from './hydrate';

export default function anyObject(options, arrayType) {

  arrayType = Boolean(arrayType);

  let self       = { options }
    , kind       = arrayType ? 'array' : 'object'
    , storedKeys = []
    , storedState
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

    let keys = Object.keys(value)
      , propVal
      ;
    for (let i = 0; i < keys.length; i++) {
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
    let out  = isArray(obj) ? [] : {}
      , isSchemaObject = obj && obj._meta && obj._meta.type && (obj._meta.type.kind === 'object' || obj._meta.type.kind === 'array')
      , keys
      , key
      , value
      ;

    function getProp(prop) {
      if (isSchemaObject) {
        return obj.get(prop);
      }
      return obj[prop];
    }

    if (isSchemaObject) {
      keys = obj.keys;
    } else {
      keys = Object.keys(obj);
    }

    for (let i = 0; i < keys.length; i++) {
      key = keys[i];
      value = getProp(key);
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
    validateData(value, instancePath) {
      instancePath = instancePath || options.typeMoniker;
      if (!isValidObject(value, arrayType)) {
        return `Type of "${pathToStr(instancePath)}" data must be ${kind}`;
      }
    },
    validateAssign(value, instancePath) {
      instancePath = instancePath || options.typeMoniker;
      if (!isValidObject(value, arrayType)) {
        return `Type of "${pathToStr(instancePath)}" data must be ${kind}`;
      }
    },
    pack(value) {
      if (!isValidObject(value, arrayType)) {
        throw new TypeError(`${pathToStr(options.typeMoniker)} only accepts simple ${kind}s`);
      }
      return clone(value);
    },
    unpack(store, storePath, instancePath, currentInstance, owner) {
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
    getTypeFromPath(path) {
      return options.typeMoniker.concat(path);
    },
    defaultValue(){
      return arrayType ? [] : {};
    },
    properties: {},
    methods: {},
    virtuals: {},
    defaultRestProp(){},
    packProp(name, value) {
      if (typeof value === 'object' && value !== null && !isValidObject(value)) {
        throw new TypeError(`${pathToStr(options.typeMoniker.concat(name))} only accepts simple types`);
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
      let meta       = this._meta
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
      let meta = this._meta
        , ix   = Number(name)
        , newState
        ;
      if (typeof value === 'object' && value === null && !isValidObject(value)) {
        throw new TypeError(`${pathToStr(options.typeMoniker.concat(name))} only accepts simple types`);
      }
      if (arrayType) {
        if (isNaN(name) || ((ix % 1) !== 0) || ix < 0 || String(ix) !== String(name)) {
          throw new TypeError(`Cannot set "${pathToStr(options.typeMoniker.concat(name))}" property on array`);
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
      let state = this._meta.state;
      if (storedState !== state) {
        storedKeys = Object.keys(state);
        storedState = state;
      }
      return storedKeys;
    },
    methods: arrayType ? arrayMethods : {},
    virtuals: arrayType ? arrayVirtuals : {}
  });

  self.prototype = prototype;

  return self;
}

