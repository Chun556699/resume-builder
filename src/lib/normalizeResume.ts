import { ResumeData } from "@/types/resume";
import { uid } from "@/lib/utils";

function randId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

// 归一化旧版本持久化数据，确保新增字段存在，避免运行时报错
export function normalizeResumeData(d: any): ResumeData {
  const src = d || {};
  return {
    personal: {
      fullName: "",
      jobTitle: "",
      email: "",
      phone: "",
      location: "",
      website: "",
      avatar: "",
      summary: "",
      ...(src.personal || {}),
    },
    experiences: Array.isArray(src.experiences) ? src.experiences : [],
    education: Array.isArray(src.education) ? src.education : [],
    projects: Array.isArray(src.projects) ? src.projects : [],
    skills: Array.isArray(src.skills) ? src.skills : [],
    customSections: Array.isArray(src.customSections)
      ? src.customSections.map((c: any) => ({
          id: c?.id || randId("custom"),
          title: c?.title || "",
          content: c?.content || "",
          images: Array.isArray(c?.images) ? c.images : [],
        }))
      : [],
  };
}

// 将 AI / OCR 返回的 JSON 归一化为 ResumeData（生成新 id）
export function normalizeResumePayload(json: any): ResumeData {
  const empty: ResumeData = {
    personal: { fullName: "", jobTitle: "", email: "", phone: "", location: "", website: "", avatar: "", summary: "" },
    experiences: [], education: [], projects: [], skills: [], customSections: [],
  };
  if (!json || typeof json !== "object") return empty;

  const p = json.personal || {};
  empty.personal = {
    fullName: String(p.fullName || ""), jobTitle: String(p.jobTitle || ""),
    email: String(p.email || ""), phone: String(p.phone || ""),
    location: String(p.location || ""), website: String(p.website || ""),
    avatar: "", summary: String(p.summary || ""),
  };

  const arr = (x: any) => (Array.isArray(x) ? x : []);
  empty.experiences = arr(json.experiences).map((x: any) => ({
    id: uid("exp"), company: String(x.company || ""), position: String(x.position || ""),
    location: String(x.location || ""), startDate: String(x.startDate || ""),
    endDate: String(x.endDate || ""), current: !!x.current, description: String(x.description || ""),
  }));
  empty.education = arr(json.education).map((x: any) => ({
    id: uid("edu"), school: String(x.school || ""), degree: String(x.degree || ""),
    major: String(x.major || ""), startDate: String(x.startDate || ""),
    endDate: String(x.endDate || ""), description: String(x.description || ""),
  }));
  empty.projects = arr(json.projects).map((x: any) => ({
    id: uid("proj"), name: String(x.name || ""), role: String(x.role || ""),
    link: String(x.link || ""), startDate: String(x.startDate || ""),
    endDate: String(x.endDate || ""), description: String(x.description || ""),
  }));

  const skills = arr(json.skills);
  if (skills.length > 0) {
    empty.skills = typeof skills[0] === "string"
      ? [{ id: uid("skill"), name: "专业技能", items: skills.join(", ") }]
      : skills.map((x: any) => ({
          id: uid("skill"),
          name: String(x.name || "技能"),
          items: Array.isArray(x.items) ? x.items.join(", ") : String(x.items || ""),
        }));
  }

  empty.customSections = arr(json.customSections).map((x: any) => ({
    id: uid("custom"), title: String(x.title || ""), content: String(x.content || ""), images: [],
  }));

  return empty;
}
