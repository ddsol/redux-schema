//Export types
export { default as union } from './types/union';
export { default as Any } from './types/any';
export { default as Nil } from './types/nil';
export { default as reference } from './types/reference';
export { default as ObjectId } from './types/object-id';
export { default as collection } from './types/collection';
export { default as collections } from './types/collections';
export { default as model } from './types/model';

//Export modifiers
export { default as optional } from './modifiers/optional';
export { default as validate } from './modifiers/validate';
export { default as bare } from './modifiers/bare';
export { default as reducer } from './modifiers/reducer';
export { default as autoResolve } from './modifiers/auto-resolve';

//Export generic type parser
export { default as type } from './parse/type';

import Store from './store';

export default function reduxSchemaStore(schema, options, createStore) {
  let result = createStore => {
    let store = new Store({ schema: schema,...options })
      , redux = createStore(store.reducer)
      ;

    store.getState = redux.getState;
    store.replaceReducer = redux.replaceReducer;
    store.subscribe = redux.subscribe;

    store.store = redux;

    return store;
  };

  return createStore ? result(createStore): result;
}
