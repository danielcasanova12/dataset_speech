import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
import { api } from './services/api';

test('renders public home page', () => {
  jest.spyOn(api, 'heartbeat').mockResolvedValue();
  render(<App />);

  expect(screen.getByRole('heading', { name: /voice singing dataset/i })).toBeInTheDocument();
  expect(screen.getByText(/faça login para começar/i)).toBeInTheDocument();
});
