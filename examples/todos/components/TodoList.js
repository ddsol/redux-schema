import React from 'react';
import Todo from './Todo';
import connect from 'react-redux-schema';

let TodoList = ({ todos, filter }) => (
  <ul>
    {todos.all.filter(todo => filter === 'all' || (filter === 'completed') === todo.completed).map(todo =>
      <Todo
        key={todo.id}
        todo={todo}
      />
    )}
  </ul>
);

TodoList = connect()(TodoList);

export default TodoList;
