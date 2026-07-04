type ApiErrorWithMessage = {
  data?: {
    message?: string;
  };
  message?: string;
};

export const getErrorMessage = (error: unknown, fallback = 'Something went wrong!'): string => {
  if (typeof error === 'string') return error;

  const apiError = error as ApiErrorWithMessage;
  return apiError.data?.message || apiError.message || fallback;
};
