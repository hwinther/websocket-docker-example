import React from 'react';
import { Message as MessageType } from '../../types';

interface MessageProps {
  message: MessageType;
  id: number;
}

const Message: React.FC<MessageProps> = ({ message, id }) => (
  <div className={`text-message ${message.sender === id ? 'my-text' : 'other-text'}`}>
    <div className="sender-name">User {message.sender}</div>
    <p className='text'>{message.message}</p>
  </div> 
);

export default Message;