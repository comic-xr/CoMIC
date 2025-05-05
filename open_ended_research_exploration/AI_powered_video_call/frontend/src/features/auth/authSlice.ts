import { createSlice } from "@reduxjs/toolkit";

const emptyTokens = {
  accessToken: "",
  refreshToken: "",
  idToken: "",
};

const authSlice = createSlice({
  name: "auth",
  initialState: emptyTokens,
  reducers: {
    setTokens: (state, action) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.idToken = action.payload.idToken;
    }
  },
});

export const { setTokens } = authSlice.actions;

export default authSlice.reducer;