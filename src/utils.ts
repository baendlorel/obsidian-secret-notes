export const dtm = (date: Date | string): string => {
  date = new Date(date);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  const seconds = `${date.getSeconds()}`.padStart(2, '0');

  const today = new Date();

  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  if (isToday) {
    return `${hours}:${minutes}:${seconds}`;
  } else if (date.getFullYear() === today.getFullYear()) {
    return `${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

export const base64ToBytes = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export const toArrayBuffer = (b: Uint8Array): ArrayBuffer =>
  b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

export interface ImageFormat {
  ext: string;
  mime: string;
}

/** Detect image format from magic bytes; the authoritative source for ext/mime. */
export const detectImageFormat = (bytes: Uint8Array): ImageFormat | null => {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return { ext: 'png', mime: 'image/png' };
  }
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }
  // GIF: "GIF8"
  if (bytes.length >= 4 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return { ext: 'gif', mime: 'image/gif' };
  }
  // WebP: "RIFF" + 4-byte size + "WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }
  return null;
};

/** Strip wikilink/filesystem-hostile characters so the title can be used as a filename. */
export const sanitizeFilename = (name: string): string =>
  name
    .replace(/[\p{Cc}\\/:*?"<>|#^[\]]/gu, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);

export const secondClickConfirm = (btn: HTMLButtonElement, confirmedText: string, fn: (ev: MouseEvent) => void) => {
  let isSecondClick = false;
  const originText = btn.getText();

  btn.addEventListener('click', (ev) => {
    if (isSecondClick) {
      fn(ev);
      return;
    }
    btn.disabled = true;
    isSecondClick = true;
    let countdown = 4;
    const counter = () => {
      countdown--;
      btn.setText(`${originText} (${countdown})`);
      if (countdown <= 0) {
        window.clearInterval(interval);
        btn.disabled = false;
        btn.setText(confirmedText);
      }
    };

    counter();
    const interval = window.setInterval(counter, 1000);
  });
};
