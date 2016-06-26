import { createStore } from 'redux';
import reduxSchemaStore, { type, collection, validate, model } from 'redux-schema';

const schema = type({
  todos: collection(model('todo', {
    text: String,
    completed: Boolean
  })),
  filter: validate(String, /all|active|completed/)
});

export default reduxSchemaStore(schema, { debug: true }, createStore, undefined, window.devToolsExtension ? window.devToolsExtension() : f => f);
