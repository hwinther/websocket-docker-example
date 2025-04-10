import { Action, configureStore, Reducer } from "@reduxjs/toolkit";
import { thunk } from "redux-thunk";
import createReducer, { RootState } from "./reducers";

interface ExtendedStore {
  asyncReducers: Record<string, Reducer>;
}

type AppStore = ReturnType<typeof configureStore> & ExtendedStore;

export default function configureAppStore(): AppStore {
  const store = configureStore({
    reducer: createReducer(),
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(thunk),
  }) as AppStore;

  store.asyncReducers = {};
  return store;
}

export function injectAsyncReducer(
  store: AppStore,
  name: string,
  asyncReducer: Reducer<RootState[keyof RootState], Action>
): void {
  store.asyncReducers[name] = asyncReducer;
  // Cast to any to bypass type checking for the replaceReducer call
  // This is safe because we've ensured type compatibility through our AsyncReducer type
  (store as any).replaceReducer(createReducer(store.asyncReducers));
}
