import union from './union';
const Any = union(Object, Array, null, undefined, Number, Boolean, String);
export default Any;
