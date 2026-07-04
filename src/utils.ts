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
        clearInterval(interval);
        btn.disabled = false;
        btn.setText(confirmedText);
      }
    };

    counter();
    const interval = window.setInterval(counter, 1000);
  });
};
