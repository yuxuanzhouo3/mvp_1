/**
 * Photo Validation Service
 * Provides client-side and server-side validation for photo uploads
 */

// Allowed image MIME types
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

// Rejected image MIME types
export const REJECTED_MIME_TYPES = [
  'image/gif',
  'image/bmp',
  'image/svg+xml',
  'image/tiff',
] as const;

// File extension mapping
export const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;

// Constants
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MIN_IMAGE_DIMENSION = 300; // Minimum 300px width and height
export const MAX_IMAGE_DIMENSION = 10000; // Maximum 10000px

// Validation result interface
export interface PhotoValidationResult {
  isValid: boolean;
  errorReason?: string;
  errorCode?: PhotoValidationErrorCode;
}

// Error codes for programmatic handling
export enum PhotoValidationErrorCode {
  INVALID_FILE = 'INVALID_FILE',
  INVALID_FORMAT = 'INVALID_FORMAT',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  DIMENSION_TOO_SMALL = 'DIMENSION_TOO_SMALL',
  DIMENSION_TOO_LARGE = 'DIMENSION_TOO_LARGE',
  IMAGE_CORRUPTED = 'IMAGE_CORRUPTED',
  EMPTY_FILE = 'EMPTY_FILE',
}

// Error messages (can be used with i18n)
export const ERROR_MESSAGES: Record<PhotoValidationErrorCode, string> = {
  [PhotoValidationErrorCode.INVALID_FILE]: 'Invalid file provided',
  [PhotoValidationErrorCode.INVALID_FORMAT]: 'Invalid file format. Only JPG, PNG, and WebP are allowed. GIF, BMP, and SVG are not supported.',
  [PhotoValidationErrorCode.FILE_TOO_LARGE]: `File size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
  [PhotoValidationErrorCode.DIMENSION_TOO_SMALL]: `Image dimensions must be at least ${MIN_IMAGE_DIMENSION}x${MIN_IMAGE_DIMENSION} pixels`,
  [PhotoValidationErrorCode.DIMENSION_TOO_LARGE]: `Image dimensions exceed the maximum of ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION} pixels`,
  [PhotoValidationErrorCode.IMAGE_CORRUPTED]: 'The image file appears to be corrupted or cannot be processed',
  [PhotoValidationErrorCode.EMPTY_FILE]: 'The file is empty',
};

/**
 * Validate file type by MIME type and extension
 */
export function validateFileType(file: File): PhotoValidationResult {
  // Check if file exists
  if (!file) {
    return {
      isValid: false,
      errorReason: ERROR_MESSAGES[PhotoValidationErrorCode.INVALID_FILE],
      errorCode: PhotoValidationErrorCode.INVALID_FILE,
    };
  }

  // Check MIME type
  const mimeType = file.type.toLowerCase();

  // Reject explicitly banned types
  if (REJECTED_MIME_TYPES.includes(mimeType as typeof REJECTED_MIME_TYPES[number])) {
    return {
      isValid: false,
      errorReason: ERROR_MESSAGES[PhotoValidationErrorCode.INVALID_FORMAT],
      errorCode: PhotoValidationErrorCode.INVALID_FORMAT,
    };
  }

  // Check if MIME type is in allowed list
  if (!ALLOWED_MIME_TYPES.includes(mimeType as typeof ALLOWED_MIME_TYPES[number])) {
    return {
      isValid: false,
      errorReason: ERROR_MESSAGES[PhotoValidationErrorCode.INVALID_FORMAT],
      errorCode: PhotoValidationErrorCode.INVALID_FORMAT,
    };
  }

  // Also check file extension as secondary validation
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension as typeof ALLOWED_EXTENSIONS[number])) {
    return {
      isValid: false,
      errorReason: ERROR_MESSAGES[PhotoValidationErrorCode.INVALID_FORMAT],
      errorCode: PhotoValidationErrorCode.INVALID_FORMAT,
    };
  }

  return { isValid: true };
}

/**
 * Validate file size
 */
export function validateFileSize(file: File): PhotoValidationResult {
  if (!file) {
    return {
      isValid: false,
      errorReason: ERROR_MESSAGES[PhotoValidationErrorCode.INVALID_FILE],
      errorCode: PhotoValidationErrorCode.INVALID_FILE,
    };
  }

  if (file.size === 0) {
    return {
      isValid: false,
      errorReason: ERROR_MESSAGES[PhotoValidationErrorCode.EMPTY_FILE],
      errorCode: PhotoValidationErrorCode.EMPTY_FILE,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      errorReason: ERROR_MESSAGES[PhotoValidationErrorCode.FILE_TOO_LARGE],
      errorCode: PhotoValidationErrorCode.FILE_TOO_LARGE,
    };
  }

  return { isValid: true };
}

/**
 * Validate image dimensions (client-side)
 * Creates an image element to check dimensions
 */
export async function validateImageDimensions(file: File): Promise<PhotoValidationResult> {
  return new Promise((resolve) => {
    if (!file) {
      resolve({
        isValid: false,
        errorReason: ERROR_MESSAGES[PhotoValidationErrorCode.INVALID_FILE],
        errorCode: PhotoValidationErrorCode.INVALID_FILE,
      });
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const { width, height } = img;

      if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
        resolve({
          isValid: false,
          errorReason: ERROR_MESSAGES[PhotoValidationErrorCode.DIMENSION_TOO_SMALL],
          errorCode: PhotoValidationErrorCode.DIMENSION_TOO_SMALL,
        });
        return;
      }

      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        resolve({
          isValid: false,
          errorReason: ERROR_MESSAGES[PhotoValidationErrorCode.DIMENSION_TOO_LARGE],
          errorCode: PhotoValidationErrorCode.DIMENSION_TOO_LARGE,
        });
        return;
      }

      resolve({ isValid: true });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        isValid: false,
        errorReason: ERROR_MESSAGES[PhotoValidationErrorCode.IMAGE_CORRUPTED],
        errorCode: PhotoValidationErrorCode.IMAGE_CORRUPTED,
      });
    };

    img.src = objectUrl;
  });
}

/**
 * Validate image dimensions from buffer (server-side)
 * Uses image header parsing without full decode
 */
export async function validateImageDimensionsFromBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<PhotoValidationResult> {
  try {
    const dimensions = getImageDimensionsFromBuffer(buffer, mimeType);

    if (!dimensions) {
      return {
        isValid: false,
        errorReason: ERROR_MESSAGES[PhotoValidationErrorCode.IMAGE_CORRUPTED],
        errorCode: PhotoValidationErrorCode.IMAGE_CORRUPTED,
      };
    }

    const { width, height } = dimensions;

    if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
      return {
        isValid: false,
        errorReason: ERROR_MESSAGES[PhotoValidationErrorCode.DIMENSION_TOO_SMALL],
        errorCode: PhotoValidationErrorCode.DIMENSION_TOO_SMALL,
      };
    }

    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      return {
        isValid: false,
        errorReason: ERROR_MESSAGES[PhotoValidationErrorCode.DIMENSION_TOO_LARGE],
        errorCode: PhotoValidationErrorCode.DIMENSION_TOO_LARGE,
      };
    }

    return { isValid: true };
  } catch {
    return {
      isValid: false,
      errorReason: ERROR_MESSAGES[PhotoValidationErrorCode.IMAGE_CORRUPTED],
      errorCode: PhotoValidationErrorCode.IMAGE_CORRUPTED,
    };
  }
}

/**
 * Parse image dimensions from buffer header
 * Supports JPEG, PNG, and WebP
 */
function getImageDimensionsFromBuffer(
  buffer: Buffer,
  mimeType: string
): { width: number; height: number } | null {
  try {
    if (mimeType === 'image/png') {
      return getPngDimensions(buffer);
    } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      return getJpegDimensions(buffer);
    } else if (mimeType === 'image/webp') {
      return getWebpDimensions(buffer);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get PNG dimensions from header
 */
function getPngDimensions(buffer: Buffer): { width: number; height: number } | null {
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (buffer.length < 24) return null;

  const signature = buffer.slice(0, 8);
  const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  if (!signature.equals(pngSignature)) return null;

  // IHDR chunk starts at byte 8
  // Width is at bytes 16-19, Height is at bytes 20-23
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  return { width, height };
}

/**
 * Get JPEG dimensions from header
 */
function getJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
  // JPEG signature: FF D8
  if (buffer.length < 2 || buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
    return null;
  }

  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xFF) {
      offset++;
      continue;
    }

    const marker = buffer[offset + 1];

    // SOF markers (Start of Frame)
    // SOF0 (Baseline), SOF1, SOF2 (Progressive), etc.
    if (
      marker === 0xC0 || marker === 0xC1 || marker === 0xC2 ||
      marker === 0xC3 || marker === 0xC5 || marker === 0xC6 ||
      marker === 0xC7 || marker === 0xC9 || marker === 0xCA ||
      marker === 0xCB || marker === 0xCD || marker === 0xCE ||
      marker === 0xCF
    ) {
      // Height at offset+5, Width at offset+7
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return { width, height };
    }

    // Skip to next marker
    if (marker === 0xD8 || marker === 0xD9) {
      offset += 2;
    } else if (marker === 0xFF) {
      offset++;
    } else {
      const length = buffer.readUInt16BE(offset + 2);
      offset += 2 + length;
    }
  }

  return null;
}

/**
 * Get WebP dimensions from header
 */
function getWebpDimensions(buffer: Buffer): { width: number; height: number } | null {
  // WebP signature: RIFF....WEBP
  if (buffer.length < 30) return null;

  const riff = buffer.slice(0, 4).toString('ascii');
  const webp = buffer.slice(8, 12).toString('ascii');

  if (riff !== 'RIFF' || webp !== 'WEBP') return null;

  const chunkType = buffer.slice(12, 16).toString('ascii');

  if (chunkType === 'VP8 ') {
    // Lossy format
    // Frame header starts at byte 23
    if (buffer.length < 30) return null;
    const width = (buffer.readUInt16LE(26) & 0x3FFF);
    const height = (buffer.readUInt16LE(28) & 0x3FFF);
    return { width, height };
  } else if (chunkType === 'VP8L') {
    // Lossless format
    if (buffer.length < 25) return null;
    const bits = buffer.readUInt32LE(21);
    const width = (bits & 0x3FFF) + 1;
    const height = ((bits >> 14) & 0x3FFF) + 1;
    return { width, height };
  } else if (chunkType === 'VP8X') {
    // Extended format
    if (buffer.length < 30) return null;
    const width = (buffer.readUIntLE(24, 3) + 1);
    const height = (buffer.readUIntLE(27, 3) + 1);
    return { width, height };
  }

  return null;
}

/**
 * Complete validation for a photo file (client-side)
 * Runs all validation checks and returns the first error or success
 */
export async function validatePhoto(file: File): Promise<PhotoValidationResult> {
  // Check file type first
  const typeResult = validateFileType(file);
  if (!typeResult.isValid) {
    return typeResult;
  }

  // Check file size
  const sizeResult = validateFileSize(file);
  if (!sizeResult.isValid) {
    return sizeResult;
  }

  // Check image dimensions
  const dimensionResult = await validateImageDimensions(file);
  if (!dimensionResult.isValid) {
    return dimensionResult;
  }

  return { isValid: true };
}

/**
 * Complete validation for a photo buffer (server-side)
 */
export async function validatePhotoBuffer(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<PhotoValidationResult> {
  // Check file type
  const normalizedMime = mimeType.toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(normalizedMime as typeof ALLOWED_MIME_TYPES[number])) {
    return {
      isValid: false,
      errorReason: ERROR_MESSAGES[PhotoValidationErrorCode.INVALID_FORMAT],
      errorCode: PhotoValidationErrorCode.INVALID_FORMAT,
    };
  }

  // Check extension
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension as typeof ALLOWED_EXTENSIONS[number])) {
    return {
      isValid: false,
      errorReason: ERROR_MESSAGES[PhotoValidationErrorCode.INVALID_FORMAT],
      errorCode: PhotoValidationErrorCode.INVALID_FORMAT,
    };
  }

  // Check size
  if (buffer.length === 0) {
    return {
      isValid: false,
      errorReason: ERROR_MESSAGES[PhotoValidationErrorCode.EMPTY_FILE],
      errorCode: PhotoValidationErrorCode.EMPTY_FILE,
    };
  }

  if (buffer.length > MAX_FILE_SIZE) {
    return {
      isValid: false,
      errorReason: ERROR_MESSAGES[PhotoValidationErrorCode.FILE_TOO_LARGE],
      errorCode: PhotoValidationErrorCode.FILE_TOO_LARGE,
    };
  }

  // Check dimensions
  const dimensionResult = await validateImageDimensionsFromBuffer(buffer, normalizedMime);
  if (!dimensionResult.isValid) {
    return dimensionResult;
  }

  return { isValid: true };
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
