import type { Types } from 'mongoose';

import UserModel, { type User, type UserDocument } from './user.model.js';

type CreateUserInput = Pick<User, 'userName' | 'email'> & Partial<Pick<User, 'password' | 'profilePicture' | 'isGoogleUser' | 'role'>>;

class UserRepository {
  create(data: CreateUserInput): Promise<UserDocument> {
    return UserModel.create(data);
  }

  findById(id: string | Types.ObjectId): Promise<UserDocument | null> {
    return UserModel.findOne({ _id: id, active: { $ne: false } });
  }

  findPublicById(id: string | Types.ObjectId) {
    return UserModel.findOne({ _id: id, active: { $ne: false } })
      .select('_id userName email role profilePicture active isGoogleUser lastLoginAt')
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
}

const userRepository = new UserRepository();

export { UserRepository, type CreateUserInput };
export default userRepository;