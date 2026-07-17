import mongoose, { type Types } from 'mongoose';

import PostModel from '../posts/post.model.js';
import UserModel from '../users/user.model.js';
import ConversationModel, { type ConversationDocument } from './conversation.model.js';
import MessageModel, { type FeedbackTargetModel, type MessageDocument, type MessageType } from './message.model.js';

type SaveMessageInput = {
  conversationId?: string;
  receiverId?: string;
  senderId: string;
  message: string;
  messageType?: MessageType;
  isFeedback?: boolean;
  feedbackOn?: FeedbackTargetModel;
  postId?: string;
  sharedPostId?: string;
  userId?: string;
};

type CreateMessageOptions = {
  receiverId?: string | Types.ObjectId | null;
  unhideParticipants?: boolean;
};

type CreateGroupConversationInput = {
  creatorId: string | Types.ObjectId;
  memberIds: Array<string | Types.ObjectId>;
  groupName?: string;
};

class ChatRepository {
  findConversationById(conversationId: string | Types.ObjectId) {
    return ConversationModel.findById(conversationId);
  }

  findConversationByParticipant(conversationId: string | Types.ObjectId, userId: string | Types.ObjectId) {
    return ConversationModel.findOne({ _id: conversationId, participants: userId });
  }

  findConversationForUser(conversationId: string | Types.ObjectId, userId: string | Types.ObjectId) {
    return ConversationModel.findOne({ _id: conversationId, participants: userId, hiddenBy: { $ne: userId } });
  }

  findGroupConversationForUser(conversationId: string | Types.ObjectId, userId: string | Types.ObjectId) {
    return ConversationModel.findOne({
      _id: conversationId,
      participants: userId,
      isGroup: true,
    });
  }

