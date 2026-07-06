import ImageKit, { toFile } from '@imagekit/nodejs';
import { randomUUID } from 'node:crypto';

import env from '../../config/env.js';
import logger from '../../config/logger.js';
import AppError from '../../shared/errors/AppError.js';
import { BadRequestError } from '../../shared/errors/index.js';
import HttpStatus from '../../shared/constants/httpStatus.js';
import {
  IMAGE_MIME_EXTENSION_MAP,
  MEDIA_FOLDERS,
  MEDIA_TAGS,
} from './media.constants.js';
import type { ClientUploadAuth, StoredMedia, UploadImageInput } from './media.types.js';

class MediaService {
  private client?: ImageKit;

  private getClient(): ImageKit {
    if (!env.IMAGEKIT_PRIVATE_KEY) {
      throw new AppError('Media storage is not configured.', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    this.client ??= new ImageKit({ privateKey: env.IMAGEKIT_PRIVATE_KEY });
    return this.client;
  }

  private getImageExtension(file: Express.Multer.File): string {
    const extension = IMAGE_MIME_EXTENSION_MAP[file.mimetype as keyof typeof IMAGE_MIME_EXTENSION_MAP];

    if (!extension) {
      throw new BadRequestError('Please attach only image files!');
    }

    return extension;
  }

  private createFileName(prefix: string, file: Express.Multer.File): string {
    const safePrefix = prefix
      .trim()
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'media';

    return `${safePrefix}-${Date.now()}-${randomUUID()}.${this.getImageExtension(file)}`;
  }

  private assertStoredMedia(response: ImageKit.FileUploadResponse): StoredMedia {
    if (!response.url || !response.fileId) {
      throw new AppError('Media upload did not return required storage metadata.', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const mime = typeof response.metadata?.mimeType === 'string' ? response.metadata.mimeType : undefined;

    return {
      url: response.url,
      fileId: response.fileId,
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

  async uploadImage(input: UploadImageInput): Promise<StoredMedia> {
    const client = this.getClient();
    const fileName = this.createFileName(input.fileNamePrefix, input.file);

    try {
      const response = await client.files.upload({
        file: await toFile(input.file.buffer, input.file.originalname, { type: input.file.mimetype }),
        fileName,
        folder: input.folder,
        tags: input.tags,
        useUniqueFileName: false,
      });

      return this.assertStoredMedia(response);
    } catch (error) {
      logger.error({ error, folder: input.folder }, 'ImageKit upload failed');
      throw new AppError('Image upload failed. Please try again.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  uploadProfilePicture(file: Express.Multer.File, userId: string): Promise<StoredMedia> {
    return this.uploadImage({
      file,
      folder: MEDIA_FOLDERS.profilePictures,
      fileNamePrefix: `profile-${userId}`,
      tags: [MEDIA_TAGS.profilePicture, `user-${userId}`],
    });
  }

  uploadPostImages(files: Express.Multer.File[], userId: string, postId: string): Promise<StoredMedia[]> {
    return Promise.all(
      files.map((file, index) => this.uploadImage({
        file,
        folder: MEDIA_FOLDERS.postImages(userId, postId),
        fileNamePrefix: `post-${userId}-${postId}-${index}`,
        tags: [MEDIA_TAGS.postImage, `user-${userId}`, `post-${postId}`],
      })),
    );
  }

  async deleteFile(fileId?: string | null): Promise<void> {
    if (!this.isManagedFileId(fileId)) return;

    try {
      await this.getClient().files.delete(fileId);
    } catch (error) {
      logger.error({ error, fileId }, 'ImageKit file delete failed');
      throw new AppError('Image delete from storage failed.', HttpStatus.INTERNAL_SERVER_ERROR);
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
      throw new AppError('Images delete from storage failed.', HttpStatus.INTERNAL_SERVER_ERROR);
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
