import type { Request, RequestHandler, Response } from 'express';

import asyncHandler from '../../shared/utils/asyncHandler.js';
import reportService, { type ReportService } from './report.service.js';

class ReportController {
  readonly createReport: RequestHandler;
  readonly reportPost: RequestHandler;
  readonly getMyReports: RequestHandler;

  constructor(private readonly service: ReportService = reportService) {
    this.createReport = asyncHandler(this.handleCreateReport.bind(this));
    this.reportPost = asyncHandler(this.handleReportPost.bind(this));
    this.getMyReports = asyncHandler(this.handleGetMyReports.bind(this));
  }

  private async handleCreateReport(req: Request, res: Response) {
    const report = await this.service.createReport(req.user!.id, req.body);

    res.status(201).json({
      success: true,
      message: `${req.body.onModel} Reported Successfully!`,
      report,
    });
  }

  private async handleReportPost(req: Request, res: Response) {
    const report = await this.service.createReport(req.user!.id, {
      ...req.body,
      onModel: 'Post',
    });

    res.status(201).json({
      success: true,
      message: 'Post Reported Successfully!',
      report,
    });
  }

  private async handleGetMyReports(req: Request, res: Response) {
    const data = await this.service.getMyReports(req.user!.id, req.query.page, req.query.limit);

    res.status(200).json({
      success: true,
      ...data,
    });
  }
}

const reportController = new ReportController();

export { ReportController };
export default reportController;