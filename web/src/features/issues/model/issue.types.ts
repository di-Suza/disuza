export const issueCategories = ['Bug', 'Spam', 'Abuse', 'Technical', 'Other'] as const;
export const issueStatuses = ['Pending', 'In-Progress', 'Resolved', 'Dismissed'] as const;

export type IssueCategory = typeof issueCategories[number];
export type IssueStatus = typeof issueStatuses[number];

export type SubmitIssueRequest = {
  category: IssueCategory;
  description: string;
};

export type SubmitIssueResponse = {
  success: boolean;
  message: string;
};
