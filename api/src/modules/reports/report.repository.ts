import type { Types } from 'mongoose';

import ReportModel, { type ReportDocument, type ReportReason, type ReportTargetModel } from './report.model.js';

type CreateReportInput = {
  reporter: string | Types.ObjectId;
  targetId: string | Types.ObjectId;
  onModel: ReportTargetModel;
  reason: ReportReason;
  description: string;
};

class ReportRepository {
  findExisting(reporter: string | Types.ObjectId, targetId: string | Types.ObjectId, onModel: ReportTargetModel): Promise<ReportDocument | null> {
    return ReportModel.findOne({ reporter, targetId, onModel });
  }

  create(data: CreateReportInput): Promise<ReportDocument> {
    return ReportModel.create({ ...data, status: 'Pending' });
  }

  findByReporter(reporter: string | Types.ObjectId, page: number, limit: number) {
    return ReportModel.find({ reporter })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: 'targetId',
        select: 'caption media userName profilePicture headline createdAt',
      })
      .lean();
  }

  countByReporter(reporter: string | Types.ObjectId) {
    return ReportModel.countDocuments({ reporter });
  }
}

const reportRepository = new ReportRepository();

export { ReportRepository, type CreateReportInput };
export default reportRepository;