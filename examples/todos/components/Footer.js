import React from 'react';
import Link from './Link';
import connect from 'react-redux-schema';

const link = (filter, type) => (
  <Link active={filter.filter===type.toLowerCase()} onClick={()=>filter.filter = type.toLowerCase()}>
    {type}
  </Link>
);

let Footer = ({ filter }) => (
  <p>
    Show:
    {" "}
    {link(filter, 'All')}
    {", "}
    {link(filter, 'Active')}
    {", "}
    {link(filter, 'Completed')}
  </p>
);

Footer = connect()(Footer);

export default Footer;
