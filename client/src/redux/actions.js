import WebSocketService from "./websocket";

const API_URL = import.meta.env.VITE_API_URL;
const WS_URL = import.meta.env.VITE_WS_URL;

export function openConnection(payload) {
  return async function (dispatch) {
    let id = null;

    if (!payload.id) {
      id = await fetch(`${API_URL}/id`).then((res) => res.json());
      dispatch({
        type: "FETCH_ID_SUCCESS",
        payload: id,
      });
    }

    try {
      WebSocketService.setMessageHandler((data) => {
        switch (data.type) {
          case "init":
            dispatch({
              type: "INIT_DATA",
              payload: data.data,
            });
            break;
          case "newConversation":
            dispatch({
              type: "NEW_CONVERSATION",
              payload: data.data,
            });
            break;
          case "messagesUpdate":
            dispatch({
              type: "UPDATE_MESSAGES",
              payload: data.data,
            });
            break;
        }
      });

      await WebSocketService.connect(`${WS_URL}?id=${id ? id.id : payload.id}`);
      dispatch({ type: "WEBSOCKET_CONNECTED" });
    } catch (error) {
      console.error("WebSocket connection error:", error);
      dispatch({ type: "WEBSOCKET_DISCONNECTED" });
    }
  };
}

export function sendMessage(message, conversationId) {
  return function (dispatch, getState) {
    const { chat } = getState();
    if (message && chat.connected) {
      WebSocketService.send({
        type: "sendMessage",
        conversationId,
        message,
      });
    }
  };
}

export function startConversation(name, participants) {
  return function (dispatch, getState) {
    const { chat } = getState();
    if (chat.connected) {
      WebSocketService.send({
        type: "startConversation",
        name,
        participants,
      });
    }
  };
}

export function setActiveConversation(conversationId) {
  return {
    type: "SET_ACTIVE_CONVERSATION",
    payload: conversationId,
  };
}
