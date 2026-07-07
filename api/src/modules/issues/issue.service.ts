import { BadRequestError, TooManyRequestsError } from '../../shared/errors/index.js';
import issueRepository, { type IssueRepository } from './issue.repository.js';
import { ISSUE_CATEGORIES, type IssueCategory } from './issue.model.js';

const ISSUE_SUBMISSION_COOLDOWN_MS = 5 * 60 * 1000;

type CreateIssueInput = {
  category?: IssueCategory;
  description: string;
};

class IssueService {
  constructor(private readonly issues: IssueRepository = issueRepository) {}

  private assertSupportedInput(input: CreateIssueInput) {
    if (input.category && !ISSUE_CATEGORIES.includes(input.category)) {
      throw new BadRequestError('Invalid issue category.');
    }

    if (!input.description?.trim()) {
      throw new BadRequestError('Please give proper description.');
    }
  }

  private assertCooldownPassed(lastIssueCreatedAt?: Date) {
    if (!lastIssueCreatedAt) return;

    const elapsedTime = Date.now() - new Date(lastIssueCreatedAt).getTime();

    if (elapsedTime < ISSUE_SUBMISSION_COOLDOWN_MS) {
      throw new TooManyRequestsError('You just submitted a problem, please wait for 5 minutes');
    }
  }

  async createIssue(userId: string, input: CreateIssueInput) {
    this.assertSupportedInput(input);

    const latestIssue = await this.issues.findLatestByReporter(userId);
    this.assertCooldownPassed(latestIssue?.createdAt);

    const category = input.category || 'Bug';

    await this.issues.create({
      reporter: userId,
      category,
      description: input.description.trim(),
    });

    return {
      message: `${category} Report Submitted Successfully!`,
    };
  }
}

const issueService = new IssueService();

export { IssueService, ISSUE_SUBMISSION_COOLDOWN_MS, type CreateIssueInput };
export default issueService;
