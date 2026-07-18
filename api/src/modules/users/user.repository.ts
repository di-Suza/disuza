import type { Types } from 'mongoose';

import UserModel, { type ProfilePicture, type User, type UserAddress, type UserDocument } from './user.model.js';

type CreateUserInput = Pick<User, 'userName' | 'email'> & Partial<Pick<User, 'password' | 'profilePicture' | 'isGoogleUser' | 'role'>>;

type GeneralInfoUpdate = Partial<Pick<User, 'headline' | 'about'>> & {
  address?: UserAddress;
};

type ProfessionalInfoUpdate = Partial<Pick<User, 'skills' | 'experiences' | 'educations' | 'handles' | 'interests' | 'languages'>>;

type UserCounterField = 'followersCount' | 'followingCount' | 'postsCount' | 'projectsCount' | 'profileContributions';

class UserRepository {
  create(data: CreateUserInput): Promise<UserDocument> {
    return UserModel.create(data);
  }

  findById(id: string | Types.ObjectId): Promise<UserDocument | null> {
    return UserModel.findOne({ _id: id, active: { $ne: false } });
  }

  findByIdWithPassword(id: string | Types.ObjectId): Promise<UserDocument | null> {
    return UserModel.findOne({ _id: id, active: { $ne: false } }).select('+password');
  }

  findProfileById(id: string | Types.ObjectId): Promise<UserDocument | null> {
    return UserModel.findOne({ _id: id, active: { $ne: false } }).select('-lastLoginAt -isGoogleUser');
  }

  findPublicById(id: string | Types.ObjectId) {
    return UserModel.findOne({ _id: id, active: { $ne: false } })
      .select('_id userName email role profilePicture headline about address followersCount followingCount postsCount projectsCount profileContributions active isGoogleUser lastLoginAt')
      .lean();
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return UserModel.findOne({ email: email.toLowerCase() });
  }

  findByEmailWithSecrets(email: string): Promise<UserDocument | null> {
    return UserModel.findOne({ email: email.toLowerCase() }).select('+password +lockUntil +loginAttempts +active');
  }

  async updateLoginSuccess(user: UserDocument): Promise<UserDocument> {
    user.lastLoginAt = new Date();
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    return user.save();
  }

  async incrementFailedLogin(user: UserDocument): Promise<UserDocument> {
    user.loginAttempts += 1;

    if (user.loginAttempts >= 5) {
      user.lockUntil = Date.now() + 15 * 60 * 1000;
      user.loginAttempts = 0;
    }

    return user.save();
  }

  async markGoogleLogin(user: UserDocument): Promise<UserDocument> {
    user.lastLoginAt = new Date();
    user.isGoogleUser = true;
    return user.save();
  }

  async updatePassword(userId: string | Types.ObjectId, password: string): Promise<UserDocument | null> {
    return UserModel.findOneAndUpdate(
      { _id: userId, active: { $ne: false } },
      {
        password,
        loginAttempts: 0,
        lockUntil: null,
      },
      { new: true },
    );
  }

  updateIdentity(userId: string | Types.ObjectId, data: { userName?: string; profilePicture?: ProfilePicture }) {
    return UserModel.findOneAndUpdate(
      { _id: userId, active: { $ne: false } },
      { $set: data },
      { new: true, runValidators: true },
    ).select('userName profilePicture');
  }

  updateGeneralInfo(userId: string | Types.ObjectId, data: GeneralInfoUpdate) {
    return UserModel.findOneAndUpdate(
      { _id: userId, active: { $ne: false } },
      { $set: data },
      { new: true, runValidators: true },
    ).select('headline about address');
  }

  async updateProfessionalInfo(userId: string | Types.ObjectId, data: ProfessionalInfoUpdate) {
    const user = await UserModel.findOne({ _id: userId, active: { $ne: false } });

    if (!user) return null;

    Object.assign(user, data);
    await user.save();

    return data;
  }

  incrementCounter(userId: string | Types.ObjectId, field: UserCounterField, value: number) {
    return UserModel.findOneAndUpdate(
      { _id: userId, active: { $ne: false } },
      { $inc: { [field]: value } },
      { new: true },
    );
  }

  markInactive(userId: string | Types.ObjectId) {
    return UserModel.findOneAndUpdate(
      { _id: userId, active: { $ne: false } },
      { active: false, deletedAt: new Date() },
      { new: true },
    ).select('_id email profilePicture');
  }

  findRecommendationUsers(ids: Array<string | Types.ObjectId>, limit: number) {
    return UserModel.find({ _id: { $in: ids }, active: { $ne: false } })
      .select('userName profilePicture headline profileContributions')
      .limit(limit)
      .lean();
  }

  findFallbackRecommendations(excludedIds: Array<string | Types.ObjectId>, limit: number) {
    return UserModel.find({ _id: { $nin: excludedIds }, active: { $ne: false } })
      .select('userName profilePicture headline profileContributions')
      .sort({ profileContributions: -1, followersCount: -1, createdAt: -1 })
      .limit(limit)
      .lean();
  }
}

const userRepository = new UserRepository();

export { UserRepository, type CreateUserInput, type GeneralInfoUpdate, type ProfessionalInfoUpdate, type UserCounterField };
export default userRepository;
