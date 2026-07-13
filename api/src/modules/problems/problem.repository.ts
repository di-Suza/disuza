import type { Types } from 'mongoose';

import CollabRoomModel from '../collab/collabRoom.model.js';
import ProblemModel, { type ProblemLanguage } from './problem.model.js';
import RoomProblemModel from './roomProblem.model.js';

type SearchProblemFilter = {
  $or?: Array<Record<string, { $regex: string; $options: string }>>;
};

class ProblemRepository {
  findProblemById(problemId: string | Types.ObjectId) {
    return ProblemModel.findById(problemId);
  }

  searchProblems(filter: SearchProblemFilter, page: number, limit: number) {
    return ProblemModel.find(filter)
      .sort({ createdAt: -1, _id: 1 })
      .select({
        testCases: { $slice: 2 },
        boilerplate: 0,
        isAIGenerated: 0,
        updatedAt: 0,
        __v: 0,
      })
      .skip((page - 1) * limit)
      .limit(limit);
  }

  existsInRoom(roomId: string | Types.ObjectId, problemId: string | Types.ObjectId) {
    return RoomProblemModel.exists({ roomId, problemId });
  }

  findRoomProblem(roomId: string | Types.ObjectId, problemId: string | Types.ObjectId) {
    return RoomProblemModel.findOne({ roomId, problemId }).populate('problemId');
  }

  createRoomProblem(data: {
    roomId: string | Types.ObjectId;
    problemId: string | Types.ObjectId;
    currentCode: string;
    language: ProblemLanguage;
  }) {
    return RoomProblemModel.create(data);
  }

  findCollabRoomById(roomId: string | Types.ObjectId) {
    return CollabRoomModel.findById(roomId);
  }

  findRoomProblemById(roomId: string | Types.ObjectId, roomProblemId: string | Types.ObjectId) {
    return RoomProblemModel.findOne({ _id: roomProblemId, roomId });
  }

  updateRoomProblemLanguage(roomId: string | Types.ObjectId, roomProblemId: string | Types.ObjectId, language: ProblemLanguage) {
    return RoomProblemModel.findOneAndUpdate(
      { _id: roomProblemId, roomId },
      { language },
      { new: true },
    ).populate('problemId');
  }

  updateAttemptedProblem(roomId: string | Types.ObjectId, roomProblemId: string | Types.ObjectId) {
    return RoomProblemModel.findOneAndUpdate(
      {
        _id: roomProblemId,
        roomId,
        status: 'solving',
      },
      { status: 'attempted' },
      { new: true },
    ).populate('problemId');
  }
}

const problemRepository = new ProblemRepository();

export { ProblemRepository, type SearchProblemFilter };
export default problemRepository;
