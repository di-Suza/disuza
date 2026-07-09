export type FeedbackTargetType = 'Post' | 'User';

export type FeedbackDetails = {
  _id: string;
  type?: FeedbackTargetType;
  userName?: string;
  profilePicture?: {
    url?: string;
    fileId?: string;
  };
  caption?: string;
  media?: Array<{ url?: string; mediaType?: string }>;
  images?: Array<{ url?: string; mediaType?: string }>;
};

export type ChatMessage = {
  _id: string;
  conversationId: string;
  sender: string;
  senderInfo?: {
    _id: string;
    userName?: string;
    profilePicture?: {
      url?: string;
      fileId?: string;
    };
    headline?: string;
  };
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