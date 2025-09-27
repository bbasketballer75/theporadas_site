import React from 'react';
import { render } from '@testing-library/react';
import Greeting from '../src/components/Greeting';

test('renders greeting and matches snapshot', () => {
  const { container, getByText } = render(<Greeting name="Austin" />);
  expect(getByText('Hello, Austin!')).toBeInTheDocument();
  expect(container).toMatchSnapshot();
});
