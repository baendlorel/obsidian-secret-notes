export interface SecretPayload {
  v: number;
  title?: string;
  hint?: string;
  encrypted: string;
  date: string;
}

export type NormalizedSecretPayload = Required<SecretPayload>;

export interface SecretBlock {
  from: number;
  to: number;
  lineStart: number;
  lineEnd: number;
  raw: string;
  content: string;
}

export interface EncryptArgs {
  plaintext: string;
  password: string;
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

export interface FormPasswordInput {
  password: string;
}

export interface FormChangePassword {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
  title: string;
  hint: string;
}

export interface FormEdit {
  title: string;
  hint: string;
  plaintext: string;
}
