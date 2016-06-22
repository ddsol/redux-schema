import { isGeneratorFunction } from '../utils';

export default function wrapGenerator(func, wrapper) {
  if (!isGeneratorFunction(func)) {
    throw new TypeError(`wrapGenerator requires a generator function`);
  }
  func.wrapGenerator = wrapper || true;
  return func;
}

