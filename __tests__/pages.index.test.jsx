import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import Home from '../pages/index';

describe('Pages - Index', () => {
  test('renders key headings and hero content', () => {
    const { getByText, getByRole } = render(<Home />);
    expect(getByText("Austin & Jordyn's Wedding")).toBeInTheDocument();
    expect(getByText('Event Details')).toBeInTheDocument();
    const iframe = getByRole('document', { name: /Venue Map/i });
    expect(iframe).toBeInTheDocument();
  });

  test('Explore Our Story button is present and responds to mouse events', () => {
    const { getByText } = render(<Home />);
    const button = getByText(/Explore Our Story/i);
    expect(button).toBeInTheDocument();
    // simulate hover (mouseEnter/mouseLeave) to ensure no runtime error
    fireEvent.mouseEnter(button);
    fireEvent.mouseLeave(button);
    expect(button).toBeInTheDocument();
  });
});
