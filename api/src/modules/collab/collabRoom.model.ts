import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';

const COLLAB_ROOM_TYPES = ['shared', 'personal'] as const;

type CollabRoomType = typeof COLLAB_ROOM_TYPES[number];

type CollabRoom = {
  conversationId: Types.ObjectId;
  owner: Types.ObjectId | null;
  roomType: CollabRoomType;
  currentlySelectedProblem: Types.ObjectId | null;
  problemsSolved: number;
  createdAt: Date;
  updatedAt: Date;
};

type CollabRoomDocument = HydratedDocument<CollabRoom>;
type CollabRoomModel = Model<CollabRoom>;

const collabRoomSchema = new mongoose.Schema<CollabRoom, CollabRoomModel>(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      unique: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    roomType: {
      type: String,
      enum: COLLAB_ROOM_TYPES,
      default: 'shared',
      index: true,
    },
    currentlySelectedProblem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RoomProblem',
      default: null,
    },
    problemsSolved: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

collabRoomSchema.index(
  { owner: 1, roomType: 1 },
  {
    unique: true,
    partialFilterExpression: { roomType: 'personal' },
  },
);

const CollabRoomModel = mongoose.models.CollabRoom as CollabRoomModel
  || mongoose.model<CollabRoom, CollabRoomModel>('CollabRoom', collabRoomSchema, 'collabrooms');

export { COLLAB_ROOM_TYPES, type CollabRoom, type CollabRoomDocument, type CollabRoomType };
export default CollabRoomModel;
