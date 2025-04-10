import React from 'react'
import PropTypes from 'prop-types'

const Message = ({ message, id }) => (
  <div className={`text-message ${message.sender === id ? 'my-text' : 'other-text'}`}>
    <div className="sender-name">User {message.sender}</div>
    <p className='text'>{message.message}</p>
  </div> 
)

Message.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.string,
    message: PropTypes.string.isRequired,
    sender: PropTypes.number.isRequired,
    conversation_id: PropTypes.string
  }).isRequired,
  id: PropTypes.number.isRequired
}

export default Message