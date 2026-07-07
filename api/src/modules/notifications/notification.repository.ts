import mongoose, { type Types } from 'mongoose';

import NotificationModel, { type NotificationDocument, type NotificationTargetModel, type NotificationType } from './notification.model.js';

type CreateNotificationData = {
  sender: string | Types.ObjectId;
  recipient: string | Types.ObjectId;
  type: NotificationType;
  contentId?: string | Types.ObjectId;
  onModel?: NotificationTargetModel;
  expiresAt?: Date | null;
};

type NotificationFilter = {
  sender?: string | Types.ObjectId;
  recipient?: string | Types.ObjectId;
  type?: NotificationType;
  contentId?: string | Types.ObjectId;
  onModel?: NotificationTargetModel;
};

class NotificationRepository {
  create(data: CreateNotificationData): Promise<NotificationDocument> {
    return NotificationModel.create(data);
  }

  findPopulatedById(notificationId: string | Types.ObjectId) {
    return NotificationModel.findById(notificationId)
      .populate('sender', 'userName profilePicture headline')
      .populate({
        path: 'contentId',
        select: 'caption media userName profilePicture headline comment post conversationId',
        options: { strictPopulate: false },
        populate: {
          path: 'post',
          select: 'caption media',
          options: { strictPopulate: false },
        },
      })
      .lean();
  }

  findByRecipient(recipient: string | Types.ObjectId, blockedUserIds: Types.ObjectId[], page: number, limit: number) {
    return NotificationModel.find({
      recipient,
      ...(blockedUserIds.length > 0 ? { sender: { $nin: blockedUserIds } } : {}),
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'userName profilePicture headline')
      .populate({
        path: 'contentId',
        select: 'caption media userName profilePicture headline comment post conversationId',
        options: { strictPopulate: false },
        populate: {
          path: 'post',
          select: 'caption media',
          options: { strictPopulate: false },
        },
      })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  countUnreadByRecipient(recipient: string | Types.ObjectId, blockedUserIds: Types.ObjectId[]) {
    return NotificationModel.countDocuments({
      recipient,
      isRead: false,
      ...(blockedUserIds.length > 0 ? { sender: { $nin: blockedUserIds } } : {}),
    });
  }

  markAllRead(recipient: string | Types.ObjectId) {
    return NotificationModel.updateMany({ recipient, isRead: false }, { $set: { isRead: true } });
  }

  deleteOwnedById(notificationId: string | Types.ObjectId, recipient: string | Types.ObjectId) {
    return NotificationModel.findOneAndDelete({ _id: notificationId, recipient });
  }

  deleteAllByRecipient(recipient: string | Types.ObjectId) {
    return NotificationModel.deleteMany({ recipient });
  }

  deleteByFilter(filter: NotificationFilter) {
    return NotificationModel.findOneAndDelete(filter);
  }

  findOne(filter: NotificationFilter) {
    return NotificationModel.findOne(filter).select('_id').lean();
  }

  deleteManyByIds(notificationIds: Array<string | Types.ObjectId>) {
    return NotificationModel.deleteMany({ _id: { $in: notificationIds } });
  }

  toObjectId(value: string | Types.ObjectId) {
    return new mongoose.Types.ObjectId(value.toString());
  }
}

const notificationRepository = new NotificationRepository();

export { NotificationRepository, type CreateNotificationData, type NotificationFilter };
export default notificationRepository;
