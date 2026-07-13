type ApiSuccessResponse<TData = unknown> = {
  success: true;
  message?: string;
  data?: TData;
};

type ApiErrorResponse<TDetails = unknown> = {
  success: false;
  message: string;
  details?: TDetails | null;
};

type PaginatedResponse<TItem = unknown> = ApiSuccessResponse<TItem[]> & {
  page: number;
  hasMore: boolean;
};

export type { ApiErrorResponse, ApiSuccessResponse, PaginatedResponse };
