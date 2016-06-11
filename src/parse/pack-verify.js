const freeze = Object.freeze ? Object.freeze.bind(Object) : () => {};

export default function packVerify(type) {
  type.origPack = type.pack;
  type.pack = function(value) {
    let options = type.options
      , packed
      ;
    if (options.validate) {
      let message = type.validateAssign(value);
      if (message) {
        throw new TypeError(message);
      }
    }
    packed = type.origPack(value);
    if (options.freeze) {
      freeze(packed);
    }
    return packed;
  };
}

