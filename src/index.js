//Export types
export { default as union } from './types/union';
export { default as tuple } from './types/tuple';
export { default as Any } from './types/any';
export { default as Nil } from './types/nil';
export { default as reference } from './types/reference';
export { default as ObjectId } from './types/object-id';
export { default as collection } from './types/collection';
export { default as collections } from './types/collections';
export { default as model, makeOwner } from './types/model';

//Export modifiers
export { default as optional } from './modifiers/optional';
export { default as validate } from './modifiers/validate';
export { default as bare } from './modifiers/bare';
export { default as reducer } from './modifiers/reducer';
export { default as wrapGenerator } from './modifiers/wrap-generator';
export { default as autoResolve } from './modifiers/auto-resolve';

//Export generic type parser
export { default as type } from './parse/type';

import Store from './store';

export default function reduxSchemaStore(schema, options, createStore, preloadedState, enhancer) {
  let result = createStore => (reducer, preloadedState, enhancer) => {
    let store = new Store({ schema: schema, ...options })
      , redux
      ;

    if (preloadedState !== undefined) {
      let message = store.schema.validateData(preloadedState);
      if (message) throw new TypeError(`Can't use preloaded state: ${message}`);
    }

    if (reducer) {
      let customReducer = reducer;
      reducer = (state, action) => customReducer(store.reducer(state, action), action);
    } else {
      reducer = store.reducer;
    }

    redux = createStore(reducer, preloadedState, enhancer);

    store.getState = redux.getState;
    store.replaceReducer = redux.replaceReducer;
    store.subscribe = redux.subscribe;

    store.store = redux;

    return store;
  };

  return createStore ? result(createStore)(null, preloadedState, enhancer): result;
}
