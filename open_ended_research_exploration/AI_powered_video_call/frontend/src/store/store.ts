import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage"; // Import the localStorage storage engine
import authReducer from "../features/auth/authSlice";
import rtcReducer from "../features/rtcSlice";

const persistConfig = {
  key: "root",
  storage, 
};

const persistedReducer = persistReducer(persistConfig, authReducer);
const rtcPersistedReducer = persistReducer(persistConfig, rtcReducer);

export const store = configureStore({
  reducer: {
    authStore: persistedReducer,
    rtcStore: rtcPersistedReducer,
  },
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
