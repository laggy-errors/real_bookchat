import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { storageService } from '../services/storage.service';
import { UnauthorizedError, BadRequestError } from '../utils/errors';

export class AttachmentController {
  async upload(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError();

      const { fileData, fileType, fileSize, fileName } = req.body;

      if (!fileData) {
        throw new BadRequestError('File data is required.');
      }

      const result = await storageService.uploadBase64File(
        fileData,
        fileType || 'application/octet-stream',
        Number(fileSize) || 0,
        fileName || 'attachment'
      );

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const attachmentController = new AttachmentController();
