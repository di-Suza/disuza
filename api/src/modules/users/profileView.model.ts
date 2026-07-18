import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';

type ProfileView = {
  profileUser: Types.ObjectId;
  viewer: Types.ObjectId;
  viewerKey: string;
  createdAt: Date;
  updatedAt: Date;
};

type ProfileViewDocument = HydratedDocument<ProfileView>;
type ProfileViewModel = Model<ProfileView>;

const profileViewSchema = new mongoose.Schema<ProfileView, ProfileViewModel>(
  {
    profileUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    viewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    viewerKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
  },
  { timestamps: true },
);

profileViewSchema.index({ profileUser: 1, createdAt: -1 });
profileViewSchema.index({ profileUser: 1, viewerKey: 1, createdAt: -1 });

const ProfileViewModel = mongoose.models.ProfileView as ProfileViewModel
  || mongoose.model<ProfileView, ProfileViewModel>('ProfileView', profileViewSchema, 'profileviews');

export { type ProfileView, type ProfileViewDocument };
export default ProfileViewModel;
