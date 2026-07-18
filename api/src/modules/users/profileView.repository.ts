import mongoose, { type Types } from 'mongoose';

import ProfileViewModel from './profileView.model.js';

class ProfileViewRepository {
  findRecent(profileUser: string | Types.ObjectId, viewerKey: string, since: Date) {
    return ProfileViewModel.findOne({
      profileUser,
      viewerKey,
      createdAt: { $gte: since },
    }).select('_id').lean();
  }

  create(profileUser: string | Types.ObjectId, viewer: string | Types.ObjectId, viewerKey: string) {
    return ProfileViewModel.create({ profileUser, viewer, viewerKey });
  }

  countByDay(profileUser: string | Types.ObjectId, startDate: Date) {
    return ProfileViewModel.aggregate<{ _id: string; count: number }>([
      {
        $match: {
          profileUser: new mongoose.Types.ObjectId(profileUser.toString()),
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }
}

const profileViewRepository = new ProfileViewRepository();

export { ProfileViewRepository };
export default profileViewRepository;
