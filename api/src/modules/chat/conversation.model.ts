import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';

type Conversation = {
  participants: Types.ObjectId[];
  lastMessage: Types.ObjectId | null;
  isUnread: boolean;
  hiddenBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
};

type ConversationDocument = HydratedDocument<Conversation>;
type ConversationModel = Model<Conversation>;

const conversationSchema = new mongoose.Schema<Conversation, ConversationModel>(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    isUnread: { type: Boolean, default: true },
    hiddenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

conversationSchema.index({ participants: 1 });

const ConversationModel = mongoose.models.Conversation as ConversationModel
  || mongoose.model<Conversation, ConversationModel>('Conversation', conversationSchema, 'conversations');

export { type Conversation, type ConversationDocument };
export default ConversationModel;
