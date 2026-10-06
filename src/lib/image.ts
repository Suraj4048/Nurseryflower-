/** Photo ko browser me hi chhota (compress) karta hai: storage free-tier me bachta hai. */
export function compressImage(file: File, maxSide = 700, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('File padh nahi payi'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Photo kharab hai'));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas available nahi'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(',');
  const mime = /data:(.*?);base64/.exec(head)?.[1] ?? 'image/jpeg';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export const isDataUrl = (s: string) => s.startsWith('data:') || s.startsWith('http');

/** Photo ko itna chhota karta hai ki size maxKB (default 100KB) se zyada na ho. Quality aur size dono ghatata hai. */
export async function compressToMaxKB(file: File, maxKB = 100, startSide = 1000): Promise<string> {
  const bytes = (d: string) => Math.round((d.length - d.indexOf(',') - 1) * 0.75);
  let side = startSide;
  let quality = 0.8;
  let out = await compressImage(file, side, quality);
  for (let i = 0; i < 14 && bytes(out) > maxKB * 1024; i++) {
    if (quality > 0.4) quality -= 0.1; else { side = Math.round(side * 0.8); quality = 0.6; }
    out = await compressImage(file, side, quality);
  }
  return out;
}
