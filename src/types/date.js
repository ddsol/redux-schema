import finalizeType from '../parse/finalize-type';
import { pathToStr } from '../utils';

export default function date(options) {
  let name = pathToStr(options.typeMoniker) || 'date';
  return finalizeType({
    isType: true,
    name: name,
    kind: 'date',
    storageKinds: ['string'],
    options,
    validateData(value, instancePath) {
      instancePath = instancePath || options.typeMoniker;
      if (value !== '' && (typeof value !== 'string' || (new Date(value)).toJSON() !== value)) {
        return `Type of "${pathToStr(instancePath) || name}" data must be Date string`;
      }
    },
    validateAssign(value, instancePath) {
      instancePath = instancePath || options.typeMoniker;
      if (!(value instanceof Date)) {
        return `Type of "${pathToStr(instancePath) || name}" must be Date`;
      }
    },
    pack(value) {
      return value.toJSON() || '';
    },
    unpack(store, path, instancePath, currentInstance) {
      if (currentInstance) throw new Error('Date types cannot modify a data instance');
      return new Date(store.get(path) || 'Invalid Date');
    },
    getTypeFromPath(path) {
      if (path.length) throw new Error(`Cannot get type path for properties of Dates`);
      return options.typeMoniker;
    },
    defaultValue() {
      return '';
    }
  });
}