  findOrCreateConversation(senderId: string, receiverId: string) {
    const participants = [senderId, receiverId].sort();

    return ConversationModel.findOneAndUpdate(
      { participants, isGroup: { $ne: true } },
      {
        $setOnInsert: { participants, isGroup: false },
        $pull: { hiddenBy: { $in: participants } },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  }

  startDirectConversation(senderId: string, receiverId: string) {
    const participants = [senderId, receiverId].sort();

    return ConversationModel.findOneAndUpdate(
      { participants, isGroup: { $ne: true } },
      {
        $setOnInsert: {
          participants,
          isGroup: false,
          hiddenBy: [receiverId],
        },
        $pull: { hiddenBy: senderId },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  }

  createGroupConversation({ creatorId, memberIds, groupName }: CreateGroupConversationInput) {
    const participantIds = [creatorId, ...memberIds].map((id) => new mongoose.Types.ObjectId(id.toString()));
    const invitedIds = memberIds.map((id) => new mongoose.Types.ObjectId(id.toString()));

    return ConversationModel.create({
      participants: participantIds,
      hiddenBy: invitedIds,
      admins: [creatorId],
      createdBy: creatorId,
      isGroup: true,
      groupName,
      isUnread: false,
    });
  }

  async createMessage(conversation: ConversationDocument, input: SaveMessageInput, options: CreateMessageOptions = {}) {
    const message = await MessageModel.create({
      conversationId: conversation._id,
      sender: input.senderId,
      text: input.message,
      messageType: input.messageType || (input.isFeedback ? 'feedback' : input.sharedPostId ? 'post' : 'text'),
      isFeedback: Boolean(input.isFeedback),
      feedbackOn: input.isFeedback ? {
        type: input.feedbackOn,
        _id: input.feedbackOn === 'Post' ? input.postId : input.userId,
      } : undefined,
      sharedPost: input.sharedPostId,
    });

    conversation.lastMessage = message._id;
    conversation.isUnread = true;
    if (options.unhideParticipants !== false) {
      conversation.hiddenBy = [];
    }
    await conversation.save();

    return this.populateFeedbackDetails(message, options.receiverId);
  }

  getConversations(userId: string | Types.ObjectId) {
    const currentUserId = new mongoose.Types.ObjectId(userId.toString());

    return ConversationModel.aggregate([
      { $match: { participants: currentUserId, hiddenBy: { $ne: currentUserId } } },
      {
        $addFields: {
          otherUserId: {
            $cond: [
              '$isGroup',
              null,
              {
                $first: {
                  $filter: {
                    input: '$participants',
                    as: 'participant',
                    cond: { $ne: ['$$participant', currentUserId] },
                  },
                },
              },
            ],
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'otherUserId',
          foreignField: '_id',
          as: 'otherUser',
          pipeline: [{ $project: { userName: 1, profilePicture: 1, active: 1 } }],
        },
      },
      { $unwind: { path: '$otherUser', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'participants',
          foreignField: '_id',
          as: 'participantsInfo',
          pipeline: [{ $project: { userName: 1, profilePicture: 1, headline: 1, active: 1 } }],
        },
      },
      {
        $lookup: {
          from: 'collabrooms',
          localField: '_id',
          foreignField: 'conversationId',
          as: 'room',
          pipeline: [{ $project: { _id: 1 } }],
        },
      },
      {
        $lookup: {
          from: 'messages',
          localField: 'lastMessage',
          foreignField: '_id',
          as: 'lastMessage',
          pipeline: [{ $project: { text: 1, createdAt: 1, sender: 1, messageType: 1 } }],
        },
      },
      { $unwind: { path: '$lastMessage', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          roomId: { $first: '$room._id' },
        },
      },
      { $sort: { updatedAt: -1 } },
    ]);
  }

  getMessages(conversationId: string | Types.ObjectId, page: number, limit: number) {
    return MessageModel.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  findMessageById(messageId: string | Types.ObjectId) {
    return MessageModel.findById(messageId);
  }

  deleteMessage(messageId: string | Types.ObjectId) {
    return MessageModel.deleteOne({ _id: messageId });
  }

  findLatestMessage(conversationId: string | Types.ObjectId) {
    return MessageModel.findOne({ conversationId }).sort({ createdAt: -1 }).select('text createdAt sender messageType sharedPost').lean();
  }

  findFeedbackActivity(userId: string | Types.ObjectId, page: number, limit: number, skipLimit = limit) {
    return MessageModel.find({ sender: userId, isFeedback: true })
      .sort({ createdAt: -1 })
      .skip((page - 1) * skipLimit)
      .limit(limit)
      .populate({
        path: 'feedbackOn._id',
        select: { userName: 1, profilePicture: 1, caption: 1, media: { $slice: 1 } },
      })
      .lean();
  }

  findPostFeedbacks(postId: string | Types.ObjectId, page: number, limit: number) {
    return MessageModel.find({
      isFeedback: true,
      'feedbackOn.type': 'Post',
      'feedbackOn._id': postId,
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('sender', 'userName profilePicture headline')
      .lean();
  }

  async populateFeedbackDetails(message: MessageDocument, receiverId?: string | Types.ObjectId | null) {
    let output = message.toObject() as Record<string, unknown>;

    if (message.isFeedback) {
      const populated = await message.populate({
        path: 'feedbackOn._id',
        select: { userName: 1, profilePicture: 1, caption: 1, media: { $slice: 1 } },
      });
      output = populated.toObject() as Record<string, unknown>;
      const feedbackOn = output.feedbackOn as { _id?: Record<string, unknown>; type?: FeedbackTargetModel } | undefined;
      const data = feedbackOn?._id;

      if (data) {
        output.feedbackDetails = {
          _id: data._id,
          userName: data.userName,
          profilePicture: data.profilePicture,
          caption: data.caption,
          media: data.media,
          images: data.media,
          type: feedbackOn?.type,
        };
        output.feedbackOn = { type: feedbackOn?.type };
      }
    }

    if (message.messageType === 'post' && message.sharedPost) {
      const sharedPostDetails = await PostModel.findOne({ _id: message.sharedPost, isDeleting: { $ne: true } })
        .select({ caption: 1, media: { $slice: 1 }, user: 1, createdAt: 1, isProjectPost: 1 })
        .populate('user', 'userName profilePicture headline')
        .lean();

      output.sharedPostDetails = sharedPostDetails ? { ...sharedPostDetails, images: sharedPostDetails.media } : null;
    }

    return {
      ...output,
      receiverId,
    };
  }

  async enrichFeedbackMessages(messages: Array<Record<string, unknown>>) {
    return Promise.all(messages.map(async (message) => {
      const feedbackOn = message.feedbackOn as { type?: FeedbackTargetModel; _id?: Types.ObjectId } | undefined;
      const sharedPostId = message.sharedPost as Types.ObjectId | undefined;

      if (message.messageType === 'post' && sharedPostId) {
        const sharedPostDetails = await PostModel.findOne({ _id: sharedPostId, isDeleting: { $ne: true } })
          .select({ caption: 1, media: { $slice: 1 }, user: 1, createdAt: 1, isProjectPost: 1 })
          .populate('user', 'userName profilePicture headline')
          .lean();

        return {
          ...message,
          sharedPostDetails: sharedPostDetails ? { ...sharedPostDetails, images: (sharedPostDetails as { media?: unknown }).media } : null,
        };
      }

      if (!message.isFeedback || !feedbackOn?.type || !feedbackOn._id) return message;

      const details = feedbackOn.type === 'Post'
        ? await PostModel.findOne({ _id: feedbackOn._id, isDeleting: { $ne: true } }).select({ media: { $slice: 1 }, caption: 1, _id: 1 }).lean()
        : await UserModel.findById(feedbackOn._id).select('userName profilePicture _id').lean();

      return {
        ...message,
        feedbackDetails: details ? { ...details, type: feedbackOn.type, images: (details as { media?: unknown }).media } : null,
      };
    }));
  }
}

const chatRepository = new ChatRepository();

export { ChatRepository, type SaveMessageInput };
export default chatRepository;
