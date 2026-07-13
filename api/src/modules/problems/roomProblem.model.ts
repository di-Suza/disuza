import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';

import { PROBLEM_LANGUAGES, type ProblemLanguage } from './problem.model.js';

const ROOM_PROBLEM_STATUSES = ['pending', 'solving', 'solved', 'attempted'] as const;

type RoomProblemStatus = typeof ROOM_PROBLEM_STATUSES[number];

type RoomProblem = {
  roomId: Types.ObjectId;
  problemId: Types.ObjectId;
  status: RoomProblemStatus;
  currentCode: string;
  language: ProblemLanguage;
  testCasesPassed: number;
  createdAt: Date;
  updatedAt: Date;
};

type RoomProblemDocument = HydratedDocument<RoomProblem>;
type RoomProblemModel = Model<RoomProblem>;

const roomProblemSchema = new mongoose.Schema<RoomProblem, RoomProblemModel>(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CollabRoom',
      required: true,
      index: true,
    },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem',
      required: true,
    },
    status: {
      type: String,
      enum: ROOM_PROBLEM_STATUSES,
      default: 'pending',
      index: true,
    },
    currentCode: {
      type: String,
      default: '',
    },
    language: {
      type: String,
      enum: PROBLEM_LANGUAGES,
      default: 'javascript',
    },
    testCasesPassed: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

roomProblemSchema.index({ roomId: 1, problemId: 1 }, { unique: true });

const RoomProblemModel = mongoose.models.RoomProblem as RoomProblemModel
  || mongoose.model<RoomProblem, RoomProblemModel>('RoomProblem', roomProblemSchema, 'roomproblems');

export { ROOM_PROBLEM_STATUSES, type RoomProblem, type RoomProblemDocument, type RoomProblemStatus };
export default RoomProblemModel;
