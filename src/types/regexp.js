import finalizeType from '../parse/finalize-type';
import { pathToStr } from '../utils';

export default function regExp(options) {
  let name = pathToStr(options.typeMoniker) || 'regexp';

  return finalizeType({
    isType: true,
    name: name,
    kind: 'regexp',
    storageKinds: ['object'],
    options,
    validateData: function(value, instancePath) {
      let ok    = true
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
        return `Type of "${pathToStr(instancePath) || name}" data must be RegExp data object`;
      }
    },
    validateAssign: function(value, instancePath) {
      instancePath = instancePath || options.typeMoniker;
      if (!(value instanceof RegExp)) {
        return `Type of "${pathToStr(instancePath) || name}" must be RegExp`;
      }
    },
    pack: function(value) {
      let result = {
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
      let stored = store.get(path)
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

