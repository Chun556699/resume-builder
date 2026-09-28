// 简历成品（预览 / PDF / 图片导出）的固定文案字典。
// 仅覆盖模板渲染层的中英文切换；编辑器 UI 不在此范围。
export type ResumeLang = "zh" | "en";

export interface ResumeStrings {
  summary: string; // 个人简介
  experience: string; // 工作经历
  project: string; // 项目经历
  education: string; // 教育经历
  skill: string; // 专业技能
  contact: string; // 联系方式
  present: string; // 至今
  custom: string; // 自定义板块默认标题
  name: string; // 姓名占位符
  jobTitle: string; // 岗位占位符
  unfilled: string; // 联系方式未填写占位
  resumeWord: string; // 「简历」一词（PDF 标题/兜底名）
}

const DICT: Record<ResumeLang, ResumeStrings> = {
  zh: {
    summary: "个人简介",
    experience: "工作经历",
    project: "项目经历",
    education: "教育经历",
    skill: "专业技能",
    contact: "联系方式",
    present: "至今",
    custom: "自定义",
    name: "姓名",
    jobTitle: "岗位",
    unfilled: "（未填写）",
    resumeWord: "简历",
  },
  en: {
    summary: "Summary",
    experience: "Work Experience",
    project: "Projects",
    education: "Education",
    skill: "Skills",
    contact: "Contact",
    present: "Present",
    custom: "Custom",
    name: "Name",
    jobTitle: "Title",
    unfilled: "(Not filled)",
    resumeWord: "Resume",
  },
};

export function resumeT(lang?: ResumeLang): ResumeStrings {
  return DICT[lang || "zh"];
}
