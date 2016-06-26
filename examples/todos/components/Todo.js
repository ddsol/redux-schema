import React from 'react';
import connect from 'react-redux-schema';

let Todo = ({ todo }) => (
  <li
    onClick={() => todo.completed = !todo.completed}
    style={{
      textDecoration: todo.completed ? 'line-through' : 'none'
    }}
  >
    {todo.text}
  </li>
);

Todo = connect()(Todo);

export default Todo;
