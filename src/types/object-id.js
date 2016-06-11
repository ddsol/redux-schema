import parseType from '../parse/parse-type';

export default function ObjectId(options) {
  let base = parseType(options, String);
  base.name = 'objectid';
  return base;
}
ObjectId.isType = true;
