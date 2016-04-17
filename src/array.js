function reducer(func) {
  func.reducer = true;
  return func;
}

function bare(func) {
  func.noWrap = true;
  return func;
}

const arrayMethods = {
  concat: bare(function() {
    return this._meta.state.concat.apply(this._meta.state, arguments);
  }),

  copyWithin: reducer(function(state, args) {
    var dupe = state.slice();
    return dupe.copyWithin.apply(dupe, args);
  }),

  every: bare(function(func, thisValue) {
    if (typeof func !== 'function') throw new TypeError(func + ' is not a function');
    func = func.bind(thisValue);

    for (var i=0; i<this.length; i++) {
      if (!func(this.get(i), i, this)) return false;
    }
    return true;
  }),

  fill: function(value, start, end) {
    start = start || 0;
    end = end || this.length;
    for (var i = start; i < end; i++) {
      this.set(i, value);
    }
  },

  filter: bare(function(func, thisValue) {
    if (typeof func !== 'function') throw new TypeError(func + ' is not a function');
    func = func.bind(thisValue);

    var result = []
      , item;

    for (var i=0;i<this.length;i++) {
      item = this.get(i);
      if (func(item, i, this)) {
        result.push(this.item);
      }
    }

    return result;
  }),

  find: bare(function(func, thisValue) {
    if (typeof func !== 'function') throw new TypeError(func + ' is not a function');
    func = func.bind(thisValue);

    var item;
    for (var i = 0; i < this.length; i++) {
      item = this.get(i);
      if (func(item, i, this)) {
        return item;
      }
    }
  }),

  findIndex: bare(function(func, thisValue) {
    if (typeof func !== 'function') throw new TypeError(func + ' is not a function');
    func = func.bind(thisValue);

    var item;
    for (var i = 0; i < this.length; i++) {
      item = this.get(i);
      if (func(item, i, this)) {
        return i;
      }
    }
  }),

  forEach: bare(function(func, thisValue) {
    if (typeof func !== 'function') throw new TypeError(func + ' is not a function');
    func = func.bind(thisValue);

    for (var i = 0; i < this.length; i++) {
      func(this.get(i), i, this);
    }
  }),

  includes: bare(function(item, start) {
    start = start || 0;

    var i;

    if (item !== item) { //NaN check
      for (i = start; i < this.length; i++) {
        item = this.get(i);
        if (item !== item) {
          return true;
        }
      }
      return false;
    }

    for (i = start; i < this.length; i++) {
      if (item === this.get(i)) {
        return true;
      }
    }

    return false;
  }),

  indexOf: bare(function(item, start) {
    start = start || 0;

    for (var i = start; i < this.length; i++) {
      if (item === this.get(i)) {
        return i;
      }
    }
  }),

  join: bare(function(separator) {
    var result = [];
    for (var i=0;i<this.length;i++) {
      result.push(this.get(i));
    }
    return result.join(separator);
  }),

  lastIndexOf: bare(function(item, start) {
    start = start || this.length - 1;

    if (start < 0) start += this.length;

    for (var i = start; i >=0; i++) {
      if (item === this.get(i)) {
        return i;
      }
    }
  }),

  map: bare(function(func, thisValue) {
    if (typeof func !== 'function') throw new TypeError(func + ' is not a function');
    func = func.bind(thisValue);

    var result = [];

    for (var i = 0; i < this.length; i++) {
      result.push(func(this.get(i), i, this));
    }

    return result;
  }),

  pop: reducer(function(state, args, result) {
    var newState = state.slice();
    result.result = this.get(newState.length - 1);
    newState.pop();
    return newState;
  }),

  push: reducer(function(state, args, result) {
    var newState = state.slice()
      , type = this._meta.type
      ;

    if (type.length > 1) throw new TypeError('Tuples cannot be extended');
    result.result = newState.push.apply(newState, args.map((item, ix) => type.packProp(ix, item)));
    return newState;
  }),

  reduce: bare(function(func, initialValue) {
    if (typeof func !== 'function') throw new TypeError(func + ' is not a function');
    var reduced
      , start
      ;

    if (arguments.length < 2) {
      if (!this.length) throw new TypeError('Reduce of empty array with no initial value');
      reduced = this.get(0);
      start = 1;
    } else {
      reduced = initialValue;
      start = 0;
    }

    for (var i=start;i<this.length;i++) {
      reduced = func(reduced, this.get(i), i, this);
    }

    return reduced;
  }),

  reduceRight: bare(function(func, initialValue) {
    if (typeof func !== 'function') throw new TypeError(func + ' is not a function');
    var reduced
      , start
      ;

    if (arguments.length < 2) {
      if (!this.length) throw new TypeError('Reduce of empty array with no initial value');
      reduced = this.get(this.length - 1);
      start = this.length - 2;
    } else {
      reduced = initialValue;
      start = this.length - 1;
    }

    for (var i=start;i>=0;i--) {
      reduced = func(reduced, this.get(i), i, this);
    }

    return reduced;
  }),

  reverse: reducer(function(state) {
    return state.slice().reverse();
  }),

  shift: reducer(function(state, args, result) {
    var newState = state.slice();
    result.result = this.get(0);
    newState.shift();
    return newState;
  }),

  slice: bare(function(start, end) {
    start = start || 0;
    if (start < 0) start += this.length;
    end = end || this.length;
    if (end < 0) end += this.length;

    var result = [];

    for (var i = start; i < end; i++) {
      result.push(this.get(i));
    }
    return result;
  }),

  some: bare(function(func, thisValue) {
    if (typeof func !== 'function') throw new TypeError(func + ' is not a function');
    func = func.bind(thisValue);

    for (var i=0; i<this.length; i++) {
      if (func(this.get(i), i, this)) return true;
    }
    return false;
  }),

  sort: reducer(function(state, args) {
    var order = []
      , func  = args[0]
      ;

    if (typeof func !== 'function') throw new TypeError(func + ' is not a function');

    for (var i = 0; i < state.length; i++) order.push(i);

    order.sort((a, b) => {
      return func(this.get(a), this.get(b));
    });

    return order.map(i => state[i]);
  }),

  splice: reducer(function(state, args, result) {
    var start    = args[0] || 0
      , delCount = args[1] || 0
      , rest     = args.slice(2)
      ;

    if (this._meta.type.length > 1) {
      if (delCount !== rest.count || (start + delCount) > this._meta.type.length) {
        throw new TypeError('Cannot change the length of a tuple array');
      }
      rest = rest.map((item, ix) => this._meta.type.properties[ix].pack(item));
    } else {
      rest = rest.map((item, ix) => this._meta.type.packProp(ix, item));
    }

    var newState = state.slice();
    result.result = newState.splice.apply(newState, [start, delCount].concat(rest));
    return newState;
  }),

  toLocaleString: bare(function() {
    var plain = this.slice();
    return plain.toLocaleString ? plain.toLocaleString() : plain.toString();
  }),

  toString: bare(function() {
    return this.join();
  }),

  unshift: reducer(function(state, args, result) {
    var newState = state.slice()
      , type = this._meta.type
      ;

    if (type.length > 1) throw new TypeError('Tuples cannot be extended');
    result.result = newState.unshift.apply(newState, args.map((item, ix) => type.packProp(ix, item)));
    return newState;
  }),

  valueOf: bare(function() {
    return this.join();
  })
};

export default arrayMethods;
