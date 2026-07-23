import type { Types } from 'mongoose';

import CollabRoomModel from '../collab/collabRoom.model.js';
import ProblemModel, { type Problem, type ProblemLanguage } from './problem.model.js';
import RoomProblemModel from './roomProblem.model.js';

type SearchProblemFilter = {
  isAIGenerated?: boolean;
  $or?: Array<Record<string, { $regex: string; $options: string }>>;
};

type CreateProblemInput = Pick<Problem, 'title' | 'description' | 'difficulty' | 'tags' | 'isAIGenerated' | 'testCases' | 'boilerplate' | 'constraints'>;

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
        updatedAt: 0,
        __v: 0,
      })
      .skip((page - 1) * limit)
      .limit(limit);
  }

  findAIGeneratedProblemByTitle(title: string) {
    return ProblemModel.findOne({
      title: { $regex: `^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      isAIGenerated: true,
    });
  }

  createProblem(data: CreateProblemInput) {
    return ProblemModel.create(data);
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

  findRunningRoomProblem(roomId: string | Types.ObjectId) {
    return RoomProblemModel.findOne({ roomId, executionStatus: 'running' }).populate('problemId');
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

  deleteRoomProblem(roomId: string | Types.ObjectId, roomProblemId: string | Types.ObjectId) {
    return RoomProblemModel.findOneAndDelete({ _id: roomProblemId, roomId }).populate('problemId');
  }
}

const problemRepository = new ProblemRepository();

export { ProblemRepository, type SearchProblemFilter };
export default problemRepository;
