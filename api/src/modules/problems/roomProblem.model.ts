import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';

import { PROBLEM_LANGUAGES, type ProblemLanguage } from './problem.model.js';

const ROOM_PROBLEM_STATUSES = ['pending', 'solving', 'solved', 'attempted'] as const;
const ROOM_PROBLEM_EXECUTION_STATUSES = ['idle', 'running'] as const;

type RoomProblemStatus = typeof ROOM_PROBLEM_STATUSES[number];
type RoomProblemExecutionStatus = typeof ROOM_PROBLEM_EXECUTION_STATUSES[number];

type RoomProblem = {
  roomId: Types.ObjectId;
  problemId: Types.ObjectId;
  status: RoomProblemStatus;
  executionStatus: RoomProblemExecutionStatus;
  executionStartedAt?: Date | null;
  executionRequestedBy?: Types.ObjectId | null;
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
    executionStatus: {
      type: String,
      enum: ROOM_PROBLEM_EXECUTION_STATUSES,
      default: 'idle',
      index: true,
    },
    executionStartedAt: {
      type: Date,
      default: null,
    },
    executionRequestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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

export {
  ROOM_PROBLEM_EXECUTION_STATUSES,
  ROOM_PROBLEM_STATUSES,
  type RoomProblem,
  type RoomProblemDocument,
  type RoomProblemExecutionStatus,
  type RoomProblemStatus,
};
export default RoomProblemModel;
