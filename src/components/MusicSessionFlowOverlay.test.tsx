import React from 'react';
import { render, screen } from '@testing-library/react';
import MusicSessionFlowOverlay from './MusicSessionFlowOverlay';

test('shows the countdown and then keeps feedback visible while uploading', () => {
  const { rerender } = render(
    <MusicSessionFlowOverlay
      countdown={3}
      label="Salvando e avançando"
      message="Preparando o áudio."
      phase="countdown"
    />,
  );

  expect(screen.getByRole('status')).toHaveTextContent('3');
  expect(screen.getByRole('status')).toHaveTextContent('Salvando e avançando');

  rerender(
    <MusicSessionFlowOverlay
      countdown={null}
      label={null}
      message="Preparando o áudio."
      phase="uploading"
    />,
  );

  expect(screen.getByRole('status')).toHaveTextContent('Enviando gravação');
  expect(screen.getByRole('status')).toHaveTextContent('Aguarde a confirmação do servidor');
});

test('does not render when no transition is active', () => {
  render(
    <MusicSessionFlowOverlay
      countdown={null}
      label={null}
      message=""
    />,
  );

  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('shows only the countdown while advancing to the next phrase', () => {
  const { rerender } = render(
    <MusicSessionFlowOverlay
      countdown={3}
      label="Salvando e avançando"
      message="Mensagem que não deve aparecer."
      phase="countdown"
      countdownOnly
    />,
  );

  expect(screen.getByRole('status')).toHaveTextContent('3');
  expect(screen.queryByText('Salvando e avançando')).not.toBeInTheDocument();
  expect(screen.queryByText('Mensagem que não deve aparecer.')).not.toBeInTheDocument();

  rerender(
    <MusicSessionFlowOverlay
      countdown={null}
      label={null}
      message="Mensagem que não deve aparecer."
      phase="uploading"
      countdownOnly
    />,
  );

  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
