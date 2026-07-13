export type FeedbackTargetType = 'Post' | 'User';

export type ChatImage = {
  url?: string;
  fileId?: string;
};

export type FeedbackDetails = {
  _id: string;
  type?: FeedbackTargetType;
  userName?: string;
  profilePicture?: ChatImage;
  caption?: string;
  media?: Array<{ url?: string; mediaType?: string }>;
  images?: Array<{ url?: string; mediaType?: string }>;
};

export type ChatUser = {
  _id: string;
  userName?: string;
  profilePicture?: ChatImage;
  headline?: string;
  active?: boolean;
  isDeletedUser?: boolean;
};

export type ChatMessage = {
  _id: string;
  conversationId: string;
  sender: string;
  senderInfo?: ChatUser;
  text: string;
  isFeedback?: boolean;
  feedbackOn?: {
    type?: FeedbackTargetType;
    _id?: string;
  };
  feedbackDetails?: FeedbackDetails | null;
  receiverId?: string;
  conversationIsUnread?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ChatLastMessage = Pick<ChatMessage, '_id' | 'text' | 'sender' | 'createdAt'>;

export type ChatConversation = {
  _id: string;
  otherUser?: ChatUser;
  lastMessage?: ChatLastMessage | null;
  isUnread?: boolean;
  updatedAt?: string;
  isBlocked?: boolean;
  hasBlockedMe?: boolean;
  isUnavailable?: boolean;
};

export type GetConversationsResponse = {
  success: boolean;
  message: string;
  conversations: ChatConversation[];
};

export type GetMessagesQueryArgs = {
  conversationId: string;
  page?: number;
  limit?: number;
};

export type GetMessagesResponse = {
  success: boolean;
  message: string;
  messages: ChatMessage[];
  page: number;
  currentPage?: number;
  hasMore: boolean;
};

export type SendMessageRequest = {
  receiverId?: string;
  conversationId?: string;
  message: string;
  isFeedback?: boolean;
  feedbackOn?: FeedbackTargetType;
  postId?: string;
  userId?: string;
};

export type SendMessageResponse = {
  success: boolean;
  message: string;
  newMessage: ChatMessage;
};

export type UnsendMessageRequest = {
  messageId: string;
  conversationId?: string;
};

export type UnsendMessageResponse = {
  success: boolean;
  message: string;
  messageId: string;
  conversationId: string;
  lastMessage?: ChatMessage | null;
  wasLastMessage?: boolean;
  updatedAt?: string;
};

export type DeleteConversationRequest = {
  conversationId: string;
};

export type DeleteConversationResponse = {
  success: boolean;
  message: string;
  conversationId: string;
  hiddenForEveryone?: boolean;
};

export type MarkAsReadResponse = {
  success: boolean;
  message: string;
};
