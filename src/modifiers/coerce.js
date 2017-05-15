import finalizeType from '../parse/finalize-type';
import parseType from '../parse/parse-type';

export default function coerce(baseType, customCoerce) {
  function Coerce(options) {
    const self = { options };
    const type = { ...parseType({ ...options, self: options.self }, baseType) };
    const origCoerce = type.coerceData;

    type.coerceData = function(value) {
      value = customCoerce(value);
      if (type.validateData(value)) {
        return origCoerce(value);
      }
      return value;
    };
    return Object.assign(self, finalizeType(type));
  }

  Coerce.isType = true;
  return Coerce;
}

