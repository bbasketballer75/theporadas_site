import React from 'react';

export default function Greeting({ name = 'Guest' }) {
  return <div className="greeting">Hello, {name}!</div>;
}
