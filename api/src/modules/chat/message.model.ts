import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';

type FeedbackTargetModel = 'Post' | 'User';
type MessageType = 'text' | 'feedback' | 'post' | 'system' | 'attachment';
type MessageAttachmentKind = 'image' | 'video' | 'audio' | 'file';

type MessageSeenReceipt = {
  user: Types.ObjectId;
  seenAt: Date;
};

type MessageAttachment = {
  url?: string;
  fileId: string;
  filePath?: string;
  name?: string;
  mime?: string;
  size?: number;
  mediaType: MessageAttachmentKind;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
};

type Message = {
  conversationId: Types.ObjectId;
  sender: Types.ObjectId;
  text: string;
  messageType: MessageType;
  seenBy: MessageSeenReceipt[];
  isFeedback: boolean;
  feedbackOn?: {
    type?: FeedbackTargetModel;
    _id?: Types.ObjectId;
  };
  sharedPost?: Types.ObjectId;
  attachment?: MessageAttachment;
  createdAt: Date;
  updatedAt: Date;
};

type MessageDocument = HydratedDocument<Message>;
type MessageModel = Model<Message>;

const messageSchema = new mongoose.Schema<Message, MessageModel>(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    messageType: { type: String, enum: ['text', 'feedback', 'post', 'system', 'attachment'], default: 'text', index: true },
    seenBy: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      seenAt: { type: Date, default: Date.now },
    }],
    isFeedback: { type: Boolean, default: false, index: true },
    feedbackOn: {
      type: {
        type: String,
        enum: ['Post', 'User'],
      },
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'feedbackOn.type',
      },
    },
    sharedPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      index: true,
    },
    attachment: {
      url: { type: String },
      fileId: { type: String },
      filePath: { type: String },
      name: { type: String },
      mime: { type: String },
      size: { type: Number },
      mediaType: {
        type: String,
        enum: ['image', 'video', 'audio', 'file'],
      },
      thumbnailUrl: { type: String },
      width: { type: Number },
      height: { type: Number },
    },
  },
  { timestamps: true },
);

messageSchema.pre('validate', function normalizeMessageType(next) {
  if (this.isFeedback) {
    this.messageType = 'feedback';
  }

  if (this.messageType !== 'feedback') {
    this.feedbackOn = undefined;
    this.isFeedback = false;
  }

  if (this.messageType !== 'post') {
    this.sharedPost = undefined;
  }

  if (this.messageType !== 'attachment') {
    this.attachment = undefined;
  }

  next();
});

const MessageModel = mongoose.models.Message as MessageModel
  || mongoose.model<Message, MessageModel>('Message', messageSchema, 'messages');

export { type FeedbackTargetModel, type Message, type MessageAttachment, type MessageAttachmentKind, type MessageDocument, type MessageType };
export default MessageModel;
