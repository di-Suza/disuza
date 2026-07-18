import { useCallback, useEffect, useState } from 'react';

import { useCreateReportMutation } from '@/features/reports/api/report.api';
import { reportReasons, type ReportReason, type ReportTargetModel } from '@/features/reports/model/report.types';
import { useLockBodyScroll } from '@/shared/hooks/useLockBodyScroll';
import { useToast } from '@/shared/hooks/useToast';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

type UseReportModalArgs = {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  onModel: ReportTargetModel;
};

export const useReportModal = ({ isOpen, onClose, onModel, targetId }: UseReportModalArgs) => {
  const { showError, showSuccess } = useToast();
  const [createReport, { isLoading }] = useCreateReportMutation();
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [description, setDescription] = useState('');

  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (isOpen) return;
    setReason('');
    setDescription('');
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setReason('');
    setDescription('');
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    if (!reason) {
      showError('Please select a report type');
      return;
    }

    if (!description.trim()) {
      showError('Please provide a reason for reporting');
      return;
    }

    try {
      const result = await createReport({
        targetId,
        onModel,
        reason,
        description: description.trim(),
      }).unwrap();

      showSuccess(result.message || `${onModel} report submitted successfully`);
      handleClose();
    } catch (error) {
      showError(getErrorMessage(error, 'Failed to submit report'));
    }
  }, [createReport, description, handleClose, onModel, reason, showError, showSuccess, targetId]);

  return {
    description,
    handleClose,
    handleSubmit,
    isSubmitting: isLoading,
    reason,
    reportReasons,
    setDescription,
    setReason,
  };
};