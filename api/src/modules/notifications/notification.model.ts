import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';

const NOTIFICATION_TYPES = ['LIKE', 'FOLLOW', 'COMMENT', 'COMMENT_REPLY', 'COLLAB_REQUEST', 'COLLAB_ACCEPTED'] as const;
const NOTIFICATION_TARGET_MODELS = ['Post', 'User', 'Comment', 'CollabRequest', 'CollabRoom'] as const;

type NotificationType = typeof NOTIFICATION_TYPES[number];
type NotificationTargetModel = typeof NOTIFICATION_TARGET_MODELS[number];

type Notification = {
  isRead: boolean;
  type: NotificationType;
  contentId?: Types.ObjectId;
  onModel?: NotificationTargetModel;
  recipient: Types.ObjectId;
  sender: Types.ObjectId;
  expiresAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type NotificationDocument = HydratedDocument<Notification>;
type NotificationModel = Model<Notification>;

const notificationSchema = new mongoose.Schema<Notification, NotificationModel>(
  {
    isRead: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'onModel',
    },
    onModel: {
      type: String,
      enum: NOTIFICATION_TARGET_MODELS,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ sender: 1, recipient: 1, type: 1, contentId: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: 'date' } } });

const NotificationModel = mongoose.models.Notification as NotificationModel
  || mongoose.model<Notification, NotificationModel>('Notification', notificationSchema, 'notifications');

export { NOTIFICATION_TARGET_MODELS, NOTIFICATION_TYPES, type Notification, type NotificationDocument, type NotificationTargetModel, type NotificationType };
export default NotificationModel;
