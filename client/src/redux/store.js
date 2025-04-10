import { configureStore } from "@reduxjs/toolkit";
import { thunk } from "redux-thunk";
import createReducer from "./reducers";

export default function configureAppStore() {
  const store = configureStore({
    reducer: createReducer(),
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(thunk),
  });

  store.asyncReducers = {};
  return store;
}

export function injectAsyncReducer(store, name, asyncReducer) {
  store.asyncReducers[name] = asyncReducer;
  store.replaceReducer(createReducer(store.asyncReducers));
}
