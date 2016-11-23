import uuidImport from 'uuid';

let uuid = uuidImport.noConflict ? uuidImport.noConflict() : uuidImport;

export function isArray(arr) {
  //Adapted from extend, Copyright (c) 2014 Stefan Thomas, MIT license
  if (typeof Array.isArray === 'function') {
    return Array.isArray(arr);
  }
  return Object.prototype.toString.call(arr) === '[object Array]';
}

export function isPlainObject(obj) {
  //Adapted from extend, Copyright (c) 2014 Stefan Thomas, MIT license
  if (!obj || Object.prototype.toString.call(obj) !== '[object Object]') {
    return false;
  }

  let hasOwnConstructor = Object.prototype.hasOwnProperty.call(obj, 'constructor')
    , hasIsPrototypeOf = obj.constructor && obj.constructor.prototype && Object.prototype.hasOwnProperty.call(obj.constructor.prototype, 'isPrototypeOf')
    , key
    ;

  if (obj.constructor && !hasOwnConstructor && !hasIsPrototypeOf) {
    return false;
  }
  for (key in obj) {/**/}
  return typeof key === 'undefined' || Object.prototype.hasOwnProperty.call(obj, key);
}

export function guid(len) {
  let id = '';
  len = len || 24;

  while (id.length < len) {
    id += uuid.v1().replace(/-/g, '');
  }
  return id.substr(0, len);
}

export let snakeCase = camelCase => String(camelCase).replace(/[A-Z]/g, v=>'_' + v).toUpperCase().replace(/^_/, '');

export function pathToStr(path, delParams) {
  let result = ''
    , item
    ;
  for (let i = 0; i < path.length; i++) {
    item = path[i];
    if (delParams) {
      item = item.replace(/\(.*/, '');
    }
    if (i === 0 || /^[a-z$_][0-9a-z$_]*$/i.test(item)) {
      result += '.' + path[i];
    } else {
      if (String(Math.round(Number(item))) === item) {
        result += `[${item}]`;
      } else {
        result += `[${JSON.stringify(String(item))}]`;
      }
    }
  }
  return result.replace(/^\./, '').replace(/\[\"\*\"\]/g, '[]');
}

export function namedFunction(name, actualFunc, templateFunc, passThrough) {
  if (passThrough) {
    return actualFunc;
  }
  if (!templateFunc) {
    templateFunc = actualFunc;
  }

  let f = actualFunc // eslint-disable-line
    , funcText
    , signature
    , func
    ;

  if (typeof actualFunc !== 'function') throw new TypeError('Parameter to namedFunction must be a function');

  funcText = templateFunc.toString();

  signature = /\([^\)]*\)/.exec(funcText)[0];

  funcText = funcText.replace(/^[^{]+\{|}$/g, '');

  func = eval(`(function(){function ${name + signature}{/*${funcText.replace(/\*\//g, '* /')}*/return f.apply(this,arguments);}return ${name}}())`); // eslint-disable-line
  func.toString = function() {
    return `function ${name + signature}{${funcText}}`;
  };
  return func;
}

export function toObject(value) {

  let seenValues  = []
    , seenObjects = []
    ;

  function internal(value) {
    if ((value instanceof Date) || (value instanceof RegExp) || (value instanceof Error)) return value;
    if (typeof value !== 'object' || !value) return value;
    if (!('keys' in value) || !('_meta' in value)) return value;
    if (value._meta.type.kind === 'array') return value.slice().map(v => internal(v));
    let result = {}
      , ix     = seenValues.indexOf(value)
      ;

    if (ix !== -1) {
      return seenObjects[ix];
    }

    seenValues.push(value);
    seenObjects.push(result);

    value.keys.forEach(key => {
      result[key] = internal(value.get(key));
    });
    return result;
  }

  return internal(value);
}

export function dedent(strings, ...args) {
  let string = strings
    .map((str, i) => (i === 0 ? '' : args[i - 1]) + str)
    .join('')
    , match = /^\n( *)/.exec(string)
    , len
    , replace
    ;

  if (!match) return string;

  len = match[1].length;

  replace = new RegExp(`\\n {${len}}`,'g');

  return string.replace(replace, '\n').substr(1);
}

export function isGenerator(obj) {
  return  typeof obj.next === 'function' && typeof obj.throw === 'function';
}

export function isGeneratorFunction(obj) {
  var constructor = obj.constructor;
  if (!constructor) return false;
  if (constructor.name === 'GeneratorFunction' || constructor.displayName === 'GeneratorFunction') return true;
  return isGenerator(constructor.prototype);
}

