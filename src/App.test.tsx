// F
import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app header', () => {
  render(<App />);
  const headerElement = screen.getByText(/Voice Singing Dataset/i);
  expect(headerElement).toBeInTheDocument();
});