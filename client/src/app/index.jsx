import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";

import Message from "./components/message.jsx";
import "./styles.css";
import * as actions from "../redux/actions";
import WebSocketService from "../redux/websocket";

const mapStateToProps = (state) => ({ chat: state.chat });
const mapDispatchToProps = (dispatch) => bindActionCreators(actions, dispatch);

function Home({ chat, openConnection, sendMessage, startConversation, setActiveConversation }) {
  const [message, setMessage] = useState("");
  const [newConversationName, setNewConversationName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const textArea = useRef(null);

  useEffect(() => {
    openConnection({ id: chat.id });
    return () => {
      WebSocketService.disconnect();
    };
  }, []);

  useEffect(() => {
    if (textArea.current) {
      textArea.current.scrollTop = textArea.current.scrollHeight;
    }
  }, [chat.conversations]);

  const onChange = (event) => {
    setMessage(event.target.value);
  };

  const send = () => {
    if (message && chat.connected && chat.activeConversationId) {
      sendMessage(message, chat.activeConversationId);
      setMessage("");
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      send();
    }
  };

  const handleCreateChat = () => {
    if (newConversationName && selectedUsers.length > 0 && chat.connected) {
      startConversation(newConversationName, selectedUsers);
      setNewConversationName("");
      setSelectedUsers([]);
      setShowNewChat(false);
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const activeConversation = chat.conversations.find(c => c.id === chat.activeConversationId);
  const messages = activeConversation?.messages || [];

  return (
    <div className="parent">
      <h2>Welcome User {chat.id}</h2>
      
      <div className="chat-container">
        <div className="sidebar">
          <button className="new-chat-btn" onClick={() => setShowNewChat(true)}>
            New Chat
          </button>
          
          <div className="conversations-list">
            {chat.conversations.map(conv => (
              <div 
                key={conv.id} 
                className={`conversation-item ${conv.id === chat.activeConversationId ? 'active' : ''}`}
                onClick={() => setActiveConversation(conv.id)}
              >
                <span>{`${conv.name} - Chat with ${conv.participants.filter(id => id !== chat.id).join(', ')}`}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chat-box">
          <div className="text-area" ref={textArea}>
            {messages.map((m) => (
              <Message key={m.id} message={m} id={chat.id} />
            ))}
          </div>

          <div className="input-container">
            <input
              className="input"
              value={message}
              name="message"
              onChange={onChange}
              placeholder={activeConversation ? "Type a message..." : "Select a conversation"}
              onKeyDown={handleKeyDown}
              disabled={!activeConversation}
            />
            <button 
              type="button" 
              className="button" 
              onClick={send}
              disabled={!activeConversation}
            >
              Send!
            </button>
          </div>
        </div>
      </div>

      {showNewChat && (
        <div className="modal">
          <div className="modal-content">
            <h3>Start New Conversation</h3>
            <input
              className="input"
              value={newConversationName}
              onChange={(e) => setNewConversationName(e.target.value)}
              placeholder="Conversation Name"
            />
            <div className="users-list">
              {chat.availableUsers.map(userId => (
                <div key={userId} className="user-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(userId)}
                      onChange={() => toggleUserSelection(userId)}
                    />
                    User {userId}
                  </label>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button 
                className="button" 
                onClick={handleCreateChat}
                disabled={!newConversationName.trim() || selectedUsers.length === 0}
              >
                Create
              </button>
              <button className="button secondary" onClick={() => setShowNewChat(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Home.propTypes = {
  chat: PropTypes.shape({
    id: PropTypes.number,
    connected: PropTypes.bool.isRequired,
    conversations: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      participants: PropTypes.arrayOf(PropTypes.number),
      messages: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string,
        message: PropTypes.string,
        sender: PropTypes.number,
      }))
    })),
    activeConversationId: PropTypes.string,
    availableUsers: PropTypes.arrayOf(PropTypes.number)
  }).isRequired,
  openConnection: PropTypes.func.isRequired,
  sendMessage: PropTypes.func.isRequired,
  startConversation: PropTypes.func.isRequired,
  setActiveConversation: PropTypes.func.isRequired
};

export default connect(mapStateToProps, mapDispatchToProps)(Home);
