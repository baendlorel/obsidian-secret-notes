export interface SecretNotesSettings {
  blockName: string;
}

/** 元信息 shared by secret / secretimage blocks */
export interface SecretMeta {
  v: number;
  title?: string;
  hint?: string;
  date: string;
}

export interface SecretPayload extends SecretMeta {
  encrypted: string;
}

export type NormalizedSecretPayload = Required<SecretPayload>;

/** Reference to an encrypted image file under `.secretimage/` */
export interface SecretImageInfo {
  name: string;
  ext: string;
}

export interface SecretImagePayload extends SecretMeta {
  image: SecretImageInfo;
}

export type NormalizedSecretImagePayload = Required<SecretImagePayload>;

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

export type ImageEncryptInput = Omit<FormEncrypt, 'passwordConfirm'>;

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
