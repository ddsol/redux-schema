import extend from 'extend';
import { snakeCase, pathToStr } from './utils';

export default function Store(options) {
  function error() {
    throw new Error('schema Store has no redux store assigned');
  }

  this.result = undefined;
  this.state = undefined;
  this.reducer = this.reducer.bind(this);
  this.store = {
    dispatch: error,
    getState: error
  };
  this.options = options;
  this.root = this.options.schema;
  this.maxCache = 1024;
  this.cache = {};
  this.cachePaths = [];
}

Store.prototype.setVirtual = function(obj, actionType, instancePath, setter, value) {
  var action = {
    type: actionType,
    path: instancePath,
    value: value
  };

  if (this.state === undefined) {
    this.store.dispatch(action);
    var result = this.result;
    this.result = undefined;
    return result;
  } else {
    if (this.verifyAction && this.verifyAction.type !== actionType) return;
    this.verifyAction = null;
    return setter.apply(obj, [value]);
  }
};

Store.prototype.invoke = function(obj, actionType, instancePath, method, args) {
  var action = {
        type: actionType,
        path: instancePath,
        args: args
      }
    , result
    , currentState
    , newState
    ;

  if (this.state === undefined) {
    this.store.dispatch(action);
    result = this.result;
    this.result = undefined;
    return result;
  } else {
    if (this.verifyAction && this.verifyAction.type !== actionType) return;
    this.verifyAction = null;
    if (method.reducer) {
      result = {};

      currentState = this.get(obj._meta.storePath);

      newState = method.call(obj, currentState, args, result);

      if (currentState !== newState) {
        this.put(obj._meta.storePath, newState);
      }
      if ('result' in result) return result.result;
      return this;
    }
    return method.apply(obj, args);
  }
};

function propActionFromPath(path) {
  var base = path.slice();
  base.splice(1, 1);
  return base.map(snakeCase).join('_');
}

Store.prototype.put = function(path, value) {
  var action = {
    type: 'SET_' + propActionFromPath(path),
    path: path,
    value: value
  };

  if (this.state === undefined) {
    this.store.dispatch(action);
    var result = this.result;
    this.result = undefined;
    return result;
  } else {
    return this.executeAction(action);
  }
};

Store.prototype.get = function(path) {
  var toGo    = path.slice()
    , current = this.getState()
    ;
  while (current && toGo.length) {
    current = current[toGo.shift()];
  }
  return current;
};

Store.prototype.reducer = function(state, action) {
  if (!this.root) throw new TypeError('This store has no root schema attached');
  if (state === undefined) {
    state = this.root ? this.root.defaultValue() : {}; //This should include all the collections...
  }
  if (!action.path) return state;
  this.state = state;
  this.result = this.executeAction(action);
  state = this.state;
  this.state = undefined;
  Object.freeze(state);
  return state;
};

Store.prototype.getState = function() {
  if (this.state !== undefined) {
    return this.state;
  }
  return this.store.getState();
};

Store.prototype.executeAction = function(action) {

  function updateProperty(state, path, value) {
    if (!path.length) return value;
    var name    = path[0]
      , prop    = state[name]
      , updated = updateProperty(prop, path.slice(1), value)
      , newState
      ;

    if (updated === prop) return state;

    if (Array.isArray(state) && /^\-?\d+$/.test(name)) {
      newState = state.slice();
      newState[Number(name)] = updated;
      return newState;
    } else {
      if (Array.isArray(state)) {
        if (name === 'length') {
          newState = state.slice();
          newState.length = updated;
          return newState;
        }
        throw new Error('Property put does not support extra properties on Arrays');
      }
      newState = extend({}, state);
      if (updated === undefined) {
        delete newState[name];
      } else {
        newState[name] = updated;
      }
      return newState;
    }
  }

  var path = action.path.slice()
    , methodOrPropName
    , instance
    , result
    ;

  if ('value' in action && action.type === 'SET_' + propActionFromPath(path)) {
    this.state = updateProperty(this.state, path, action.value);
  } else {
    methodOrPropName = path.pop();
    instance = this.traversePath(path);

    this.verifyAction = action;
    if (action.args) {
      result = instance[methodOrPropName].apply(instance, action.args);
    } else {
      result = instance[methodOrPropName] = action.value;
    }
    this.verifyAction = null;
  }
  return result;
};

Store.prototype.traversePath = function(path) {
  var toGo    = path.slice()
    , current = this.rootInstance
    ;
  while (current && toGo.length) {
    current = current.get(toGo.shift());
  }
  if (!current) {
    throw new Error('Path "' + path.join('.') + '" not found in state.');
  }
  return current;
};

Store.prototype.unpack = function(type, storePath, instancePath, currentInstance) {
  var path
    , cached
    , result
    , ix
    ;
  result = type.unpack(this, storePath, instancePath, currentInstance);
  if (!result || typeof result !== 'object') return result;

  path = pathToStr(instancePath);
  cached = this.cache[path];
  if (cached && !currentInstance && result._meta && result._meta.type === cached._meta.type) {
    ix = this.cachePaths.indexOf(path);
    if (ix!==-1) {
      this.cachePaths.splice(ix,1);
    }
    this.cachePaths.push(path);
    return cached;
  }

  this.cache[path] = result;
  this.cachePaths.push(path);
  if (this.cachePaths.length > this.maxCache) {
    delete this.cache[this.cachePaths.shift()];
  }
  return result;
};

Object.defineProperties(Store.prototype, {
  rootInstance: {
    enumerable: false,
    get: function() {
      if (!this.root) throw new TypeError('This store has no root schema attached');
      if (!this._rootInstance) {
        this._rootInstance = this.unpack(this.root, [], []);
      }
      return this._rootInstance;
    }
  },
  isStore: {
    enumerable: true,
    value: true
  }
});
