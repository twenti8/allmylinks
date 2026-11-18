import {
  PROFILE_LOGO_MAX_CHARS,
  PROFILE_LOGO_MAX_PX,
  PROFILE_LOGO_QUALITY,
  calculateContainedDimensions,
} from './hubLogic';

/**
 * Resizes and compresses an uploaded image using HTMLCanvasElement so dimensions never exceed
 * `maxDimension` (default 180x180px for profile logos) and encodes as WebP/JPEG at `quality`
 * (default 0.75), stepping down quality if needed to stay under `maxChars` (default 30,000 chars)
 * for Google Sheets cell limits.
 */
export function resizeImageToDataUrl(
  file: File,
  maxDimension = PROFILE_LOGO_MAX_PX,
  format: 'png' | 'webp' | 'jpeg' = 'webp',
  quality = PROFILE_LOGO_QUALITY,
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

        const qualitySteps = Array.from(
          new Set([quality, 0.65, 0.55, 0.45, 0.35].filter((q) => q <= quality))
        );

        let bestUrl = '';
        if (format === 'webp') {
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
        }

        // Fallback to JPEG (or if WebP is unsupported / still exceeds maxChars)
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
