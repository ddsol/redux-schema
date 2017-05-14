import { snakeCase, pathToStr } from './utils';
import deepMerge from 'deepmerge';

const freeze = Object.freeze ? Object.freeze.bind(Object) : () => {};

export default class Store {
  constructor(options) {
    function error() {
      throw new Error('Schema Store has no Redux Store assigned');
    }

    let { schema, ... newOptions } = {
      typeMoniker: [],
      skipWriteSame: false,
      ...options,
      store: this
    };

    options = newOptions;

    if (options.debug) {
      options.freeze = true;
      options.validate = true;
      options.namedFunctions = true;
    }

    if (!schema || !schema.isType) {
      throw new Error('Missing schema in Store options');
    }

    this.result = undefined;
    this.internalState = undefined;
    this.reducer = this.reducer.bind(this);
    this.store = {
      dispatch: error,
      getState: error
    };
    this.options = options;
    this.schema = schema(options);
    this.maxCache = 1024;
    this.cache = {};
    this.cachePaths = [];
    this.record = null;
    this.recordStack = [];
    this.traceSuspended = 0;
  }

  setVirtual(obj, actionType, instancePath, setter, value) {
    let action = {
      type: actionType,
      path: instancePath,
      arg: value
    };

    if (this.internalState === undefined) {
      this.store.dispatch(action);
      let result = this.result;
      this.result = undefined;
      return result;
    } else {
      if (this.verifyAction && this.verifyAction.type !== actionType) return;
      this.verifyAction = null;
      return setter.apply(obj, [value]);
    }
  }

