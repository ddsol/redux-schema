import finalizeType from '../parse/finalize-type';
import { pathToStr, isPlainObject } from '../utils';
import serializeError from 'serialize-error';

export default function error(options) {
  let name = pathToStr(options.typeMoniker) || 'error';

  return finalizeType({
    isType: true,
    name: name,
    kind: 'error',
    storageKinds: ['object'],
    options,
    validateData: function(value, instancePath) {
      instancePath = instancePath || options.typeMoniker;
      if (!isPlainObject(value) || (typeof value.name !== 'string') || (typeof value.message !== 'string')) {
        return `Type of "${pathToStr(instancePath) || name}" data must be and Error object`;
      }
    },
    validateAssign: function(value, instancePath) {
      instancePath = instancePath || options.typeMoniker;
      if (!(value instanceof Error)) {
        return `Type of "${pathToStr(instancePath) || name}" must be Error`;
      }
    },
    pack: function(value) {
      let serializable = JSON.parse(JSON.stringify(serializeError(value)));
      if (serializable.stack) {
        serializable.stack = serializable.stack.split('\n');
      }
      return serializable;
    },
    unpack: function(store, path, instancePath, currentInstance) {
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
    defaultValue: function() {
      return {
        name: 'Error',
        message: ''
      };
    }
  });
}
