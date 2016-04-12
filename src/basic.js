export function functionIsType(func) {
  return (
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
    is: function(v) {
      return typeof v === 'string';
    },
    defaultValue: ''
  },
  Number: {
    name: 'number',
    is: function(v) {
      return typeof v === 'number';
    },
    defaultValue: 0
  },
  Boolean: {
    name: 'boolean',
    is: function(v) {
      return typeof v === 'boolean';
    },
    defaultValue: false
  },
  Null: {
    name: 'null',
    is: function(v) {
      return v === null;
    },
    defaultValue: null
  },
  Undefined: {
    name: 'undefined',
    is: function(v) {
      return typeof v === 'undefined';
    },
    defaultValue: undefined
  }
};

