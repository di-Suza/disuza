import ImageKit, { toFile } from '@imagekit/nodejs';
import { randomUUID } from 'node:crypto';

import env from '../../config/env.js';
import logger from '../../config/logger.js';
import AppError from '../../shared/errors/AppError.js';
import { BadRequestError } from '../../shared/errors/index.js';
import HttpStatus from '../../shared/constants/httpStatus.js';
import {
  AUDIO_MIME_EXTENSION_MAP,
  CHAT_ATTACHMENT_MAX_SIZE_BYTES,
  CHAT_FILE_EXTENSION_FALLBACK,
  IMAGE_MIME_EXTENSION_MAP,
  MEDIA_FOLDERS,
  MEDIA_MIME_EXTENSION_MAP,
  MEDIA_TAGS,
  VIDEO_MIME_EXTENSION_MAP,
} from './media.constants.js';
import type { ClientUploadAuth, MediaKind, StoredMedia, UploadImageInput, UploadMediaInput } from './media.types.js';

class MediaService {
  private client?: ImageKit;

  private getClient(): ImageKit {
    if (!env.IMAGEKIT_PRIVATE_KEY) {
      throw new AppError('Media storage is not configured.', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    this.client ??= new ImageKit({ privateKey: env.IMAGEKIT_PRIVATE_KEY });
    return this.client;
  }

  private getMediaType(file: Express.Multer.File): MediaKind {
    if (file.mimetype in IMAGE_MIME_EXTENSION_MAP) return 'image';
    if (file.mimetype in VIDEO_MIME_EXTENSION_MAP) return 'video';
    if (file.mimetype in AUDIO_MIME_EXTENSION_MAP) return 'audio';

    throw new BadRequestError('Please attach only image or video files!');
  }

  private getChatAttachmentType(file: Express.Multer.File): MediaKind {
    if (file.mimetype in IMAGE_MIME_EXTENSION_MAP) return 'image';
    if (file.mimetype in VIDEO_MIME_EXTENSION_MAP) return 'video';
    if (file.mimetype in AUDIO_MIME_EXTENSION_MAP) return 'audio';
    return 'file';
  }

  private getMediaExtension(file: Express.Multer.File): string {
    const extension = MEDIA_MIME_EXTENSION_MAP[file.mimetype as keyof typeof MEDIA_MIME_EXTENSION_MAP];

    if (!extension) {
      throw new BadRequestError('Please attach only image or video files!');
    }

    return extension;
  }

  private getChatAttachmentExtension(file: Express.Multer.File): string {
    const mappedExtension = MEDIA_MIME_EXTENSION_MAP[file.mimetype as keyof typeof MEDIA_MIME_EXTENSION_MAP];
    if (mappedExtension) return mappedExtension;

    const extension = file.originalname.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
    return extension || CHAT_FILE_EXTENSION_FALLBACK;
  }

  private assertExpectedType(file: Express.Multer.File, expectedType?: MediaKind): MediaKind {
    const mediaType = this.getMediaType(file);

    if (expectedType && mediaType !== expectedType) {
      throw new BadRequestError(expectedType === 'image' ? 'Please attach only image files!' : 'Please attach only video files!');
    }

    return mediaType;
  }

  private assertFileSize(file: Express.Multer.File, mediaType: MediaKind): void {
    const maxSize = mediaType === 'image' ? env.MEDIA_MAX_FILE_SIZE_BYTES : env.MEDIA_MAX_VIDEO_FILE_SIZE_BYTES;

    if (file.size > maxSize) {
      const maxSizeMb = Math.floor(maxSize / (1024 * 1024));
      throw new BadRequestError(`${mediaType === 'image' ? 'Image' : 'Video'} file must be ${maxSizeMb}MB or smaller.`);
    }
  }

  private createFileName(prefix: string, file: Express.Multer.File): string {
    const safePrefix = prefix
      .trim()
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'media';

    return `${safePrefix}-${Date.now()}-${randomUUID()}.${this.getMediaExtension(file)}`;
  }

  private createChatAttachmentFileName(prefix: string, file: Express.Multer.File): string {
    const safePrefix = prefix
      .trim()
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'chat';

    return `${safePrefix}-${Date.now()}-${randomUUID()}.${this.getChatAttachmentExtension(file)}`;
  }

  private assertChatAttachmentSize(file: Express.Multer.File): void {
    if (file.size > CHAT_ATTACHMENT_MAX_SIZE_BYTES) {
      throw new BadRequestError('Chat attachment must be 2MB or smaller.');
    }
  }

  private assertStoredMedia(response: ImageKit.FileUploadResponse, mediaType: MediaKind, fallbackMime: string): StoredMedia {
    if (!response.url || !response.fileId) {
      throw new AppError('Media upload did not return required storage metadata.', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const mime = typeof response.metadata?.mimeType === 'string' ? response.metadata.mimeType : fallbackMime;

    return {
      url: response.url,
      fileId: response.fileId,
      mediaType,
      filePath: response.filePath,
      name: response.name,
      thumbnailUrl: response.thumbnailUrl,
      width: response.width,
      height: response.height,
      size: response.size,
      mime,
    };
  }

  isManagedFileId(fileId?: string | null): fileId is string {
    return Boolean(fileId && fileId !== '0' && fileId !== 'external');
  }

  async uploadMedia(input: UploadMediaInput): Promise<StoredMedia> {
    const client = this.getClient();
    const mediaType = this.assertExpectedType(input.file, input.expectedType);
    this.assertFileSize(input.file, mediaType);

    const fileName = this.createFileName(input.fileNamePrefix, input.file);

    try {
      const response = await client.files.upload({
        file: await toFile(input.file.buffer, input.file.originalname, { type: input.file.mimetype }),
        fileName,
        folder: input.folder,
        tags: input.tags,
        useUniqueFileName: false,
      });

      return this.assertStoredMedia(response, mediaType, input.file.mimetype);
    } catch (error) {
      logger.error({ error, folder: input.folder, mediaType }, 'ImageKit upload failed');
      throw new AppError('Media upload failed. Please try again.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  uploadImage(input: UploadImageInput): Promise<StoredMedia> {
    return this.uploadMedia({ ...input, expectedType: 'image' });
  }

  uploadProfilePicture(file: Express.Multer.File, userId: string): Promise<StoredMedia> {
    return this.uploadImage({
      file,
      folder: MEDIA_FOLDERS.profilePictures,
      fileNamePrefix: `profile-${userId}`,
      tags: [MEDIA_TAGS.profilePicture, `user-${userId}`],
    });
  }

  uploadPostMedia(files: Express.Multer.File[], userId: string, postId: string): Promise<StoredMedia[]> {
    return Promise.all(
      files.map((file, index) => {
        const mediaType = this.getMediaType(file);

        return this.uploadMedia({
          file,
          folder: MEDIA_FOLDERS.postMedia(userId, postId),
          fileNamePrefix: `post-${userId}-${postId}-${index}`,
          tags: [
            MEDIA_TAGS.postMedia,
            mediaType === 'image' ? MEDIA_TAGS.postImage : MEDIA_TAGS.postVideo,
            `user-${userId}`,
            `post-${postId}`,
          ],
        });
      }),
    );
  }

  uploadPostImages(files: Express.Multer.File[], userId: string, postId: string): Promise<StoredMedia[]> {
    return this.uploadPostMedia(files, userId, postId);
  }

  async uploadChatAttachment(file: Express.Multer.File, userId: string, conversationId: string): Promise<StoredMedia> {
    const client = this.getClient();
    const mediaType = this.getChatAttachmentType(file);
    this.assertChatAttachmentSize(file);

    try {
      const response = await client.files.upload({
        file: await toFile(file.buffer, file.originalname, { type: file.mimetype }),
        fileName: this.createChatAttachmentFileName(`chat-${conversationId}-${userId}`, file),
        folder: MEDIA_FOLDERS.chatAttachments(conversationId),
        tags: [
          MEDIA_TAGS.chatAttachment,
          `conversation-${conversationId}`,
          `user-${userId}`,
          `chat-${mediaType}`,
        ],
        useUniqueFileName: false,
      });

      return this.assertStoredMedia(response, mediaType, file.mimetype);
    } catch (error) {
      logger.error({ error, conversationId, mediaType }, 'Chat attachment upload failed');
      throw new AppError('Attachment upload failed. Please try again.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteFile(fileId?: string | null): Promise<void> {
    if (!this.isManagedFileId(fileId)) return;

    try {
      await this.getClient().files.delete(fileId);
    } catch (error) {
      logger.error({ error, fileId }, 'ImageKit file delete failed');
      throw new AppError('Media delete from storage failed.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async tryDeleteFile(fileId?: string | null): Promise<boolean> {
    if (!this.isManagedFileId(fileId)) return false;

    try {
      await this.getClient().files.delete(fileId);
      return true;
    } catch (error) {
      logger.warn({ error, fileId }, 'ImageKit file cleanup failed');
      return false;
    }
  }

  async deleteMany(fileIds: string[]): Promise<void> {
    const managedFileIds = fileIds.filter((fileId) => this.isManagedFileId(fileId));

    if (managedFileIds.length === 0) return;

    try {
      await this.getClient().files.bulk.delete({ fileIds: managedFileIds });
    } catch (error) {
      logger.error({ error, count: managedFileIds.length }, 'ImageKit bulk delete failed');
      throw new AppError('Media delete from storage failed.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  getClientUploadAuth(): ClientUploadAuth {
    if (!env.IMAGEKIT_PUBLIC_KEY || !env.IMAGEKIT_URL_ENDPOINT) {
      throw new AppError('Media upload client configuration is not configured.', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const auth = this.getClient().helper.getAuthenticationParameters();

    return {
      ...auth,
      publicKey: env.IMAGEKIT_PUBLIC_KEY,
      urlEndpoint: env.IMAGEKIT_URL_ENDPOINT,
    };
  }
}

const mediaService = new MediaService();

export { MediaService };
export default mediaService;
