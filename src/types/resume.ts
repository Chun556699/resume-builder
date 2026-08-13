// 简历数据模型（JSON Schema 风格）

export interface PersonalInfo {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  avatar: string; // dataURL（PNG/JPEG）或空字符串
  summary: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string; // 支持换行的纯文本，每行一个要点
}

export interface EducationItem {
  id: string;
  school: string;
  degree: string;
  major: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  role: string;
  link: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface SkillGroup {
  id: string;
  name: string;
  items: string; // 逗号或空格分隔
}

export interface CustomSection {
  id: string;
  title: string;
  content: string;
  images: string[]; // dataURL 列表
}

export interface ResumeData {
  personal: PersonalInfo;
  experiences: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  skills: SkillGroup[];
  customSections: CustomSection[];
}

export type TemplateId =
  | "classic" // 经典单栏
  | "modern" // 现代双栏
  | "compact" // 紧凑单栏
  | "elegant" // 优雅衬线
  | "sidebar" // 深色侧栏
  | "timeline" // 时间轴
  | "minimal" // 极简留白
  | "geek"; // 极客（程序员高密度）

export type PaperSize = "A4" | "Letter" | "Legal" | "A5";

export type FontFamily = "sans" | "serif" | "kai" | "puhuiti" | "smiley";

export type AvatarShape = "circle" | "square";
