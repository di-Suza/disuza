import mongoose, { type PopulateOptions, type Types } from 'mongoose';

import ConversationModel from '../chat/conversation.model.js';
import RoomProblemModel from '../problems/roomProblem.model.js';
import CollabRequestModel from './collabRequest.model.js';
import CollabRoomModel, { type CollabRoomDocument } from './collabRoom.model.js';

type ConversationWithOtherUser = {
  _id: Types.ObjectId;
  participants: Types.ObjectId[];
  otherUserId: Types.ObjectId;
  otherUser?: {
    _id: Types.ObjectId;
    userName: string;
    profilePicture?: {
      url: string;
      fileId?: string;
    };
    active?: boolean;
  };
  updatedAt: Date;
};

class CollabRepository {
  findConversationById(conversationId: string | Types.ObjectId) {
    return ConversationModel.findById(conversationId).select('participants').lean();
  }

  findRoomByConversation(conversationId: string | Types.ObjectId) {
    return CollabRoomModel.findOne({ conversationId });
  }

  findRequestByConversation(conversationId: string | Types.ObjectId) {
    return CollabRequestModel.findOne({ conversationId });
  }

  createRequest(sender: string | Types.ObjectId, recipient: string | Types.ObjectId, conversationId: string | Types.ObjectId) {
    return CollabRequestModel.create({ sender, recipient, conversationId });
  }

  deleteRequestById(requestId: string | Types.ObjectId) {
    return CollabRequestModel.findByIdAndDelete(requestId);
  }

  createSharedRoom(conversationId: string | Types.ObjectId) {
    return CollabRoomModel.create({
      conversationId,
      roomType: 'shared',
    });
  }

  findRoomById(roomId: string | Types.ObjectId) {
    return CollabRoomModel.findById(roomId).lean();
  }

  findHydratedRoomById(roomId: string | Types.ObjectId) {
    return CollabRoomModel.findById(roomId);
  }

  findPopulatedRoom(roomId: string | Types.ObjectId, populateOptions: Array<string | PopulateOptions>) {
    return CollabRoomModel.findById(roomId).populate(populateOptions);
  }

  getOrCreatePersonalRoom(userId: string | Types.ObjectId) {
    return CollabRoomModel.findOneAndUpdate(
      { owner: userId, roomType: 'personal' },
      {
        $setOnInsert: {
          owner: userId,
          roomType: 'personal',
          conversationId: new mongoose.Types.ObjectId(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
  }

  findUserConversationsWithOtherUser(userId: string | Types.ObjectId) {
    const currentUserId = new mongoose.Types.ObjectId(userId.toString());

    return ConversationModel.aggregate<ConversationWithOtherUser>([
      {
        $match: {
          participants: currentUserId,
        },
      },
      {
        $addFields: {
          otherUserId: {
            $first: {
              $filter: {
                input: '$participants',
                as: 'participant',
                cond: { $ne: ['$$participant', currentUserId] },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'otherUserId',
          foreignField: '_id',
          as: 'otherUser',
          pipeline: [
            {
              $project: {
                userName: 1,
                profilePicture: 1,
                active: 1,
              },
            },
          ],
        },
      },
      { $unwind: { path: '$otherUser', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          participants: 1,
          otherUserId: 1,
          otherUser: 1,
          updatedAt: 1,
        },
      },
    ]);
  }

  findSharedRoomsByConversationIds(conversationIds: Types.ObjectId[]) {
    return CollabRoomModel.find({
      conversationId: { $in: conversationIds },
      roomType: { $ne: 'personal' },
    })
      .populate({
        path: 'currentlySelectedProblem',
        populate: { path: 'problemId', model: 'Problem', select: 'title difficulty' },
      })
      .sort({ updatedAt: -1 })
      .lean();
  }

  aggregateRoomStats(roomIds: Types.ObjectId[]) {
    return RoomProblemModel.aggregate<{ _id: Types.ObjectId; problemsCount: number; solvedCount: number }>([
      { $match: { roomId: { $in: roomIds } } },
      {
        $group: {
          _id: '$roomId',
          problemsCount: { $sum: 1 },
          solvedCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'solved'] }, 1, 0],
            },
          },
        },
      },
    ]);
  }

  findRoomProblems(roomId: string | Types.ObjectId) {
    return RoomProblemModel.find({ roomId })
      .populate('problemId')
      .sort({ createdAt: -1 });
  }
}

const collabRepository = new CollabRepository();

export { CollabRepository, type ConversationWithOtherUser, type CollabRoomDocument };
export default collabRepository;
