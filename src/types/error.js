import finalizeType from '../parse/finalize-type';
import { pathToStr, isPlainObject } from '../utils';
import serializeError from 'serialize-error';

export default function error(options) {
  let name = pathToStr(options.typeMoniker) || 'error';

  const thisType = finalizeType({
    isType: true,
    name: name,
    kind: 'error',
    storageKinds: ['object'],
    options,
    validateData(value, instancePath) {
      instancePath = instancePath || options.typeMoniker;
      if (!isPlainObject(value) || (typeof value.name !== 'string') || (typeof value.message !== 'string')) {
        return `Type of "${pathToStr(instancePath) || name}" data must be and Error object`;
      }
    },
    coerceData(value, instancePath) {
      if (!thisType.validateData(value, instancePath)) return value;
      return thisType.defaultValue();
    },
    validateAssign(value, instancePath) {
      instancePath = instancePath || options.typeMoniker;
      if (!(value instanceof Error)) {
        return `Type of "${pathToStr(instancePath) || name}" must be Error`;
      }
    },
    pack(value) {
      let serializable = JSON.parse(JSON.stringify(serializeError(value)));
      if (serializable.stack) {
        serializable.stack = serializable.stack.split('\n');
      }
      return serializable;
    },
    unpack(store, path, instancePath, currentInstance) {
      if (currentInstance) throw new Error('Error types cannot modify a data instance');
      let value = { ...store.get(path) }
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
          return this.message ? `${this.name}: ${this.message}` : this.name;
        },
        inspect() {
          return `[${this.toString()}]`;
        }
      });
    },
    getTypeFromPath(path) {
      if (path.length) throw new Error(`Cannot get type path for properties of Errors`);
      return options.typeMoniker;
    },
    defaultValue() {
      return {
        name: 'Error',
        message: ''
      };
    }
  });

  return thisType;
}
