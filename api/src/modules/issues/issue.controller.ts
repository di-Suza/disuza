import type { Request, RequestHandler, Response } from 'express';

import asyncHandler from '../../shared/utils/asyncHandler.js';
import issueService, { type IssueService } from './issue.service.js';

class IssueController {
  readonly createIssue: RequestHandler;

  constructor(private readonly service: IssueService = issueService) {
    this.createIssue = asyncHandler(this.handleCreateIssue.bind(this));
  }

  private async handleCreateIssue(req: Request, res: Response) {
    const result = await this.service.createIssue(req.user!.id, req.body);

    res.status(201).json({
      success: true,
      message: result.message,
    });
  }
}

const issueController = new IssueController();

export { IssueController };
export default issueController;
