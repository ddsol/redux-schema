export default function reducer(func) {
  func.reducer = true;
  return func;
}
