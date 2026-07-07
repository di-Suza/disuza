import { useCallback, useEffect, useState, type ChangeEvent } from 'react';

import { useSubmitIssueMutation } from '@/features/issues/api/issue.api';
import { issueCategories, type IssueCategory } from '@/features/issues/model/issue.types';
import { useLockBodyScroll } from '@/shared/hooks/useLockBodyScroll';
import { useToast } from '@/shared/hooks/useToast';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

type UseReportAProblemModalArgs = {
  isOpen: boolean;
  onClose: () => void;
};

export const useReportAProblemModal = ({ isOpen, onClose }: UseReportAProblemModalArgs) => {
  const { showError, showSuccess } = useToast();
  const [submitIssue, { isLoading }] = useSubmitIssueMutation();
  const [category, setCategory] = useState<IssueCategory>('Bug');
  const [description, setDescription] = useState('');

  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (isOpen) return;
    setCategory('Bug');
    setDescription('');
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setCategory('Bug');
    setDescription('');
    onClose();
  }, [onClose]);

  const handleCategoryChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setCategory(event.target.value as IssueCategory);
  }, []);

  const handleDescriptionChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(event.target.value);
  }, []);

  const handleSubmit = useCallback(async () => {
    const normalizedDescription = description.trim();

    if (!normalizedDescription) {
      showError('Please provide a description');
      return;
    }

    try {
      const result = await submitIssue({ category, description: normalizedDescription }).unwrap();
      showSuccess(result.message || 'Report submitted successfully');
      handleClose();
    } catch (error) {
      showError(getErrorMessage(error, 'Something went wrong! Please try again after sometime!'));
    }
  }, [category, description, handleClose, showError, showSuccess, submitIssue]);

  return {
    categories: issueCategories,
    category,
    description,
    handleCategoryChange,
    handleClose,
    handleDescriptionChange,
    handleSubmit,
    isSubmitting: isLoading,
  };
};
