import packVerify from './pack-verify';

export default function finalizeType(type) {
  let options = type.options;
  if (options.validate || options.freeze) {
    packVerify(type);
  }
  return type;
}

