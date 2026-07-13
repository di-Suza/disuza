type ApiErrorWithMessage = {
  data?: {
    message?: string;
  };
  message?: string;
};

export const getErrorMessage = (error: unknown, fallback = 'Something went wrong!'): string => {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (typeof error !== 'object') return fallback;

  const apiError = error as ApiErrorWithMessage;
  return apiError.data?.message || apiError.message || fallback;
};
