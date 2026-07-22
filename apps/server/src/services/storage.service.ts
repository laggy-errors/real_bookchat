import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import { BadRequestError } from '../utils/errors';

const bucketName = process.env.S3_BUCKET;
const region = process.env.S3_REGION || 'us-east-1';
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const endpoint = process.env.S3_ENDPOINT;

const isS3Configured = Boolean(bucketName && accessKeyId && secretAccessKey);

let s3Client: S3Client | null = null;
if (isS3Configured) {
  s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
    },
    endpoint: endpoint || undefined,
    forcePathStyle: Boolean(endpoint),
  });
}

const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/bmp',
  // Documents
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/html',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-tar',
  'application/gzip',
]);

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export class StorageService {
  isConfigured(): boolean {
    return isS3Configured;
  }

  validateFile(fileType: string, fileSize: number) {
    if (!fileType || !ALLOWED_MIME_TYPES.has(fileType.toLowerCase())) {
      throw new BadRequestError(
        `Invalid file format (${fileType || 'unknown'}). Only images (JPG, PNG, WEBP, GIF, SVG) and documents (PDF, DOCX, TXT, CSV, ZIP) are allowed.`
      );
    }

    if (fileSize > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestError('File size exceeds the maximum limit of 25MB.');
    }
  }

  async uploadBase64File(
    fileData: string,
    fileType: string,
    fileSize: number,
    fileName: string
  ): Promise<{ url: string; fileType: string; fileSize: number; fileName: string }> {
    this.validateFile(fileType, fileSize);

    const safeFileName = fileName ? fileName.replace(/[^a-zA-Z0-9_.-]/g, '_') : 'attachment';
    const fileExtension = safeFileName.includes('.') ? safeFileName.split('.').pop() : 'bin';
    const uniqueKey = `attachments/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${fileExtension}`;

    let finalUrl = fileData;

    if (this.isConfigured() && s3Client && bucketName) {
      const base64Content = fileData.includes('base64,') ? fileData.split('base64,')[1] : fileData;
      const buffer = Buffer.from(base64Content, 'base64');

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: uniqueKey,
        Body: buffer,
        ContentType: fileType,
      });

      await s3Client.send(command);

      if (endpoint) {
        finalUrl = `${endpoint.replace(/\/$/, '')}/${bucketName}/${uniqueKey}`;
      } else {
        finalUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${uniqueKey}`;
      }
    } else {
      if (!fileData.startsWith('data:')) {
        finalUrl = `data:${fileType};base64,${fileData}`;
      }
    }

    return {
      url: finalUrl,
      fileType,
      fileSize,
      fileName: safeFileName,
    };
  }
}

export const storageService = new StorageService();
