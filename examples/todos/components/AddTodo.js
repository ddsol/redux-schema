import React from 'react';
import connect from 'react-redux-schema';

let AddTodo = ({ todos }) => {
  let input;
  return (
    <div>
      <form onSubmit={e => {
        e.preventDefault();
        if (!input.value.trim()) {
          return;
        }
        todos.create({ text: input.value });
        input.value = '';
      }}>
        <input ref={node => {
          input = node;
        }} />
        <button type="submit">
          Add Todo
        </button>
      </form>
    </div>
  );
};

AddTodo = connect()(AddTodo);

export default AddTodo;
