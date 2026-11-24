import {
  PROFILE_LOGO_MAX_CHARS,
  UPLOAD_IMAGE_MAX_PX,
  UPLOAD_IMAGE_QUALITY,
  calculateContainedDimensions,
} from './hubLogic';

/**
 * Resizes and compresses an uploaded image using FileReader + HTMLCanvasElement so dimensions
 * never exceed `maxDimension` (default 140x140px) and encodes as `image/jpeg` at `quality`
 * (default 0.7), producing a compact `data:image/jpeg;base64,...` string for immediate preview
 * and cross-device Google Sheets sync.
 */
export function resizeImageToDataUrl(
  file: File,
  maxDimension = UPLOAD_IMAGE_MAX_PX,
  format: 'png' | 'webp' | 'jpeg' = 'jpeg',
  quality = UPLOAD_IMAGE_QUALITY,
  maxChars = PROFILE_LOGO_MAX_CHARS
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('ไฟล์รูปภาพไม่ถูกต้อง'));
      img.onload = () => {
        const { width, height } = calculateContainedDimensions(
          img.width,
          img.height,
          maxDimension
        );

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('ไม่สามารถประมวลผลรูปภาพได้'));
          return;
        }

        if (format === 'png') {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
          return;
        }

        const encode = (mime: 'image/webp' | 'image/jpeg', q: number): string => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (mime === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL(mime, q);
        };

        if (format === 'jpeg') {
          const primary = encode('image/jpeg', quality);
          if (primary.length < maxChars) {
            resolve(primary);
            return;
          }
          let best = primary;
          for (const q of [0.6, 0.5, 0.4, 0.3]) {
            if (q < quality) {
              best = encode('image/jpeg', q);
              if (best.length < maxChars) {
                resolve(best);
                return;
              }
            }
          }
          resolve(best);
          return;
        }

        const qualitySteps = Array.from(
          new Set([quality, 0.65, 0.55, 0.45, 0.35].filter((q) => q <= quality))
        );

        let bestUrl = '';
        for (const q of qualitySteps) {
          const candidate = encode('image/webp', q);
          if (!candidate.startsWith('data:image/webp')) {
            bestUrl = '';
            break;
          }
          bestUrl = candidate;
          if (candidate.length < maxChars) {
            resolve(candidate);
            return;
          }
        }

        for (const q of qualitySteps) {
          const candidate = encode('image/jpeg', q);
          bestUrl = candidate;
          if (candidate.length < maxChars) {
            resolve(candidate);
            return;
          }
        }

        resolve(bestUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
