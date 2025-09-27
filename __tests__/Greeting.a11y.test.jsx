import React from 'react';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import Greeting from '../src/components/Greeting';

test('Greeting component is accessible', async () => {
  const { container } = render(<Greeting name="Austin" />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
