export default function autoResolve(func) {
  func.autoResolve = true;
  return func;
}
