export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function splitBullets(text: string): string[] {
  return (text || "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// 将富文本（内联 HTML + \n 换行）还原为纯文本，用于左侧表单输入框展示，
// 避免 <b>/<span> 等样式代码直接出现在输入框里。
export function htmlToPlainText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|li|ul|ol|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\n[ \t]+/g, "\n")
    .trim();
}

export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const copy = [...arr];
  if (from < 0 || from >= copy.length || to < 0 || to >= copy.length) return copy;
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}

/* ---- 板块顺序（支持固定板块 + 单个自定义模块） ---- */

export const FIXED_SECTIONS = ["summary", "experience", "project", "education", "skill"] as const;

// 将持久化的 sectionOrder（可能含旧的 "custom" 分组或单个 custom:<id>）解析为完整顺序
export function buildSectionOrder(
  data: { customSections: { id: string }[] },
  existing?: string[]
): string[] {
  const customKeys = data.customSections.map((c) => `custom:${c.id}`);
  const result: string[] = [];
  const seen = new Set<string>();
  const push = (k: string) => {
    if (!seen.has(k)) {
      result.push(k);
      seen.add(k);
    }
  };
  for (const k of existing || []) {
    if (k === "custom") {
      customKeys.forEach(push);
    } else if ((FIXED_SECTIONS as readonly string[]).includes(k) || customKeys.includes(k)) {
      push(k);
    }
  }
  FIXED_SECTIONS.forEach(push);
  customKeys.forEach(push);
  return result;
}
