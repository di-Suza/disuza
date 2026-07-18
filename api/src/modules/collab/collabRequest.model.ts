import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';

const COLLAB_REQUEST_STATUSES = ['pending', 'accepted'] as const;

type CollabRequestStatus = typeof COLLAB_REQUEST_STATUSES[number];

type CollabRequest = {
  sender: Types.ObjectId;
  recipient: Types.ObjectId;
  conversationId: Types.ObjectId;
  status: CollabRequestStatus;
  createdAt: Date;
  updatedAt: Date;
};

type CollabRequestDocument = HydratedDocument<CollabRequest>;
type CollabRequestModel = Model<CollabRequest>;

const collabRequestSchema = new mongoose.Schema<CollabRequest, CollabRequestModel>(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: COLLAB_REQUEST_STATUSES,
      default: 'pending',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: { expires: '24h' },
    },
  },
  { timestamps: true },
);

collabRequestSchema.index({ conversationId: 1, status: 1 });

const CollabRequestModel = mongoose.models.CollabRequest as CollabRequestModel
  || mongoose.model<CollabRequest, CollabRequestModel>('CollabRequest', collabRequestSchema, 'collabrequests');

export { COLLAB_REQUEST_STATUSES, type CollabRequest, type CollabRequestDocument, type CollabRequestStatus };
export default CollabRequestModel;
