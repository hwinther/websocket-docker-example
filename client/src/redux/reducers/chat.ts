import { ChatState, Conversation, Message } from "../../types";

export type ChatAction =
  | { type: "WEBSOCKET_CONNECTED" }
  | { type: "WEBSOCKET_DISCONNECTED" }
  | { type: "FETCH_ID_SUCCESS"; payload: { id: number } }
  | {
      type: "INIT_DATA";
      payload: { conversations: Conversation[]; availableUsers: number[] };
    }
  | { type: "NEW_CONVERSATION"; payload: Conversation }
  | { type: "SET_ACTIVE_CONVERSATION"; payload: string }
  | {
      type: "UPDATE_MESSAGES";
      payload: { conversationId: string; messages: Message[] };
    }
  | { type: "USERS_UPDATE"; payload: { availableUsers: number[] } };

const initialState: ChatState = {
  id: null,
  connected: false,
  conversations: [],
  activeConversationId: null,
  availableUsers: [],
};

export default function reducer(
  state = initialState,
  action: ChatAction
): ChatState {
  switch (action.type) {
    case "WEBSOCKET_CONNECTED":
      return { ...state, connected: true };
    case "WEBSOCKET_DISCONNECTED":
      return { ...state, connected: false };
    case "FETCH_ID_SUCCESS":
      return { ...state, id: action.payload.id };
    case "INIT_DATA":
      return {
        ...state,
        conversations: action.payload.conversations,
        availableUsers: action.payload.availableUsers,
      };
    case "NEW_CONVERSATION":
      return {
        ...state,
        conversations: [...state.conversations, action.payload],
        activeConversationId: action.payload.id,
      };
    case "SET_ACTIVE_CONVERSATION":
      return { ...state, activeConversationId: action.payload };
    case "UPDATE_MESSAGES":
      return {
        ...state,
        conversations: state.conversations.map((conv) =>
          conv.id === action.payload.conversationId
            ? { ...conv, messages: action.payload.messages }
            : conv
        ),
      };
    case "USERS_UPDATE":
      return {
        ...state,
        availableUsers: action.payload.availableUsers,
      };
    default:
      return state;
  }
}
