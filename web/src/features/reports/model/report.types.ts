import type { Post } from '@/features/posts/model/post.types';
import type { UserProfile } from '@/features/users/model/user.types';

export const reportReasons = ['Spam', 'Inappropriate Content', 'Harassment', 'Violence', 'Hate Speech', 'Other'] as const;

export type ReportReason = typeof reportReasons[number];
export type ReportTargetModel = 'Post' | 'User' | 'Message';
export type ReportStatus = 'Pending' | 'Reviewed' | 'Resolved' | 'Dismissed';

export type CreateReportRequest = {
  targetId: string;
  onModel: ReportTargetModel;
  reason: ReportReason;
  description: string;
};

export type Report = {
  _id: string;
  reporter: string;
  targetId?: Post | UserProfile | string | null;
  onModel: ReportTargetModel;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  response?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateReportResponse = {
  success: boolean;
  message: string;
  report: Report;
};

export type MyReportsResponse = {
  success: boolean;
  reports: Report[];
  page: number;
  totalReports: number;
  hasMore: boolean;
};

export type MyReportsQueryArgs = {
  page?: number;
  limit?: number;
};