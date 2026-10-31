import crypto from 'node:crypto';
import {
  StoragePort,
  UploadGrant,
  DownloadGrant,
  FinalizedAsset,
  StorageGrantError,
  IntegrityMismatchError,
} from './port.js';

interface InternalGrant {
  grantToken: string;
  workspaceId: string;
  storageKey: string;
  mimeType: string;
  maxSizeBytes: number;
  expiresAt: Date;
}

export type StorageLifecycleHook = (asset: FinalizedAsset) => Promise<void>;

export class LocalStorageAdapter implements StoragePort {
  private grants: Map<string, InternalGrant> = new Map();
  private objects: Map<string, { buffer: Buffer; meta: FinalizedAsset }> = new Map();
  private lifecycleHooks: StorageLifecycleHook[] = [];

  constructor(private baseUrl = 'http://localhost:9000') {}

  public onFinalized(hook: StorageLifecycleHook): void {
    this.lifecycleHooks.push(hook);
  }

  public async createUploadGrant(
    workspaceId: string,
    filename: string,
    mimeType: string,
    maxSizeBytes = 10 * 1024 * 1024, // 10MB default
    expirySec = 900, // 15 min default
  ): Promise<UploadGrant> {
    if (!workspaceId) {
      throw new StorageGrantError('Workspace ID is required to generate upload grant');
    }

    const grantToken = crypto.randomUUID();
    const safeFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const storageKey = `${workspaceId}/${crypto.randomUUID()}_${safeFilename}`;
    const expiresAt = new Date(Date.now() + expirySec * 1000);

    const internalGrant: InternalGrant = {
      grantToken,
      workspaceId,
      storageKey,
      mimeType,
      maxSizeBytes,
      expiresAt,
    };

    this.grants.set(grantToken, internalGrant);

    return {
      uploadUrl: `${this.baseUrl}/upload?grant=${grantToken}`,
      grantToken,
      storageKey,
      expiresAt,
      maxSizeBytes,
      mimeType,
    };
  }

  public async createDownloadGrant(
    workspaceId: string,
    storageKey: string,
    expirySec = 900,
  ): Promise<DownloadGrant> {
    if (!storageKey.startsWith(`${workspaceId}/`)) {
      throw new StorageGrantError('Access denied: object does not belong to workspace');
    }

    const item = this.objects.get(storageKey);
    if (!item) {
      throw new StorageGrantError('Object not found in storage');
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + expirySec * 1000);

    return {
      downloadUrl: `${this.baseUrl}/download/${storageKey}?token=${token}`,
      expiresAt,
    };
  }

  public async finalizeUpload(
    workspaceId: string,
    grantToken: string,
    fileBuffer: Buffer,
    expectedSha256?: string,
  ): Promise<FinalizedAsset> {
    const grant = this.grants.get(grantToken);
    if (!grant) {
      throw new StorageGrantError('Invalid or expired upload grant token');
    }

    if (grant.workspaceId !== workspaceId) {
      throw new StorageGrantError('Tenant mismatch on upload grant finalization');
    }

    if (grant.expiresAt < new Date()) {
      this.grants.delete(grantToken);
      throw new StorageGrantError('Upload grant has expired');
    }

    if (fileBuffer.length > grant.maxSizeBytes) {
      throw new StorageGrantError(
        `File size (${fileBuffer.length} bytes) exceeds maximum granted size (${grant.maxSizeBytes} bytes)`,
      );
    }

    const calculatedSha256 = crypto
      .createHash('sha256')
      .update(fileBuffer)
      .digest('hex');

    if (expectedSha256 && expectedSha256.toLowerCase() !== calculatedSha256.toLowerCase()) {
      throw new IntegrityMismatchError(expectedSha256, calculatedSha256);
    }

    const finalized: FinalizedAsset = {
      storageKey: grant.storageKey,
      workspaceId,
      sizeBytes: fileBuffer.length,
      sha256: calculatedSha256,
      mimeType: grant.mimeType,
      finalizedAt: new Date(),
    };

    this.objects.set(grant.storageKey, { buffer: fileBuffer, meta: finalized });
    this.grants.delete(grantToken); // One-time use grant

    // Trigger hooks
    for (const hook of this.lifecycleHooks) {
      await hook(finalized);
    }

    return finalized;
  }

  public async deleteObject(workspaceId: string, storageKey: string): Promise<boolean> {
    if (!storageKey.startsWith(`${workspaceId}/`)) {
      return false;
    }
    return this.objects.delete(storageKey);
  }

  public async getObjectBuffer(workspaceId: string, storageKey: string): Promise<Buffer | null> {
    if (!storageKey.startsWith(`${workspaceId}/`)) {
      return null;
    }
    const item = this.objects.get(storageKey);
    return item ? item.buffer : null;
  }
}
