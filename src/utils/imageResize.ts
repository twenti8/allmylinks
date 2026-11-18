/**
 * Automatically resizes and compresses an uploaded image file so that its longest
 * side never exceeds `maxDimension` (default 400px for crisp iOS icons & profile logos),
 * keeping payloads lightweight for localStorage and Google Sheets storage.
 */
export function resizeImageToDataUrl(
  file: File,
  maxDimension = 400,
  format: 'png' | 'webp' = 'webp'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('ไฟล์รูปภาพไม่ถูกต้อง'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('ไม่สามารถประมวลผลรูปภาพได้'));
          return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        if (format === 'png') {
          resolve(canvas.toDataURL('image/png'));
          return;
        }

        const webpUrl = canvas.toDataURL('image/webp', 0.86);
        if (webpUrl.startsWith('data:image/webp')) {
          resolve(webpUrl);
        } else {
          resolve(canvas.toDataURL('image/png'));
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
