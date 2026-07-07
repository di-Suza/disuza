import { BadRequestError, ConflictError, NotFoundError } from '../../shared/errors/index.js';
import postRepository, { type PostRepository } from '../posts/post.repository.js';
import blockService, { type BlockService } from '../users/block/block.service.js';
import userRepository, { type UserRepository } from '../users/user.repository.js';
import reportRepository, { type ReportRepository } from './report.repository.js';
import { REPORT_REASONS, REPORT_TARGET_MODELS, type ReportReason, type ReportTargetModel } from './report.model.js';

type CreateReportInput = {
  targetId: string;
  onModel: ReportTargetModel;
  reason: ReportReason;
  description: string;
};

type ReportTarget = {
  ownerId: string;
  selfReportName: string;
};

class ReportService {
  constructor(
    private readonly reports: ReportRepository = reportRepository,
    private readonly posts: PostRepository = postRepository,
    private readonly users: UserRepository = userRepository,
    private readonly blockRules: BlockService = blockService,
  ) {}

  private normalizePage(pageInput: unknown): number {
    const page = Number(pageInput) || 1;
    return Math.max(page, 1);
  }

  private normalizeLimit(limitInput: unknown): number {
    const limit = Number(limitInput) || 10;
    return Math.min(Math.max(limit, 1), 20);
  }

  private assertSupportedInput(input: CreateReportInput) {
    if (!REPORT_TARGET_MODELS.includes(input.onModel)) {
      throw new BadRequestError('Invalid report target type! Must be Post, User, or Message.');
    }

    if (!REPORT_REASONS.includes(input.reason)) {
      throw new BadRequestError('Invalid report reason.');
    }

    if (!input.description?.trim()) {
      throw new BadRequestError('Description is required!');
    }
  }

  private async resolveTarget(input: CreateReportInput): Promise<ReportTarget> {
    if (input.onModel === 'Post') {
      const post = await this.posts.findVisibleActionTarget(input.targetId);

      if (!post) {
        throw new NotFoundError('Post not found!');
      }

      return {
        ownerId: post.user.toString(),
        selfReportName: 'post',
      };
    }

    if (input.onModel === 'User') {
      const user = await this.users.findById(input.targetId);

      if (!user) {
        throw new NotFoundError('User not found!');
      }

      return {
        ownerId: user._id.toString(),
        selfReportName: 'profile',
      };
    }

    throw new BadRequestError('Message reports will be available when the messaging module is ready.');
  }

  async createReport(userId: string, input: CreateReportInput) {
    this.assertSupportedInput(input);

    const target = await this.resolveTarget(input);

    if (target.ownerId === userId.toString()) {
      throw new BadRequestError(`You can't report your own ${target.selfReportName}!`);
    }

    await this.blockRules.ensureUsersCanInteract(userId, target.ownerId, 'report');

    const existingReport = await this.reports.findExisting(userId, input.targetId, input.onModel);

    if (existingReport) {
      throw new ConflictError(`You've already reported this ${input.onModel.toLowerCase()}!`);
    }

    return this.reports.create({
      reporter: userId,
      targetId: input.targetId,
      onModel: input.onModel,
      reason: input.reason,
      description: input.description.trim(),
    });
  }

  async getMyReports(userId: string, pageInput: unknown, limitInput: unknown) {
    const page = this.normalizePage(pageInput);
    const limit = this.normalizeLimit(limitInput);
    const [reports, totalReports] = await Promise.all([
      this.reports.findByReporter(userId, page, limit),
      this.reports.countByReporter(userId),
    ]);
    const skip = (page - 1) * limit;

    return {
      reports,
      page,
      totalReports,
      hasMore: skip + reports.length < totalReports,
    };
  }
}

const reportService = new ReportService();

export { ReportService, type CreateReportInput };
export default reportService;