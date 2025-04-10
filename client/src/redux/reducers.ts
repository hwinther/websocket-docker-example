import { Action, combineReducers, Reducer } from "@reduxjs/toolkit";
import { ChatState } from "../types";
import chat from "./reducers/chat";

export interface RootState {
  chat: ChatState;
  [key: string]: unknown;
}

type AsyncReducer = Reducer<RootState[keyof RootState], Action>;

export default function createReducer(
  asyncReducers?: Record<string, AsyncReducer>
): Reducer<RootState> {
  return combineReducers({
    chat,
    ...asyncReducers,
  }) as unknown as Reducer<RootState>;
}
