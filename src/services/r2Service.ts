/**
 * Cloudflare R2 Storage Service
 * Handles all file operations using R2
 */

export interface R2Context {
  BUCKET: R2Bucket;
}

export class R2Service {
  private bucket: R2Bucket;

  constructor(bucket: R2Bucket) {
    this.bucket = bucket;
  }

  /**
   * Upload a file to R2
   */
  async uploadFile(key: string, file: ArrayBuffer | ReadableStream<Uint8Array> | string, contentType: string = 'application/octet-stream') {
    return await this.bucket.put(key, file, {
      httpMetadata: {
        contentType,
      },
    });
  }

  /**
   * Download a file from R2
   */
  async downloadFile(key: string) {
    return await this.bucket.get(key);
  }

  /**
   * Delete a file from R2
   */
  async deleteFile(key: string) {
    return await this.bucket.delete(key);
  }

  /**
   * List files in R2
   */
  async listFiles(prefix?: string, delimiter?: string) {
    return await this.bucket.list({
      prefix,
      delimiter,
    });
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string) {
    const obj = await this.bucket.head(key);
    if (!obj) return null;
    
    return {
      key: obj.key,
      size: obj.size,
      etag: obj.etag,
      uploaded: obj.uploaded,
      httpMetadata: obj.httpMetadata,
      customMetadata: obj.customMetadata,
    };
  }

  /**
   * Generate signed URL for public access
   */
  getPublicUrl(key: string, bucketName: string = 'lms', accountId: string) {
    return `https://${bucketName}.r2.cloudflarestorage.com/${key}`;
  }
}
