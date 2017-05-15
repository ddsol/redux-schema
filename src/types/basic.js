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
    defaultValue: '',
    coerce: v => {
      if (v === undefined || v === null) {
        return '';
      }
      return String(v);
    }
  },
  Number: {
    name: 'number',
    is: v => typeof v === 'number',
    defaultValue: 0,
    coerce: v => {
      const n = Number(v);
      return isNaN(n) ? 0 : n;
    }
  },
  Boolean: {
    name: 'boolean',
    is: v => typeof v === 'boolean',
    defaultValue: false,
    coerce: v => Boolean(v)
  },
  Null: {
    name: 'null',
    is: v => v === null,
    defaultValue: null,
    coerce: () => null
  },
  Undefined: {
    name: 'undefined',
    is: v => typeof v === 'undefined',
    defaultValue: undefined,
    coerce: () => undefined
  }
};

function basicType(options, type) {
  const upName = type.name[0].toUpperCase() + type.name.substr(1);

  const thisType = finalizeType({
    isType: true,
    name: pathToStr(options.typeMoniker) || type.name,
    kind: type.name,
    storageKinds: [type.name],
    options,
    validateData(value, instancePath) {
      instancePath = instancePath || options.typeMoniker;
      if (!type.is(value)) {
        return `Type of "${pathToStr(instancePath)}" data must be ${type.name}`;
      }
    },
    coerceData(value) {
      if (!thisType.validateData(value)) return value;
      return type.coerce(value);
    },
    validateAssign(value, instancePath) {
      instancePath = instancePath || options.typeMoniker;
      if (!type.is(value)) {
        return `Type of "${pathToStr(instancePath)}" must be ${type.name}`;
      }
    },
    pack(value) {
      return value;
    },
    unpack(store, path, instancePath, currentInstance) {
      if (currentInstance) throw new Error(`${upName} types cannot modify a data instance`);
      return store.get(path);
    },
    getTypeFromPath(path) {
      if (path.length) throw new Error(`Cannot get type path for properties of ${type.name}s`);
      return options.typeMoniker;
    },
    defaultValue() {
      return type.defaultValue;
    }
  });
  return thisType;
}

let _basicTypes = {};

Object.keys(basicTypeHandlers).forEach(name => _basicTypes[name.toLowerCase()] = options => basicType(options, basicTypeHandlers[name]));

export const basicTypes = _basicTypes;

