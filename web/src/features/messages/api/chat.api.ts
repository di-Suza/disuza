import { api } from '@/shared/api/api';
import type { SendMessageRequest, SendMessageResponse, UnsendMessageRequest, UnsendMessageResponse } from '../model/chat.types';

export const chatApi = api.injectEndpoints({
  endpoints: (builder) => ({
    sendMessage: builder.mutation<SendMessageResponse, SendMessageRequest>({
      query: (body) => ({
        url: '/chat/sendMessage',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Conversations', 'Messages', 'UserAccountHistory', 'ProfileUser', 'Post', 'Feed', 'Posts'],
    }),
    unsendMessage: builder.mutation<UnsendMessageResponse, UnsendMessageRequest>({
      query: ({ messageId }) => ({
        url: `/chat/unsendMessage/${messageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, arg) => [
        'Conversations',
        'Messages',
        'UserAccountHistory',
        'ProfileUser',
        'Feed',
        'Posts',
        ...(arg.conversationId ? [{ type: 'Messages' as const, id: arg.conversationId }] : []),
      ],
    }),
  }),
});

export const { useSendMessageMutation, useUnsendMessageMutation } = chatApi;