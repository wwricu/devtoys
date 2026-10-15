"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { ToolDefinition } from "@/lib/tools";

export type Lang = "en" | "zh";

/** Header link target */
export const repoUrl = "https://github.com/wwricu/devtoys";

const shell = {
  en: {
    siteName: "Dev Toys",
    search: "Search tools",
    noMatchingTools: "No matching tools",
    languageLabel: "Language",
    switchTo: "Switch language",
    repositoryLabel: "Dev Toys on GitHub",
    allCategories: "All categories",
    expandCategory: "Expand {name}",
    collapseCategory: "Collapse {name}",
    homeIntro:
      "A collection of everyday developer tools, all running locally in your browser. Nothing is uploaded.",
    english: "EN",
    chinese: "中文",
    copy: "Copy",
    copied: "Copied",
    copyHint: "Copy to clipboard",
    clear: "Clear",
    reset: "Reset",
    input: "Input",
    output: "Output",
    result: "Result",
    ready: "Ready",
    loadingTool: "Loading tool…",
    outputToInput: "Output → Input",
    outputToInputHint: "Move output back into the input",
    ioChars: "Input {input} · Output {output} chars",
    lineCol: "Line {line}, col {col}",
    indentTab: "Tab",
    indent2: "2 spaces",
    indent4: "4 spaces",
    indentMinify: "Minify",
  },
  zh: {
    siteName: "Dev Toys",
    search: "搜索工具",
    noMatchingTools: "没有匹配的工具",
    languageLabel: "语言",
    switchTo: "切换语言",
    repositoryLabel: "在 GitHub 查看源码",
    allCategories: "全部分类",
    expandCategory: "展开 {name}",
    collapseCategory: "收起 {name}",
    homeIntro:
      "常用开发者工具合集，全部在你自己的浏览器里运行，不会上传任何数据。",
    english: "EN",
    chinese: "中文",
    copy: "复制",
    copied: "已复制",
    copyHint: "复制到剪贴板",
    clear: "清空",
    reset: "重置",
    input: "输入",
    output: "输出",
    result: "结果",
    ready: "就绪",
    loadingTool: "工具加载中…",
    outputToInput: "输出回填输入",
    outputToInputHint: "把输出内容放回输入框",
    ioChars: "输入 {input} · 输出 {output} 字符",
    lineCol: "第 {line} 行，第 {col} 列",
    indentTab: "制表符",
    indent2: "2 空格",
    indent4: "4 空格",
    indentMinify: "压缩",
  },
};

export type ShellText = (typeof shell)["en"];

/** English is the source of truth in lib/tools.ts; zh lives here */
const zhCategories: Record<string, string> = {
  Formatters: "格式化",
  "Encoders / Decoders": "编码 / 解码",
  Converters: "转换器",
  Text: "文本",
  Generators: "生成器",
  Utilities: "实用工具",
};

