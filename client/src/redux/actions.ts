import { Dispatch } from "redux";
import { WebSocketMessage, ChatState } from "../types";
import WebSocketService from "./websocket";
import { logger } from "../utils/logger";

const API_URL = import.meta.env.VITE_API_URL;
const WS_URL = import.meta.env.VITE_WS_URL;

export function openConnection(payload: { id?: number }) {
  return async function (dispatch: Dispatch) {
    let id = null;

    if (!payload.id) {
      id = await fetch(`${API_URL}/id`).then((res) => res.json());
      dispatch({
        type: "FETCH_ID_SUCCESS",
        payload: id,
      });
    }

    try {
      WebSocketService.setMessageHandler((data: WebSocketMessage) => {
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
          case "usersUpdate":
            dispatch({
              type: "USERS_UPDATE",
              payload: data.data,
            });
            break;
        }
      });

      await WebSocketService.connect(`${WS_URL}?id=${id ? id.id : payload.id}`);
      dispatch({ type: "WEBSOCKET_CONNECTED" });
    } catch (error) {
      logger.error("WebSocket connection error:", error);
      dispatch({ type: "WEBSOCKET_DISCONNECTED" });
    }
  };
}

export function sendMessage(message: string, conversationId: string) {
  return function (_dispatch: Dispatch, getState: () => { chat: ChatState }) {
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

export function startConversation(name: string, participants: number[]) {
  return function (_dispatch: Dispatch, getState: () => { chat: ChatState }) {
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

export function setActiveConversation(conversationId: string) {
  return {
    type: "SET_ACTIVE_CONVERSATION",
    payload: conversationId,
  };
}
