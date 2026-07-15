import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';

type FeedbackTargetModel = 'Post' | 'User';
type MessageType = 'text' | 'feedback' | 'post';

type Message = {
  conversationId: Types.ObjectId;
  sender: Types.ObjectId;
  text: string;
  messageType: MessageType;
  isFeedback: boolean;
  feedbackOn?: {
    type?: FeedbackTargetModel;
    _id?: Types.ObjectId;
  };
  sharedPost?: Types.ObjectId;
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
    messageType: { type: String, enum: ['text', 'feedback', 'post'], default: 'text', index: true },
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

  next();
});

const MessageModel = mongoose.models.Message as MessageModel
  || mongoose.model<Message, MessageModel>('Message', messageSchema, 'messages');

export { type FeedbackTargetModel, type Message, type MessageDocument, type MessageType };
export default MessageModel;
