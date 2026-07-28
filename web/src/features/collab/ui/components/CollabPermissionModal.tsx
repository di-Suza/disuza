import { X } from 'lucide-react';
import { memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import {
  useAcceptCollabRequestMutation,
  useGetCollabStatusQuery,
  useSendCollabRequestMutation,
} from '@/features/collab/api/collab.api';
import { useDeleteNotificationMutation } from '@/features/notifications/api/notification.api';
import { useToast } from '@/shared/hooks/useToast';
import Button from '@/shared/ui/Button';
import LoadingSpinner from '@/shared/ui/LoadingSpinner';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import './CollabPermissionModal.css';

type CollabPermissionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  otherUser?: string;
  conversationId?: string;
};

const CollabPermissionModal = ({ isOpen, onClose, otherUser = 'this user', conversationId }: CollabPermissionModalProps) => {
  const navigate = useNavigate();
  const { showError } = useToast();
  const [deleteNotification] = useDeleteNotificationMutation();
  const {
    data: collabStatus,
    error: statusError,
    isError: isStatusError,
    isFetching: isStatusFetching,
    isLoading: isStatusLoading,
    refetch: refetchStatus,
  } = useGetCollabStatusQuery(conversationId || '', {
    skip: !conversationId,
    refetchOnMountOrArgChange: true,
  });
  const [sendCollabRequest, { isLoading: isSendingRequest }] = useSendCollabRequestMutation();
  const [acceptCollabRequest, { isLoading: isAcceptingRequest }] = useAcceptCollabRequestMutation();
  const statusData = collabStatus?.data;
  const isBusy = isStatusLoading || isStatusFetching || isSendingRequest || isAcceptingRequest;

  const handleSendCollabRequest = useCallback(async () => {
    if (!conversationId) return;
    try {
      await sendCollabRequest(conversationId).unwrap();
    } catch (error) {
      showError(getErrorMessage(error, 'Something went wrong while fetching status'));
    }
  }, [conversationId, sendCollabRequest, showError]);

  const handleOpenAcceptedRoom = useCallback(async () => {
    if (!statusData || statusData.status !== 'accepted') return;
    const notificationId = statusData.acceptedNotificationId;

    try {
      if (notificationId) await deleteNotification(notificationId).unwrap();
    } catch {
      // Room open should not be blocked by notification cleanup.
    } finally {
      navigate(`/collab/${statusData.roomId}`);
    }
  }, [deleteNotification, navigate, statusData]);

  const handleAcceptCollab = useCallback(async () => {
    if (!conversationId) return;

    try {
      const response = await acceptCollabRequest(conversationId).unwrap();
      const roomId = response?.data?._id;
      if (roomId) {
        onClose();
        navigate(`/collab/${roomId}`);
      }
    } catch (error) {
      showError(getErrorMessage(error, 'Something went wrong while accepting collab request'));
    }
  }, [acceptCollabRequest, conversationId, navigate, onClose, showError]);

  const handleRetryStatus = useCallback(() => {
    void refetchStatus();
  }, [refetchStatus]);

  if (!isOpen) return null;

  return createPortal(
    <div className="collab-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="collab-status-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="collab-icon-button collab-status-modal__close" onClick={onClose} aria-label="Close modal">
          <X size={18} aria-hidden="true" />
        </button>

        {isBusy ? (
          <LoadingSpinner className="collab-modal-state" label="Loading collaboration status" />
        ) : isStatusError ? (
          <div className="collab-modal-state">
            <h3>Collab status could not be loaded</h3>
            <p>{getErrorMessage(statusError, 'Please try again.')}</p>
            <Button variant="secondary" onClick={handleRetryStatus}>Retry</Button>
          </div>
        ) : (
          <>
            <header className="collab-status-modal__header">
              <h3>Collab Status with {otherUser} : {statusData?.message || 'Fetching...'}</h3>
            </header>

            <div className="collab-status-modal__body">
              {statusData?.status === 'none' && (
                <>
                  <p>Send Collaboration Invitation to {otherUser}</p>
                  <Button onClick={handleSendCollabRequest}>Send</Button>
                </>
              )}

              {statusData?.status === 'accepted' && (
                <>
                  <p>Room found</p>
                  <Button onClick={handleOpenAcceptedRoom}>Open Editor</Button>
                </>
              )}

              {statusData?.status === 'pending' && statusData.role === 'sender' && (
                <>
                  <p>Collaboration Invitation Sent to {otherUser}</p>
                  <Button disabled>Sent</Button>
                </>
              )}

              {statusData?.status === 'pending' && statusData.role === 'recipient' && (
                <>
                  <p>Received Collaboration Invitation from {otherUser}</p>
                  <Button onClick={handleAcceptCollab}>Accept</Button>
                </>
              )}

              {statusData?.status === 'blocked' && (
                <p>Collaboration unavailable</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default memo(CollabPermissionModal);
