export type SecretPayload = {
  v: number;
  title?: string;
  hint?: string;
  encrypted: string;
  date: string;
};

export type SecretBlock = {
  from: number;
  to: number;
  lineStart: number;
  lineEnd: number;
  raw: string;
  content: string;
};

export type SecretMeta = {
  title?: string;
  hint?: string;
};

export type SessionState = {
  password?: string;
  lastPlaintext?: string;
  failureCount: number;
  blockedUntil: number;
};

export type SecretFormResult = {
  password: string;
  title?: string;
  hint?: string;
};

export type SecretEditorResult = {
  plaintext: string;
  title: string;
  hint: string;
};
