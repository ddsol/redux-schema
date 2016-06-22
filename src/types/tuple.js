import parseObjectType from '../parse/parse-object';
import { isArray } from '../utils';

export default function tuple(...types) {
  if (!types.length) throw new TypeError('Tuple requires item types.');

  if (types.length === 1) {
    if (!types[0] || !isArray(types[0]) || types[0].length<2) throw new TypeError('Tuple requires multiple item types.');
    types = types[0];
  }

  function Tuple(options) {
    let type = parseObjectType(options, types, true);

    type.name = `tuple(${Object.keys(type.properties).map(prop => type.properties[prop].kind).join(', ')})`;
    return type;
  }

  Tuple.isType = true;
  return Tuple;
}

