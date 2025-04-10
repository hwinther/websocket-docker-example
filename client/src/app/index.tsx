import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { bindActionCreators, Dispatch } from "redux";

import Message from "./components/message";
import "./styles.css";
import * as actions from "../redux/actions";
import WebSocketService from "../redux/websocket";
import { ChatState, ChatActions } from "../types";

const mapStateToProps = (state: { chat: ChatState }) => ({ chat: state.chat });
const mapDispatchToProps = (dispatch: Dispatch) => bindActionCreators(actions, dispatch);

type Props = ReturnType<typeof mapStateToProps> & ChatActions;

function Home({ chat, openConnection, sendMessage, startConversation, setActiveConversation }: Props) {
  const [message, setMessage] = useState("");
  const [newConversationName, setNewConversationName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const textArea = useRef<HTMLDivElement>(null);

  useEffect(() => {
    openConnection({ id: chat.id ?? undefined });
    return () => {
      WebSocketService.disconnect();
    };
  }, [openConnection, chat.id]);

  useEffect(() => {
    if (textArea.current) {
      textArea.current.scrollTop = textArea.current.scrollHeight;
    }
  }, [chat.conversations]);

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(event.target.value);
  };

  const send = () => {
    if (message && chat.connected && chat.activeConversationId) {
      sendMessage(message, chat.activeConversationId);
      setMessage("");
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
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

  const toggleUserSelection = (userId: number) => {
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
                <span>{conv.name ?? `Chat with ${conv.participants.filter(id => id !== chat.id).join(', ')}`}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chat-box">
          <div className="text-area" ref={textArea}>
            {messages.map((m) => (
              <Message key={m.id} message={m} id={chat.id!} />
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

export default connect(mapStateToProps, mapDispatchToProps)(Home);