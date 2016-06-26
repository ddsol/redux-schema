import React from 'react';
import AddTodo from './AddTodo';
import TodoList from './TodoList';
import Footer from './Footer';
import connect from 'react-redux-schema';

let App = ({root}) => (
  <div>
    <AddTodo todos={root.todos} />
    <TodoList todos={root.todos} filter={root.filter} />
    <Footer filter={root}/>
  </div>
);

App = connect()(App);

export default App;
