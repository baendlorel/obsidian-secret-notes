export const SECRET_LANG = 'secret';
export const SECRET_VERSION = 1;
export const isHeader = (v: string) => new RegExp(`^\`\`\`${SECRET_LANG}\\s*$`).test(v);
export const isFooter = (v: string) => /^```\s*$/.test(v);
