import parseObjectType from './parse-object';
import anyObject from './any-object';

import regExp from '../types/regexp';
import date from '../types/date';
import error from '../types/error';
import union from '../types/union';
import { functionIsType, basicTypes } from '../types/basic';

import { isArray } from '../utils';

import validate from '../modifiers/validate';
import optional from '../modifiers/optional';

export default function parseType(options, type) {
  if (typeof type === 'function' && type.isType && !type.storageKinds) return type(options);
  if (type && type.isType) return type;

  if (type === Object) return anyObject(options, false);
  if (type === Array) return anyObject(options, true);

  if (type === null) return basicTypes.null(options);
  if (type === undefined) return basicTypes.undefined(options);

  if (type === Number) return basicTypes.number(options);
  if (type === Boolean) return basicTypes['boolean'](options); //eslint-disable-line dot-notation
  if (type === String) return basicTypes.string(options);

  if (type === RegExp) return regExp(options);
  if (type === Date) return date(options);
  if (type === Error) return error(options);

  if (typeof type === 'object') {
    if (isArray(type)) {
      if (!type.length) {
        return anyObject(options, true);
      } else if (type.length > 1) {
        return union.apply(null, type)(options);
      } else {
        return parseObjectType(options, type, true);
      }
    } else {

      if (functionIsType(type.type)) {
        try {
          let actual = parseType(options, type.type);
          if (type.validate) {
            actual = validate(actual, type.validate)(options);
          }
          if (type.optional) {
            actual = optional(actual)(options);
          }
          return actual;
        } catch (err) {
          //empty
        }
      }

      return parseObjectType(options, type);
    }
  }

  throw new TypeError(`Unknown type ${type}`);
}