  invoke(obj, actionType, instancePath, method, args) {
    let self   = this
      , action = {
          type: actionType,
          path: instancePath,
          args: args
        }
      , currentState
      , newState
      , result
      , arg
      , ix
      ;

    function argResolved(value) {
      args = args.slice();
      args[ix] = value;
      return self.invoke(obj, actionType, instancePath, method, args);
    }

    if (method.autoResolve) {
      for (ix = 0; ix < args.length; ix++) {
        arg = args[ix];
        if (arg && typeof arg === 'object' && typeof arg.then === 'function') {
          return arg.then(argResolved);
        }
      }
    }

    if (this.internalState === undefined) {
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
        return obj;
      }
      return method.apply(obj, args);
    }
  }

  put(path, value) {
    this.checkRecord();

    if (this.options.skipWriteSame) {
      if (this.get(path) === value) return;
    }

    let action = {
      type: `SET_${this.propActionFromPath(path) || 'ROOT'}`,
      path: path,
      value: value
    };

    if (this.internalState === undefined) {
      this.store.dispatch(action);
      let result = this.result;
      this.result = undefined;
      return result;
    } else {
      return this.executeAction(action);
    }
  }

  get(path) {
    this.recordRead(path);
    let toGo    = path.slice()
      , current = this.getActiveState()
      ;
    while (current && toGo.length) {
      current = current[toGo.shift()];
    }
    return current;
  }

  reducer(state, action) {
    if (state === undefined) {
      state = this.schema.defaultValue();
    }
    if (!action.path) return state;
    this.internalState = state;
    try {
      this.result = this.executeAction(action);
      state = this.internalState;
      if (this.options.freeze) {
        freeze(state);
      }
    } finally {
      this.internalState = undefined;
    }
    return state;
  }

  getActiveState() {
    if (this.internalState !== undefined) {
      return this.internalState;
    }
    return this.store.getState();
  }

  executeAction(action) {

    function updateProperty(state, path, value) {
      if (!path.length) return value;
      let name    = path[0]
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
        newState = { ...state };
        if (updated === undefined) {
          delete newState[name];
        } else {
          newState[name] = updated;
        }
        return newState;
      }
    }

    let path = action.path.slice()
      , methodOrPropName
      , instance
      , result
      ;

    if ('value' in action && action.type === `SET_${this.propActionFromPath(path) || 'ROOT'}`) {
      this.checkRecord();
      this.internalState = updateProperty(this.internalState, path, action.value);
    } else {
      methodOrPropName = path.pop();
      try {
        instance = this.traversePath(path);
      } catch (err) {
        if (/_CONSTRUCTOR$/.test(action.type) && /not found in state/.test(err.message) && action.args) {
          this.put(action.path.slice(0, -1), {});
          instance = this.traversePath(path);
        } else {
          throw err;
        }
      }

      this.verifyAction = action;
      if (action.args) {
        result = instance[methodOrPropName].apply(instance, action.args);
      } else {
        result = instance[methodOrPropName] = action.arg;
      }
      this.verifyAction = null;
    }
    return result;
  }

  traversePath(path) {
    let toGo    = path.slice()
      , current = this.instance
      ;
    while (current && toGo.length) {
      current = current.get(toGo.shift());
    }
    if (!current) {
      throw new Error(`Path "${path.join('.')}" not found in state.`);
    }
    return current;
  }

  unpack(type, storePath, instancePath, currentInstance, owner) {
    let path
      , cached
      , result
      , ix
      ;
    result = type.unpack(this, storePath, instancePath, currentInstance, owner);
    if (!result || typeof result !== 'object') return result;

    path = pathToStr(instancePath);
    cached = this.cache[path];
    if (cached && !currentInstance && result._meta && result._meta.options && result._meta.options.typeMoniker.join('.') === cached._meta.options.typeMoniker.join('.')) {
      ix = this.cachePaths.indexOf(path);
      if (ix !== -1) {
        this.cachePaths.splice(ix, 1);
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
  }

  recordRead(path) {
    if (!this.record) return;
    let reg  = this.record
      ;

    for (let i = 0; i < path.length; i++) {
      let prop = path[i];

      if (!reg.children[prop]) {
        reg.children[prop] = { children: {} };
      }
      reg = reg.children[prop];
    }

    reg.check = true;
  }

  startRecord() {
    if (this.record && !this.traceSuspended) {
      this.recordStack.push(this.record);
    }
    this.record = { children: {} };
    var current = this.record;
    if (this.options.debug) {
      var traceError = new Error('startRecord called without a matching stopRecord');
      process.nextTick(() => {
        if (this.record === current) {
          throw traceError;
        }
      });
    }
  }

  stopRecord(remove) {
    let result = this.record
      , parent = this.recordStack.pop()
      ;

    if (!remove && parent) {
      deepMerge(parent, result);
    }

    if (parent) {
      this.record = parent;
    } else {
      this.record = null;
    }

    function readState(record, state) {
      let result = {
        state,
        children: {},
        check: record.check
      };

      Object.keys(record.children).forEach(prop => result.children[prop] = readState(record.children[prop], state[prop]));

      return result;
    }

    return readState(result, this.state);
  }

  sameRecordedState(snapshot) {
    function compareState(snapshot, snapShotState, state) {
      if (state === snapShotState) return true;
      if (snapshot.check) {
        if (!state || !snapShotState || typeof state !== 'object' || typeof snapShotState !== 'object') return false;
        //Only compare this object itself, which only includes the names of the properties. Their values have their own trackers.
        for (let prop in state) if (!(prop in snapShotState)) return false;
        for (let prop in snapShotState) if (!(prop in state)) return false;
      }
      return Object.keys(snapshot.children).every(prop => snapShotState && state && compareState(snapshot.children[prop], snapShotState[prop], state[prop]));
    }

    return compareState(snapshot, snapshot.state, this.state);
  }

  trace(func, remove) {
    let result;
    this.startRecord();
    try {
      func();
    } finally {
      result = this.stopRecord(remove);
    }
    return result;
  }

  suspendTrace(func) {
    this.traceSuspended++;
    try {
      func();
    } finally {
      this.traceSuspended--;
    }
  }

  checkRecord() {
    if (this.record) {
      throw new Error('Cannot write state while in read recording mode');
    }
  }

  propActionFromPath(path) {
    return snakeCase(pathToStr(this.schema.getTypeFromPath(path)).replace(/\./g,'_'));
  }

  get instance() {
    if (!this._instance) {
      this._instance = this.unpack(this.schema, [], []);
    }
    return this._instance;
  }

  set instance(value) {
    this.put([], this.schema.pack(value));
  }

  get state() {
    return this.getActiveState();
  }

  set state(value) {
    let message = this.schema.validateData(value);
    if (message) throw new TypeError(`Can't assign state: ${message}`);
    this.put([], value);
  }

  get dispatch() {
    return this.store.dispatch;
  }

  set dispatch(value) {
    this.store.dispatch = value;
  }

  get models() {
    return this.instance.models;
  }

  get isStore() {
    return true;
  }
}
