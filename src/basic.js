export function functionIsType(func) {
  return func && (
    func === String
    || func === Number
    || func === Boolean
    || func === Error
    || func === RegExp
    || func === Date
    || func === Array
    || func === Object
    || func.isType === true
  );
}

export const basicTypes = {
  String: {
    name: 'string',
    is: v => typeof v === 'string',
    defaultValue: ''
  },
  Number: {
    name: 'number',
    is: v => typeof v === 'number',
    defaultValue: 0
  },
  Boolean: {
    name: 'boolean',
    is: v => typeof v === 'boolean',
    defaultValue: false
  },
  Null: {
    name: 'null',
    is: v => v === null,
    defaultValue: null
  },
  Undefined: {
    name: 'undefined',
    is: v => typeof v === 'undefined',
    defaultValue: undefined
  }
};