const zhTools: Record<string, { name: string; description: string }> = {
  "json-format": {
    name: "JSON 格式化",
    description: "格式化、压缩、排序并校验 JSON 文本",
  },
  "xml-format": {
    name: "XML 格式化",
    description: "格式化、压缩并校验 XML 文本",
  },
  "text-escape": {
    name: "转义 / 反转义",
    description: "转义或反转义 JSON / JS 风格的字符串字面量",
  },
  base64: {
    name: "Base64",
    description: "将文本或字节编码为 Base64，或解码还原",
  },
  "url-encode": {
    name: "URL 编码",
    description: "对 URL 组件与字符串进行百分号编码或解码",
  },
  "html-entities": { name: "HTML 实体", description: "编码或解码 HTML 实体" },
  "jwt-decode": {
    name: "JWT 解码",
    description: "解码 JSON Web Token 的头部与载荷",
  },
  "date-convert": {
    name: "日期时间转换",
    description: "在 Unix 时间戳与可读日期之间转换",
  },
  "number-base": {
    name: "进制转换",
    description: "在二进制、八进制、十进制与十六进制之间转换整数",
  },
  bytes: {
    name: "字节单位换算",
    description: "在 KB/MB/GB 与 KiB/MiB/GiB 之间换算数据大小",
  },
  "case-convert": {
    name: "命名风格转换",
    description: "在 camelCase、snake_case、kebab 等命名风格之间转换",
  },
  markdown: {
    name: "Markdown 渲染",
    description: "将 Markdown 转为 HTML 并实时预览",
  },
  hash: {
    name: "哈希生成",
    description: "计算文本的 MD5 与 SHA-1/256/384/512 摘要",
  },
  uuid: { name: "UUID 生成", description: "批量生成版本 1 或版本 4 的 UUID" },
  password: { name: "密码生成", description: "生成可自定义字符集的随机密码" },
  regex: {
    name: "正则测试",
    description: "测试正则表达式，实时显示匹配与分组",
  },
  cron: {
    name: "Cron 表达式解析",
    description: "解析 cron 表达式并列出接下来的执行时间",
  },
  "url-parse": {
    name: "URL 解析",
    description: "将 URL 拆分为各个组成部分与查询参数",
  },
  "text-diff": {
    name: "文本对比",
    description: "逐行比较两段文本，支持并排与统一视图",
  },
  base32: {
    name: "Base32",
    description: "编码或解码 Base32（RFC 4648 与 Base32Hex）",
  },
  gzip: {
    name: "GZip 压缩 / 解压",
    description: "用 gzip 或 deflate 压缩文本并还原",
  },
  "jwt-sign": {
    name: "JWT 签名 / 验证",
    description: "生成 HMAC 签名的 JWT 并校验令牌签名",
  },
  color: {
    name: "颜色转换",
    description: "在 HEX、RGB、HSL、HSV 与 CMYK 之间转换",
  },
  "json-yaml": {
    name: "JSON / YAML 转换",
    description: "在 JSON 与 YAML 之间双向转换",
  },
  "json-csv": {
    name: "JSON / CSV 转换",
    description: "将 JSON 数组转为 CSV 行，也可反向转换",
  },
  "text-stats": {
    name: "文本统计",
    description: "统计字符数、词数、句数与阅读时长",
  },
  "image-convert": {
    name: "图片格式转换",
    description: "在 PNG、JPEG 与 WebP 之间转换图片",
  },
  "image-base64": {
    name: "图片 / Base64",
    description: "将图片转为 Base64 data URL，或还原成图片",
  },
  "pem-decode": {
    name: "证书 / PEM 查看",
    description: "从 PEM 文本读取 X.509 证书、CSR、密钥或 CRL",
  },
  hmac: { name: "HMAC 生成", description: "使用密钥生成或验证 HMAC-SHA 签名" },
  "random-number": {
    name: "随机数生成",
    description: "在区间内生成随机整数或小数",
  },
  aes: { name: "AES 加密 / 解密", description: "使用口令以 AES-GCM 加密文本" },
  "line-tools": {
    name: "行工具",
    description: "对文本行排序、去重、编号、裁剪与合并",
  },
  cidr: {
    name: "CIDR 计算器",
    description: "将 IPv4 地址与前缀解析为网段信息",
  },
  chmod: {
    name: "Chmod 计算器",
    description: "在 Unix 权限与八进制模式之间互相转换",
  },
  totp: {
    name: "TOTP / 两步验证",
    description: "生成并验证基于时间的一次性密码",
  },
  base16: {
    name: "十六进制 / 码点",
    description: "将文本转为十六进制、\\x、\\u、二进制或 HTML 转义",
  },
  semver: { name: "版本比较", description: "比较并拆解语义化版本号" },
  "user-agent": {
    name: "User-Agent 解析",
    description: "从 UA 字符串读出浏览器、内核与平台",
  },
  "qr-code": {
    name: "二维码生成",
    description: "把文本或网址生成可下载的二维码",
  },
  toml: {
    name: "JSON / TOML 转换",
    description: "把 TOML 表读成 JSON，也可以写回去",
  },
  "sql-format": {
    name: "SQL 格式化",
    description: "排版、压缩并调整 SQL 语句大小写",
  },
  "html-md": {
    name: "HTML 转 Markdown",
    description: "把 HTML 标记转换回 Markdown 文本",
  },
  base58: {
    name: "Base58",
    description: "将字节编码为 Base58 或比特币、瑞波变体",
  },
  idn: {
    name: "Punycode / 中文域名",
    description: "在国际化域名与 xn-- 形式之间转换",
  },
  "svg-preview": {
    name: "SVG 预览",
    description: "渲染 SVG 文档并导出为 PNG 图片",
  },
  "xml-json": {
    name: "XML / JSON 转换",
    description: "把 XML 标记转成 JSON，也可以写回值树",
  },
  "json-ts": {
    name: "JSON 转 TypeScript",
    description: "从 JSON 样本推导接口与联合类型",
  },
  keypair: {
    name: "密钥对生成",
    description: "创建 RSA 或 EC 密钥，导出 PEM 与 JWK，签名并验证文本",
  },
  code128: {
    name: "Code 128 条码",
    description: "把 ASCII 文本编码为 Code 128 条码并导出 SVG 或 PNG",
  },
  slug: {
    name: "Slug 生成",
    description: "把标题转成 URL slug，折叠重音符号与标点",
  },
  lorem: {
    name: "Lorem Ipsum 生成",
    description: "按词、句或段落生成占位文本，可选 HTML",
  },
};

