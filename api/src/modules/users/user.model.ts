import mongoose, { type HydratedDocument, type Model } from 'mongoose';

import { Roles, type Role } from '../../shared/constants/roles.js';

type ProfilePicture = {
  url: string;
  fileId: string;
};

type User = {
  userName: string;
  email: string;
  password?: string;
  role: Role;
  profilePicture: ProfilePicture;
  headline: string;
  about: string;
  skills: string[];
  experiences: Array<{
    companyName: string;
    timePeriod: string;
  }>;
  educations: Array<{
    collegeName: string;
    timePeriod: string;
    course: string;
  }>;
  interests: string[];
  languages: string[];
  followersCount: number;
  followingCount: number;
  projectsCount: number;
  postsCount: number;
  profileContributions: number;
  active: boolean;
  deletedAt: Date | null;
  lastLoginAt: Date;
  isGoogleUser: boolean;
  loginAttempts: number;
  lockUntil?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type UserDocument = HydratedDocument<User>;

type UserModel = Model<User>;

const userSchema = new mongoose.Schema<User, UserModel>(
  {
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    password: {
      type: String,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(Roles),
      default: Roles.USER,
      index: true,
    },
    profilePicture: {
      url: {
        type: String,
        default: 'https://ik.imagekit.io/disuza/DevloopFeed/ProfilePictures/defaultpp.jpg',
      },
      fileId: {
        type: String,
        default: '0',
      },
    },
    headline: { type: String, default: '' },
    about: { type: String, default: '' },
    skills: { type: [String], default: [] },
    experiences: {
      type: [
        {
          companyName: { type: String, default: '' },
          timePeriod: { type: String, default: '' },
        },
      ],
      default: [],
    },
    educations: {
      type: [
        {
          collegeName: { type: String, default: '' },
          timePeriod: { type: String, default: '' },
          course: { type: String, default: '' },
        },
      ],
      default: [],
    },
    interests: { type: [String], default: [] },
    languages: { type: [String], default: [] },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    projectsCount: { type: Number, default: 0 },
    postsCount: { type: Number, default: 0 },
    profileContributions: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: Date.now },
    isGoogleUser: { type: Boolean, default: false },
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Number, default: null, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        const output = ret as Record<string, unknown>;
        delete output.password;
        delete output.__v;
        delete output.lockUntil;
        delete output.loginAttempts;
        return output;
      },
    },
    toObject: {
      transform(_doc, ret) {
        const output = ret as Record<string, unknown>;
        delete output.password;
        delete output.__v;
        delete output.lockUntil;
        delete output.loginAttempts;
        return output;
      },
    },
  },
);

const UserModel = mongoose.models.User as UserModel || mongoose.model<User, UserModel>('User', userSchema, 'users');

export { type ProfilePicture, type User, type UserDocument };
export default UserModel;