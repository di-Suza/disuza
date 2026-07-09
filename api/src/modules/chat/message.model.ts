import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';

type FeedbackTargetModel = 'Post' | 'User';

type Message = {
  conversationId: Types.ObjectId;
  sender: Types.ObjectId;
  text: string;
  isFeedback: boolean;
  feedbackOn?: {
    type?: FeedbackTargetModel;
    _id?: Types.ObjectId;
  };
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
  },
  { timestamps: true },
);

messageSchema.pre('validate', function clearFeedbackTarget(next) {
  if (!this.isFeedback) {
    this.feedbackOn = undefined;
  }
  next();
});

const MessageModel = mongoose.models.Message as MessageModel
  || mongoose.model<Message, MessageModel>('Message', messageSchema, 'messages');

export { type FeedbackTargetModel, type Message, type MessageDocument };
export default MessageModel;
