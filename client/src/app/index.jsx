import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";

import Message from "./components/message.jsx";
import "./styles.css";
import * as actions from "../redux/actions";

const mapStateToProps = (state) => ({ chat: state.chat });
const mapDispatchToProps = (dispatch) => bindActionCreators(actions, dispatch);

function Home({ chat, openConnection }) {
  const [message, setMessage] = useState("");
  const textArea = useRef(null);

  useEffect(() => {
    openConnection({ id: chat.id });
    return () => {
      if (chat.ws) {
        chat.ws.close();
      }
    };
  }, []);

  useEffect(() => {
    if (textArea.current) {
      textArea.current.scrollTop = textArea.current.scrollHeight;
    }
  }, [chat.messages]);

  const onChange = (event) => {
    setMessage(event.target.value);
  };

  const send = () => {
    if (message && chat.ws) {
      chat.ws.send(
        JSON.stringify({
          sender: chat.id,
          message,
          createdAt: Date.now(),
        })
      );
      setMessage("");
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      send();
    }
  };

  const { id } = chat;
  return (
    <div className="parent">
      <h2 style={{ marginBottom: "0px" }}>You are user {id}</h2>
      <h2 style={{ marginTop: "5px" }}>
        You are now chatting with user {id % 2 === 0 ? id + 1 : id - 1}
      </h2>
      <div className="chat-box">
        <div className="text-area" ref={textArea}>
          {chat.messages.map((m) => (
            <Message key={m.id} message={m} id={chat.id} />
          ))}
        </div>

        <div className="input-container">
          <input
            className="input"
            value={message}
            name="message"
            onChange={onChange}
            placeholder="Say Hi!"
            onKeyDown={handleKeyDown}
          />
          <button type="button" className="button" onClick={send}>
            Send!
          </button>
        </div>
      </div>
    </div>
  );
}

Home.propTypes = {
  chat: PropTypes.shape({
    id: PropTypes.number,
    ws: PropTypes.object,
    messages: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        message: PropTypes.string,
        sender: PropTypes.number,
      })
    ),
  }).isRequired,
  openConnection: PropTypes.func.isRequired,
};

export default connect(mapStateToProps, mapDispatchToProps)(Home);
