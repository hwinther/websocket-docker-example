export interface Message {
  id?: string;
  message: string;
  sender: number;
  conversation_id?: string;
}

export interface Conversation {
  id: string;
  name?: string;
  participants: number[];
  messages: Message[];
}

export interface ChatState {
  id: number | null;
  connected: boolean;
  conversations: Conversation[];
  activeConversationId: string | null;
  availableUsers: number[];
}

interface WebSocketInitData {
  conversations: Conversation[];
  availableUsers: number[];
}

export interface WebSocketMessage {
  type: "init" | "newConversation" | "messagesUpdate" | "usersUpdate" | "error";
  data?:
    | WebSocketInitData
    | Conversation
    | { conversationId: string; messages: Message[] }
    | { availableUsers: number[] };
  error?: string;
  details?: string;
}

export interface ChatActions {
  openConnection: (payload: { id?: number }) => void;
  sendMessage: (message: string, conversationId: string) => void;
  startConversation: (name: string, participants: number[]) => void;
  setActiveConversation: (conversationId: string) => void;
}
