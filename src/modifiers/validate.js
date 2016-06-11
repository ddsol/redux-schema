import finalizeType from '../parse/finalize-type';
import parseType from '../parse/parse-type';
import SimpExp from 'simpexp';
import { pathToStr } from '../utils';

export default function validate(baseType, validation) {
  function Validate(options) {
    let self          = { options }
      , type          = { ...parseType({ ...options, self: options.self }, baseType) }
      , origValidator = type.validateAssign
      , typeMoniker   = options.typeMoniker
      , regExp
      , origDefault
      , defaultValue
      ;

    if (validation instanceof RegExp) {
      regExp = validation;
      defaultValue = new SimpExp(validation).gen();
      origDefault = type.defaultValue;
      type.defaultValue = () => {
        let value = origDefault();
        return regExp.test(value) ? value : defaultValue;
      };
      validation = value => regExp.test(value) ? null : `Must match ${String(regExp)}`;
    }

    type.validateAssign = function(value, instancePath) {
      let instanceName = pathToStr(instancePath || typeMoniker)
        , message
        ;

      try {
        message = validation(value);
      } catch (err) {
        message = err.message;
      }
      if (message === true) {
        message = null;
      }
      if (message) {
        return `Can't assign "${instanceName}": ${message}`;
      } else {
        return origValidator(value, instancePath);
      }
    };

    if (type.origPack) {
      type.pack = type.origPack;
      type.origPack = undefined;
    }

    return Object.assign(self, finalizeType(type));
  }

  Validate.isType = true;
  return Validate;
}

