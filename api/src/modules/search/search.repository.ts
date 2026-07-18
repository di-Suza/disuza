import type { Types } from 'mongoose';

import PostModel from '../posts/post.model.js';
import { visiblePostQuery } from '../posts/post.repository.js';
import UserModel from '../users/user.model.js';

type HiddenUserId = string | Types.ObjectId;

class SearchRepository {
  findUsers(searchRegex: RegExp, hiddenUserIds: HiddenUserId[], page: number, limit: number) {
    return UserModel.find({
      _id: { $nin: hiddenUserIds },
      active: { $ne: false },
      $or: [
        { userName: { $regex: searchRegex } },
        { email: { $regex: searchRegex } },
        { headline: { $regex: searchRegex } },
        { about: { $regex: searchRegex } },
        { skills: { $regex: searchRegex } },
        { interests: { $regex: searchRegex } },
        { languages: { $regex: searchRegex } },
      ],
    })
      .select('userName profilePicture headline profileContributions followersCount')
      .sort({ profileContributions: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  countUsers(searchRegex: RegExp, hiddenUserIds: HiddenUserId[]) {
    return UserModel.countDocuments({
      _id: { $nin: hiddenUserIds },
      active: { $ne: false },
      $or: [
        { userName: { $regex: searchRegex } },
        { email: { $regex: searchRegex } },
        { headline: { $regex: searchRegex } },
        { about: { $regex: searchRegex } },
        { skills: { $regex: searchRegex } },
        { interests: { $regex: searchRegex } },
        { languages: { $regex: searchRegex } },
      ],
    });
  }

  findPosts(searchRegex: RegExp, blockedUserIds: HiddenUserId[], page: number, limit: number) {
    return PostModel.find({
      ...visiblePostQuery,
      user: { $nin: blockedUserIds },
      $or: [
        { caption: { $regex: searchRegex } },
        { hashtags: { $regex: searchRegex } },
        { 'links.label': { $regex: searchRegex } },
        { 'links.url': { $regex: searchRegex } },
        { 'codeSnippet.language': { $regex: searchRegex } },
        { 'codeSnippet.code': { $regex: searchRegex } },
      ],
    })
      .populate('user', 'userName profilePicture headline')
      .sort({ createdAt: -1 })
      .select({ settings: 0, projectLinks: 0, media: { $slice: 1 } })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  countPosts(searchRegex: RegExp, blockedUserIds: HiddenUserId[]) {
    return PostModel.countDocuments({
      ...visiblePostQuery,
      user: { $nin: blockedUserIds },
      $or: [
        { caption: { $regex: searchRegex } },
        { hashtags: { $regex: searchRegex } },
        { 'links.label': { $regex: searchRegex } },
        { 'links.url': { $regex: searchRegex } },
        { 'codeSnippet.language': { $regex: searchRegex } },
        { 'codeSnippet.code': { $regex: searchRegex } },
      ],
    });
  }

  findTopContributors(hiddenUserIds: HiddenUserId[]) {
    return UserModel.find({ _id: { $nin: hiddenUserIds }, active: { $ne: false } })
      .sort({ profileContributions: -1, followersCount: -1, createdAt: -1 })
      .limit(5)
      .select('userName profilePicture headline profileContributions followersCount')
      .lean();
  }

  findTrendingPosts(blockedUserIds: HiddenUserId[], page: number, limit: number) {
    return PostModel.find({ ...visiblePostQuery, user: { $nin: blockedUserIds } })
      .populate('user', 'userName profilePicture headline')
      .sort({ 'counts.likes': -1, createdAt: -1 })
      .select({ settings: 0, projectLinks: 0, media: { $slice: 1 } })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  countTrendingPosts(blockedUserIds: HiddenUserId[]) {
    return PostModel.countDocuments({ ...visiblePostQuery, user: { $nin: blockedUserIds } });
  }
}

const searchRepository = new SearchRepository();

export { SearchRepository };
export default searchRepository;
