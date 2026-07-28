import { Check, Copy, Loader2, Send, Share2, UserRound, X } from 'lucide-react';
import { memo, useCallback, useMemo, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import { useGetConversationsQuery, useSendMessageMutation } from '@/features/messages/api/chat.api';
import { getConversationTitle } from '@/features/messages/model/chat.helpers';
import type { ChatConversation } from '@/features/messages/model/chat.types';
import type { Post } from '@/features/posts/model/post.types';
import { useLockBodyScroll } from '@/shared/hooks/useLockBodyScroll';
import { useToast } from '@/shared/hooks/useToast';
import Button from '@/shared/ui/Button';
import LoadingSpinner from '@/shared/ui/LoadingSpinner';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import '../posts.css';

type SharePostModalProps = {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
};

const getConversationAvatar = (conversation: ChatConversation) => {
  const url = conversation.otherUser?.profilePicture?.url;
  return typeof url === 'string' && url.trim() ? url : '';
};

const SharePostModal = ({ isOpen, onClose, post }: SharePostModalProps) => {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [selectedConversationId, setSelectedConversationId] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const { data, isFetching } = useGetConversationsQuery(undefined, { skip: !isOpen });
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();
  const conversations = data?.conversations || [];

  useLockBodyScroll(isOpen);

  const postUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/post/${post._id}`;
  }, [post._id]);

  const selectedConversation = conversations.find((conversation) => conversation._id === selectedConversationId);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      showSuccess('Post link copied.');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      showError('Post link could not be copied.');
    }
  }, [postUrl, showError, showSuccess]);

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedConversation) {
      showError('Select a conversation.');
      return;
    }

    const receiverId = selectedConversation.otherUser?._id;

    try {
      const result = await sendMessage({
        conversationId: selectedConversation._id,
        receiverId,
        message: message.trim(),
        messageType: 'post',
        sharedPostId: post._id,
      }).unwrap();

      showSuccess(result.message || 'Post shared.');
      onClose();
      navigate('/messages', {
        state: {
          openConversationId: result.newMessage?.conversationId || selectedConversation._id,
          openChatUserId: receiverId,
        },
      });
    } catch (error) {
      showError(getErrorMessage(error, 'Post could not be shared.'));
    }
  }, [message, navigate, onClose, post._id, selectedConversation, sendMessage, showError, showSuccess]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop share-post-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <form className="share-post-modal" onSubmit={handleSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="share-post-modal__close" onClick={onClose} aria-label="Close share modal">
          <X size={19} aria-hidden="true" />
        </button>

        <header className="share-post-modal__header">
          <span><Share2 size={20} aria-hidden="true" /></span>
          <div>
            <p>Share</p>
            <h2>Send post</h2>
          </div>
        </header>

        <div className="share-post-modal__copy">
          <span>{postUrl}</span>
          <Button variant="secondary" onClick={copyLink}>
            {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>

        <label className="share-post-modal__note">
          <span>Message</span>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Add a note..." maxLength={600} />
        </label>

        <section className="share-post-modal__conversations">
          <div className="share-post-modal__section-title">
            <span>Conversations</span>
            {isFetching && <Loader2 className="spin" size={15} aria-hidden="true" />}
          </div>

          {conversations.length > 0 ? (
            <div className="share-post-modal__list">
              {conversations.map((conversation) => {
                const isSelected = selectedConversationId === conversation._id;
                const avatarUrl = getConversationAvatar(conversation);
                const isUnavailable = Boolean(conversation.isBlocked || conversation.hasBlockedMe || conversation.isUnavailable);

                return (
                  <button
                    type="button"
                    key={conversation._id}
                    className={isSelected ? 'is-selected' : ''}
                    disabled={isUnavailable}
                    onClick={() => setSelectedConversationId(conversation._id)}
                  >
                    <span>{avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound size={18} aria-hidden="true" />}</span>
                    <strong>{getConversationTitle(conversation)}</strong>
                    {isUnavailable && <small>Unavailable</small>}
                  </button>
                );
              })}
            </div>
          ) : (
            isFetching ? <LoadingSpinner className="share-post-modal__empty" label="Loading conversations" /> : <p className="share-post-modal__empty">No conversations yet.</p>
          )}
        </section>

        <footer className="share-post-modal__footer">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!selectedConversationId} isLoading={isSending} loadingLabel="Sending post">
            <Send size={17} aria-hidden="true" />
            Send
          </Button>
        </footer>
      </form>
    </div>,
    document.body,
  );
};

export default memo(SharePostModal);
