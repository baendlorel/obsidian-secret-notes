export interface SecretPayload {
  v: number;
  title?: string;
  hint?: string;
  encrypted: string;
  date: string;
}

export interface SecretBlock {
  from: number;
  to: number;
  lineStart: number;
  lineEnd: number;
  raw: string;
  content: string;
}

export interface SecretMeta {
  title?: string;
  hint?: string;
}

export interface SessionState {
  password?: string;
  lastPlaintext?: string;
  failureCount: number;
  blockedUntil: number;
}

export interface SecretFormResult {
  password: string;
  title?: string;
  hint?: string;
}

export interface SecretEditorResult {
  plaintext: string;
  title: string;
  hint: string;
}

export interface InputElementOptions {
  label: string;
  name: string;
  type?: 'text' | 'password' | 'textarea';
  value?: string;
  required?: boolean;
  focus?: boolean;
  placeholder?: string;
}

// # Forms
export interface FormEncrypt {
  title: string;
  hint: string;
  password: string;
  passwordConfirm: string;
}

export interface FormEdit {
  password: string;
}

export interface FormChangePassword {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
  title: string;
  hint: string;
}
