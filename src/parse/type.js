import { namedFunction } from '../utils.js';
import parseType from './parse-type';

export default function type(type) {
  if (!type) throw new TypeError('Type expected');
  let name = type.name || (type.constructor && type.constructor.name) || 'Type'
    , result = namedFunction(name, function(options) {
        return parseType(options, type);
      })
    ;
  result.isType = true;
  return result;
}
