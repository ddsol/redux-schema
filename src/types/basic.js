import finalizeType from '../parse/finalize-type';
import { pathToStr } from '../utils';

export function functionIsType(func) {
  return func && (
      func === String
      || func === Number
      || func === Boolean
      || func === Error
      || func === RegExp
      || func === Date
      || func === Array
      || func === Object
      || func.isType === true
    );
}

const basicTypeHandlers = {
  String: {
    name: 'string',
    is: v => typeof v === 'string',
    defaultValue: ''
  },
  Number: {
    name: 'number',
    is: v => typeof v === 'number',
    defaultValue: 0
  },
  Boolean: {
    name: 'boolean',
    is: v => typeof v === 'boolean',
    defaultValue: false
  },
  Null: {
    name: 'null',
    is: v => v === null,
    defaultValue: null
  },
  Undefined: {
    name: 'undefined',
    is: v => typeof v === 'undefined',
    defaultValue: undefined
  }
};

function basicType(options, type) {
  let upName = type.name[0].toUpperCase() + type.name.substr(1);

  return finalizeType({
    isType: true,
    name: pathToStr(options.typeMoniker) || type.name,
    kind: type.name,
    storageKinds: [type.name],
    options,
    validateData: function(value, instancePath) {
      instancePath = instancePath || options.typeMoniker;
      if (!type.is(value)) {
        return `Type of "${pathToStr(instancePath)}" data must be ${type.name}`;
      }
    },
    validateAssign: function(value, instancePath) {
      instancePath = instancePath || options.typeMoniker;
      if (!type.is(value)) {
        return `Type of "${pathToStr(instancePath)}" must be ${type.name}`;
      }
    },
    pack: function(value) {
      return value;
    },
    unpack: function(store, path, instancePath, currentInstance) {
      if (currentInstance) throw new Error(`${upName} types cannot modify a data instance`);
      return store.get(path);
    },
    defaultValue: function() {
      return type.defaultValue;
    }
  });
}

let _basicTypes = {};

Object.keys(basicTypeHandlers).forEach(name => _basicTypes[name.toLowerCase()] = options => basicType(options, basicTypeHandlers[name]));

export const basicTypes = _basicTypes;

