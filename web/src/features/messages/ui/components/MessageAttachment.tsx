import { Download, FileText, Loader2 } from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';

import { useAppSelector } from '@/app/store/hooks';
import type { ChatAttachment } from '@/features/messages/model/chat.types';
import env from '@/shared/config/env';

type MessageAttachmentProps = {
  attachment: ChatAttachment;
};

const getAttachmentUrl = (downloadUrl?: string) => {
  if (!downloadUrl) return '';
  if (/^https?:\/\//i.test(downloadUrl)) return downloadUrl;
  return `${env.apiBaseUrl}${downloadUrl.startsWith('/') ? downloadUrl : `/${downloadUrl}`}`;
};

const MessageAttachment = ({ attachment }: MessageAttachmentProps) => {
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const [objectUrl, setObjectUrl] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(attachment.downloadUrl));
  const [isError, setIsError] = useState(false);
  const attachmentUrl = useMemo(() => getAttachmentUrl(attachment.downloadUrl), [attachment.downloadUrl]);
  const fileName = attachment.name || 'Attachment';

  useEffect(() => {
    if (!attachmentUrl || !accessToken) {
      setIsLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    let nextObjectUrl = '';

    setIsLoading(true);
    setIsError(false);

    fetch(attachmentUrl, {
      credentials: 'include',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error('Attachment could not be loaded');
        return response.blob();
      })
      .then((blob) => {
        nextObjectUrl = URL.createObjectURL(blob);
        setObjectUrl(nextObjectUrl);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setIsError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => {
      controller.abort();
      if (nextObjectUrl) URL.revokeObjectURL(nextObjectUrl);
    };
  }, [accessToken, attachmentUrl]);

  if (isLoading || !attachment.downloadUrl) {
    return (
      <div className="messages-v1-attachment-card">
        <Loader2 className="spin" size={16} aria-hidden="true" />
        <span>{attachment.downloadUrl ? 'Loading attachment...' : 'Uploading attachment...'}</span>
      </div>
    );
  }

  if (isError || !objectUrl) {
    return (
      <div className="messages-v1-attachment-card is-error">
        <FileText size={16} aria-hidden="true" />
        <span>Attachment unavailable</span>
      </div>
    );
  }

  if (attachment.mediaType === 'image') {
    return (
      <a className="messages-v1-attachment-media" href={objectUrl} download={fileName} aria-label={`Download ${fileName}`}>
        <img src={objectUrl} alt={fileName} loading="lazy" />
      </a>
    );
  }

  if (attachment.mediaType === 'video') {
    return (
      <video className="messages-v1-attachment-media" src={objectUrl} controls preload="metadata" />
    );
  }

  if (attachment.mediaType === 'audio') {
    return (
      <div className="messages-v1-attachment-audio">
        <span>{fileName}</span>
        <audio src={objectUrl} controls preload="metadata" />
      </div>
    );
  }

  return (
    <a className="messages-v1-attachment-file" href={objectUrl} download={fileName}>
      <FileText size={18} aria-hidden="true" />
      <span>{fileName}</span>
      <Download size={16} aria-hidden="true" />
    </a>
  );
};

export default memo(MessageAttachment);
