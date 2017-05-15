import finalizeType from '../parse/finalize-type';
import parseType from '../parse/parse-type';
import { pathToStr } from '../utils';

export default function constant(constValue) {

  const type = {
    number: Number,
    string: String,
    ['boolean']: Boolean
  }[typeof constValue];

  function Constant(options) {
    const moniker = [...options.typeMoniker];

    if (!type || (constValue !== constValue)) throw new Error(`Currently only number, string and boolean constants are supported for constant "${pathToStr(moniker)}"`);

    const thisType = parseType({
      ...options
    }, type);
    thisType.name = `constant(${constValue})`;

    thisType.validateData = (value, instancePath) => {
      instancePath = instancePath || options.typeMoniker;
      if (value !== constValue) {
        return `Value of "${pathToStr(instancePath)}" data must be ${value}`;
      }
    };

    thisType.coerceData = () => constValue;

    const origValidateAssign = thisType.validateAssign;
    thisType.validateAssign = (value, instancePath) => {
      instancePath = instancePath || options.typeMoniker;
      const message = origValidateAssign(value, instancePath);
      if (message) return message;
      if (value !== constValue) {
        const display = typeof constValue === 'string' ? `"${constValue}"` : String(constValue);
        return `Value of "${pathToStr(instancePath)}" must be ${display}`;
      }
    } ;

    thisType.defaultValue = () => constValue;

    if (thisType.origPack) {
      thisType.pack = thisType.origPack;
      delete type.origPack;
    }

    return finalizeType(thisType);
  }

  Constant.isType = true;
  return Constant;
}

