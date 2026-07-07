import type { Types } from 'mongoose';

import IssueModel, { type IssueCategory, type IssueDocument } from './issue.model.js';

type CreateIssueInput = {
  reporter: string | Types.ObjectId;
  category: IssueCategory;
  description: string;
};

class IssueRepository {
  findLatestByReporter(reporter: string | Types.ObjectId): Promise<IssueDocument | null> {
    return IssueModel.findOne({ reporter }).sort({ createdAt: -1 });
  }

  create(data: CreateIssueInput): Promise<IssueDocument> {
    return IssueModel.create({ ...data, status: 'Pending' });
  }
}

const issueRepository = new IssueRepository();

export { IssueRepository, type CreateIssueInput };
export default issueRepository;
