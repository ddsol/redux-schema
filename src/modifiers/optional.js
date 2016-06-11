import parseType from '../parse/parse-type';
import union from '../types/union';

export default function optional(baseType) {
  function Optional(options) {
    let self = { options }
      , base = parseType({ ...options, parent: options.self || self, self: null }, baseType)
      , out  = union(undefined, baseType)(options)
      ;
    if (base.storageKinds.indexOf('undefined') !== -1) {
      return parseType(options, baseType);
    }

    out.name = `optional(${base.name})`;
    return Object.assign(self, out);
  }

  Optional.isType = true;
  return Optional;
}

