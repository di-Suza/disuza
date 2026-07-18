export type FeedbackTargetType = 'Post' | 'User';
export type ChatMessageType = 'text' | 'feedback' | 'post' | 'system' | 'attachment';

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

export type SharedPostDetails = {
  _id: string;
  caption?: string;
  media?: Array<{ url?: string; mediaType?: string; thumbnailUrl?: string }>;
  images?: Array<{ url?: string; mediaType?: string; thumbnailUrl?: string }>;
  user?: ChatUser;
  isProjectPost?: boolean;
  createdAt?: string;
};

export type ChatSeenReceipt = {
  user: string;
  seenAt?: string;
};

export type ChatAttachment = {
  fileId: string;
  downloadUrl?: string;
  name?: string;
  mime?: string;
  size?: number;
  mediaType: 'image' | 'video' | 'audio' | 'file';
  thumbnailUrl?: string;
  width?: number;
  height?: number;
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
  messageType?: ChatMessageType;
  seenBy?: ChatSeenReceipt[];
  isFeedback?: boolean;
  feedbackOn?: {
    type?: FeedbackTargetType;
    _id?: string;
  };
  feedbackDetails?: FeedbackDetails | null;
  sharedPost?: string;
  sharedPostDetails?: SharedPostDetails | null;
  attachment?: ChatAttachment | null;
  deliveredTo?: string[];
  receiverId?: string;
  conversationIsUnread?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ChatLastMessage = Pick<ChatMessage, '_id' | 'text' | 'sender' | 'createdAt' | 'messageType' | 'sharedPost' | 'attachment'>;

export type ChatConversation = {
  _id: string;
  otherUser?: ChatUser;
  participants?: ChatUser[];
  isGroup?: boolean;
  groupName?: string;
  groupAvatar?: ChatImage;
  admins?: string[];
  roomId?: string;
  lastMessage?: ChatLastMessage | null;
  isUnread?: boolean;
  unreadCount?: number;
  isPinned?: boolean;
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
  messageType?: ChatMessageType;
  isFeedback?: boolean;
  feedbackOn?: FeedbackTargetType;
  postId?: string;
  sharedPostId?: string;
  userId?: string;
  attachment?: File;
};

export type SendMessageResponse = {
  success: boolean;
  message: string;
  newMessage: ChatMessage;
};

export type StartConversationRequest = {
  receiverId: string;
};

export type StartConversationResponse = {
  success: boolean;
  message: string;
  conversation: ChatConversation;
};

export type CreateGroupRequest = {
  memberIds: string[];
  groupName?: string;
};

export type CreateGroupResponse = {
  success: boolean;
  message: string;
  conversation: ChatConversation;
  roomId?: string;
};

export type AcceptGroupInviteResponse = CreateGroupResponse;

export type UpdateGroupRequest = {
  conversationId: string;
  groupName: string;
};

export type InviteGroupMembersRequest = {
  conversationId: string;
  memberIds: string[];
};

export type RemoveGroupMemberRequest = {
  conversationId: string;
  memberId: string;
};

export type GroupConversationResponse = {
  success: boolean;
  message: string;
  conversation: ChatConversation | null;
  conversationId?: string;
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
  conversationId?: string;
  unreadCount?: number;
  seenCount?: number;
  seenAt?: string;
};

export type PinConversationRequest = {
  conversationId: string;
  pinned: boolean;
};
