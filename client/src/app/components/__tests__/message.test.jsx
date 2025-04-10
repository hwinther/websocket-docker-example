import React from 'react';
import { render, screen } from '@testing-library/react';
import Message from '../message';

describe('Message Component', () => {
  const mockMessage = {
    message: 'Hello World',
    sender: 1
  };

  test('renders message with my-text class when sender matches id', () => {
    render(<Message message={mockMessage} id={1} />);
    const messageElement = screen.getByText('Hello World');
    expect(messageElement.parentElement).toHaveClass('my-text');
  });

  test('renders message with other-text class when sender does not match id', () => {
    render(<Message message={mockMessage} id={2} />);
    const messageElement = screen.getByText('Hello World');
    expect(messageElement.parentElement).toHaveClass('other-text');
  });

  test('displays the message text correctly', () => {
    render(<Message message={mockMessage} id={1} />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  test('displays the sender name', () => {
    render(<Message message={mockMessage} id={2} />);
    expect(screen.getByText('User 1')).toBeInTheDocument();
  });
});