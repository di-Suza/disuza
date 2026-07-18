import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { ChatMessage } from '../model/chat.types';

type ChatState = {
  selectedChatId: string | null;
  isChatWindowActive: boolean;
  lastReceivedMessage: ChatMessage | null;
};

const initialState: ChatState = {
  selectedChatId: null,
  isChatWindowActive: false,
  lastReceivedMessage: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setSelectedChatInState: (state, action: PayloadAction<string | null>) => {
      state.selectedChatId = action.payload;
    },
    clearSelectedChatFromState: (state) => {
      state.selectedChatId = null;
    },
    setChatWindowActive: (state) => {
      state.isChatWindowActive = true;
    },
    setChatWindowClosed: (state) => {
      state.isChatWindowActive = false;
    },
    setLastReceivedMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.lastReceivedMessage = action.payload;
    },
    removeLastReceivedMessage: (state) => {
      state.lastReceivedMessage = null;
    },
  },
});

export const {
  clearSelectedChatFromState,
  removeLastReceivedMessage,
  setChatWindowActive,
  setChatWindowClosed,
  setLastReceivedMessage,
  setSelectedChatInState,
} = chatSlice.actions;

export default chatSlice.reducer;
