export default function bare(func) {
  func.noWrap = true;
  return func;
}

