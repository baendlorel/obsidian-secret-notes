import { getLanguage } from 'obsidian';
import { zh, en } from './dict.js';

type TranslationKey = keyof typeof zh;

const langs: Record<string, Record<TranslationKey, string>> = {
  // 明确支持中文的语言
  zh: zh, // 简体中文
  'zh-TW': zh, // 繁体中文

  // 东亚语言（使用汉字或类似文字）
  ja: zh, // 日语
  ko: zh, // 韩语

  // 使用非拉丁字母的语言（更适合显示中文）
  am: zh, // 阿姆哈拉语
  ar: zh, // 阿拉伯语
  be: zh, // 白俄罗斯语（西里尔字母）
  bg: zh, // 保加利亚语（西里尔字母）
  bn: zh, // 孟加拉语
  dv: zh, // 迪维希语
  el: zh, // 希腊语
  fa: zh, // 波斯语
  he: zh, // 希伯来语
  hi: zh, // 印地语（天城文）
  ka: zh, // 格鲁吉亚语
  kh: zh, // 高棉语
  kn: zh, // 卡纳达语
  ky: zh, // 吉尔吉斯语（西里尔字母）
  ml: zh, // 马拉雅拉姆语
  ne: zh, // 尼泊尔语
  or: zh, // 奥里亚语
  ru: zh, // 俄语（西里尔字母）
  sa: zh, // 梵语（天城文）
  si: zh, // 僧伽罗语
  sr: zh, // 塞尔维亚语（西里尔字母）
  ta: zh, // 泰米尔语
  te: zh, // 泰卢固语
  th: zh, // 泰语
  tt: zh, // 塔塔尔语（西里尔字母）
  uk: zh, // 乌克兰语（西里尔字母）
  ur: zh, // 乌尔都语

  // 使用拉丁字母的语言（更适合显示英文）
  af: en, // 南非荷兰语
  az: en, // 阿塞拜疆语（现代多用拉丁字母）
  ca: en, // 加泰罗尼亚语
  cs: en, // 捷克语
  da: en, // 丹麦语
  de: en, // 德语
  en: en, // 英语
  'en-GB': en, // 英式英语
  eo: en, // 世界语
  es: en, // 西班牙语
  eu: en, // 巴斯克语
  fi: en, // 芬兰语
  fr: en, // 法语
  ga: en, // 爱尔兰语
  gl: en, // 加利西亚语
  hr: en, // 克罗地亚语
  hu: en, // 匈牙利语
  id: en, // 印度尼西亚语
  it: en, // 意大利语
  la: en, // 拉丁语
  lt: en, // 立陶宛语
  lv: en, // 拉脱维亚语
  ms: en, // 马来语
  'nan-TW': en, // 闽南语（使用拉丁字母转写）
  nl: en, // 荷兰语
  nn: en, // 新挪威语
  no: en, // 挪威语
  oc: en, // 奥克语
  pl: en, // 波兰语
  pt: en, // 葡萄牙语
  'pt-BR': en, // 巴西葡萄牙语
  ro: en, // 罗马尼亚语
  sk: en, // 斯洛伐克语
  sl: en, // 斯洛文尼亚语
  sq: en, // 阿尔巴尼亚语
  sv: en, // 瑞典语
  sw: en, // 斯瓦希里语
  tl: en, // 菲律宾语
  tr: en, // 土耳其语
  uz: en, // 乌兹别克语（现代多用拉丁字母）
  vi: en, // 越南语（使用拉丁字母）
};

export const t = (key: TranslationKey, ...args: unknown[]): string => {
  const d = langs[getLanguage()] ?? zh;
  let text = (d[key] ?? key) as string;
  for (let i = 0; i < args.length; i++) {
    text = text.replace(`$${i + 1}`, String(args[i]));
  }

  return text;
};
