type ApiMeta = Record<string, unknown>;

type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type ApiSuccessResponse<TData = unknown> = {
  success: true;
  message?: string;
  data?: TData;
  meta?: ApiMeta;
};

type ApiListResponse<TItem = unknown> = ApiSuccessResponse<TItem[]> & {
  pagination?: PaginationMeta;
};

type ApiErrorResponse<TDetails = unknown> = {
  success: false;
  message: string;
  details: TDetails | null;
};

export type { ApiErrorResponse, ApiListResponse, ApiMeta, ApiSuccessResponse, PaginationMeta };
