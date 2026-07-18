import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';

type Conversation = {
  participants: Types.ObjectId[];
  lastMessage: Types.ObjectId | null;
  isUnread: boolean;
  unreadCounts: Map<string, number>;
  hiddenBy: Types.ObjectId[];
  pinnedBy: Types.ObjectId[];
  isGroup: boolean;
  groupName?: string;
  groupAvatar?: {
    url?: string;
    fileId?: string;
  };
  admins: Types.ObjectId[];
  createdBy?: Types.ObjectId;
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
    unreadCounts: { type: Map, of: Number, default: {} },
    hiddenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    pinnedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isGroup: { type: Boolean, default: false, index: true },
    groupName: { type: String, trim: true, maxlength: 80 },
    groupAvatar: {
      url: { type: String },
      fileId: { type: String },
    },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

conversationSchema.index({ participants: 1 });

const ConversationModel = mongoose.models.Conversation as ConversationModel
  || mongoose.model<Conversation, ConversationModel>('Conversation', conversationSchema, 'conversations');

export { type Conversation, type ConversationDocument };
export default ConversationModel;
