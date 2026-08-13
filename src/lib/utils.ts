export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function splitBullets(text: string): string[] {
  return (text || "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const copy = [...arr];
  if (from < 0 || from >= copy.length || to < 0 || to >= copy.length) return copy;
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}

export function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
