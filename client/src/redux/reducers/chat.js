const initialState = {
  id: null,
  connected: false,
  conversations: [],
  activeConversationId: null,
  availableUsers: [],
};

export default function reducer(state = initialState, action) {
  const { type, payload } = action;

  switch (type) {
    case "WEBSOCKET_CONNECTED":
      return { ...state, connected: true };
    case "WEBSOCKET_DISCONNECTED":
      return { ...state, connected: false };
    case "FETCH_ID_SUCCESS":
      return { ...state, id: payload.id };
    case "INIT_DATA":
      return {
        ...state,
        conversations: payload.conversations,
        availableUsers: payload.availableUsers,
      };
    case "NEW_CONVERSATION":
      return {
        ...state,
        conversations: [...state.conversations, payload],
        activeConversationId: payload.id,
      };
    case "SET_ACTIVE_CONVERSATION":
      return { ...state, activeConversationId: payload };
    case "UPDATE_MESSAGES":
      return {
        ...state,
        conversations: state.conversations.map((conv) =>
          conv.id === payload.conversationId
            ? { ...conv, messages: payload.messages }
            : conv
        ),
      };
    default:
      return state;
  }
}
