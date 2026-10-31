
export interface UploadGrant {
  uploadUrl: string;
  grantToken: string;
  storageKey: string;
  expiresAt: Date;
  maxSizeBytes: number;
  mimeType: string;
}

export interface DownloadGrant {
  downloadUrl: string;
  expiresAt: Date;
}

export interface FinalizedAsset {
  storageKey: string;
  workspaceId: string;
  sizeBytes: number;
  sha256: string;
  mimeType: string;
  finalizedAt: Date;
}

export interface StoragePort {
  createUploadGrant(
    workspaceId: string,
    filename: string,
    mimeType: string,
    maxSizeBytes?: number,
    expirySec?: number,
  ): Promise<UploadGrant>;

  createDownloadGrant(
    workspaceId: string,
    storageKey: string,
    expirySec?: number,
  ): Promise<DownloadGrant>;

  finalizeUpload(
    workspaceId: string,
    grantToken: string,
    fileBuffer: Buffer,
    expectedSha256?: string,
  ): Promise<FinalizedAsset>;

  deleteObject(workspaceId: string, storageKey: string): Promise<boolean>;
}

export class StorageGrantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageGrantError';
  }
}

export class IntegrityMismatchError extends Error {
  constructor(expected: string, actual: string) {
    super(`Integrity check failed. Expected SHA-256: ${expected}, Calculated: ${actual}`);
    this.name = 'IntegrityMismatchError';
  }
}
