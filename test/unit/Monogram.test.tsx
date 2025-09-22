import { render } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { Monogram } from '../src/components/Monogram/Monogram';

describe('Monogram', () => {
  it('renders null (placeholder component) without crashing', () => {
    const { container } = render(<Monogram />);
    expect(container.firstChild).toBeNull();
  });
});
