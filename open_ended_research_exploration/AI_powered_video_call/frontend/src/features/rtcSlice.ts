import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface RTCState {
    ephermeralToken: string
  peer: RTCPeerConnection | null
}

const initialState: RTCState = {
  ephermeralToken: "",
  peer: null,
}

export const rtcSlice = createSlice({
  name: 'rtc',
  initialState,
  reducers: {
    setEphermeralToken: (state, action: PayloadAction<string>) => {
      state.ephermeralToken = action.payload
    },
    setRTCPeer: (state, action: PayloadAction<RTCPeerConnection>) => {
      state.peer = action.payload
    },
  },
})

// Action creators are generated for each case reducer function
export const { setEphermeralToken, setRTCPeer } = rtcSlice.actions

export default rtcSlice.reducer