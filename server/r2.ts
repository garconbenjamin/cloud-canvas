import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export interface UploadResult {
  success: boolean;
  url: string;
  key: string;
  bucket: string;
  fileName: string;
  mimeType: string;
  size: number;
  isR2: boolean;
  error?: string;
}

class CloudflareR2Service {
  private s3Client: S3Client | null = null;
  private isConfigured = false;
  private bucketName = '';
  private publicUrl = '';

  constructor() {
    this.init();
  }

  private init() {
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
    const pubUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;

    if (accountId && accessKeyId && secretAccessKey && bucket) {
      try {
        this.s3Client = new S3Client({
          region: 'auto',
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        });
        this.isConfigured = true;
        this.bucketName = bucket;
        this.publicUrl = pubUrl || `https://${bucket}.${accountId}.r2.cloudflarestorage.com`;
        console.log(`[Cloudflare R2] Configured and connected to bucket: ${bucket}`);
      } catch (err) {
        console.warn('[Cloudflare R2] Failed to initialize S3 client, using local persistent fallback:', err);
      }
    } else {
      console.log('[Cloudflare R2] Credentials not provided; using persistent local storage emulation for R2');
    }
  }

  public getStatus() {
    return {
      r2Configured: this.isConfigured,
      r2BucketName: this.isConfigured ? this.bucketName : 'canvas-assets (Local R2 Emulator)',
      publicUrl: this.publicUrl,
    };
  }

  public async uploadBuffer(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    prefix: string = 'canvas-images'
  ): Promise<UploadResult> {
    const ext = path.extname(originalName) || '.png';
    const hash = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    const key = `${prefix}/${timestamp}-${hash}${ext}`;

    // 1. If Cloudflare R2 is configured, upload directly to R2 bucket
    if (this.isConfigured && this.s3Client) {
      try {
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        });

        await this.s3Client.send(command);

        const url = this.publicUrl ? `${this.publicUrl.replace(/\/$/, '')}/${key}` : `/api/storage/${encodeURIComponent(key)}`;

        return {
          success: true,
          url,
          key,
          bucket: this.bucketName,
          fileName: originalName,
          mimeType,
          size: buffer.length,
          isR2: true,
        };
      } catch (error: any) {
        console.error('[Cloudflare R2] Upload to Cloudflare R2 failed, falling back to local storage:', error);
      }
    }

    // 2. Fallback to local storage emulation
    try {
      const sanitizedKey = key.replace(/\//g, '__');
      const localFilePath = path.join(UPLOADS_DIR, sanitizedKey);
      fs.writeFileSync(localFilePath, buffer);

      const url = `/api/storage/${encodeURIComponent(sanitizedKey)}`;

      return {
        success: true,
        url,
        key: sanitizedKey,
        bucket: 'canvas-assets-local',
        fileName: originalName,
        mimeType,
        size: buffer.length,
        isR2: false,
      };
    } catch (err: any) {
      return {
        success: false,
        url: '',
        key: '',
        bucket: '',
        fileName: originalName,
        mimeType,
        size: buffer.length,
        isR2: false,
        error: err.message || 'Local write failure',
      };
    }
  }

  public getLocalFile(key: string): { filePath: string; exists: boolean } {
    const localFilePath = path.join(UPLOADS_DIR, key);
    return {
      filePath: localFilePath,
      exists: fs.existsSync(localFilePath),
    };
  }
}

export const r2Service = new CloudflareR2Service();