type Value = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: ShellText;
  /** Text used by navigation: falls back to English when a key is missing */
  toolName: (tool: ToolDefinition) => string;
  toolDescription: (tool: ToolDefinition) => string;
  categoryName: (name: string) => string;
  /** Every spelling of a tool, so one query matches in both languages */
  toolSearchText: (tool: ToolDefinition) => string[];
};

function build(lang: Lang, setLang: (lang: Lang) => void): Value {
  const zh = lang === "zh";
  return {
    lang,
    setLang,
    t: shell[lang],
    toolName: (tool) => (zh ? zhTools[tool.id]?.name : undefined) ?? tool.name,
    toolDescription: (tool) =>
      (zh ? zhTools[tool.id]?.description : undefined) ?? tool.description,
    categoryName: (name) => (zh ? (zhCategories[name] ?? name) : name),
    toolSearchText: (tool) => {
      const localized = zhTools[tool.id];
      return [
        tool.name,
        tool.description,
        tool.category,
        ...(localized ? [localized.name, localized.description] : []),
        ...tool.keywords,
      ];
    },
  };
}

const contextDefault = build("en", () => {});

const LangContext = createContext<Value>(contextDefault);

const langKey = "tool:ui.lang";

const langListeners = new Set<() => void>();

function readLang(): Lang {
  try {
    return localStorage.getItem(langKey) === '"zh"' ? "zh" : "en";
  } catch {
    return "en";
  }
}

function writeLang(lang: Lang) {
  try {
    localStorage.setItem(langKey, JSON.stringify(lang));
  } catch {
    /* silently ignore when storage is unavailable */
  }
  langListeners.forEach((notify) => notify());
}

function subscribeLang(notify: () => void) {
  langListeners.add(notify);
  window.addEventListener("storage", notify);
  return () => {
    langListeners.delete(notify);
    window.removeEventListener("storage", notify);
  };
}

function serverLang(): Lang {
  return "en";
}

export function LangProvider({ children }: { children: ReactNode }) {
  // Server snapshot is English, so hydration can never mismatch the markup.
  const lang = useSyncExternalStore(subscribeLang, readLang, serverLang);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);

  const value = useMemo(() => build(lang, writeLang), [lang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): Value {
  return useContext(LangContext);
}

/**
 * Feature strings live in `features/<tool>/locale.ts`, so each dictionary is
 * bundled inside that tool's lazy chunk instead of the shared first paint.
 */
export function useText<T extends Record<string, string>>(dict: {
  en: T;
  zh: T;
}): T {
  const { lang } = useLang();
  return dict[lang];
}

/** Replace `{name}` placeholders inside a translated template. */
export function fill(
  template: string,
  args: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in args ? String(args[name]) : match,
  );
}
