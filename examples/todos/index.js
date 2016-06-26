import 'babel-polyfill';
import React from 'react';
import { render } from 'react-dom';
import store from './schema-store';
import App from './components/App';

render(
  <App root={store.instance}/>,
  document.getElementById('root')
);
