"use client";

// 客户端 AI 调用封装：通过 Next.js API 路由代理到硅基流动

export interface AiOptions {
  temperature?: number;
  maxTokens?: number;
}

export async function chatWithAi(
  systemPrompt: string,
  userPrompt: string,
  opts?: AiOptions
): Promise<string> {
  const resp = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: opts?.temperature,
      maxTokens: opts?.maxTokens,
    }),
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data?.error || "AI 调用失败");
  }
  if (!data?.content) {
    throw new Error("AI 未返回内容，请重试");
  }
  return data.content as string;
}

const RESUME_SYSTEM = `你是一位专业的资深简历撰写专家与职业规划顾问，精通中文简历的写作技巧与 ATS（求职者追踪系统）友好原则。
你的任务是根据用户提供的信息，生成或优化简历内容。要求：
1. 语言专业、简洁、量化成果（用数字说话），使用行业通用术语。
2. 内容真实可信，不要编造用户未提供的事实。
3. 直接输出简历正文内容，不要输出解释、客套话或 Markdown 代码块标记。
4. 若用户要求某模块内容，只输出该模块内容本身。`;

export interface GenerateFullResumeInput {
  name: string;
  targetJob: string;
  yearsOfExperience: string;
  skills: string;
  highlights: string;
}

// 一键生成完整简历
export async function generateFullResume(
  input: GenerateFullResumeInput
): Promise<string> {
  const user = `请根据以下信息生成一份完整的中文简历 JSON 数据（严格 JSON，不要 markdown）：
姓名：${input.name || "未提供"}
目标岗位：${input.targetJob || "未提供"}
工作年限：${input.yearsOfExperience || "未提供"}
技能：${input.skills || "未提供"}
亮点/经历：${input.highlights || "未提供"}

请输出如下结构的 JSON（字段名必须完全一致）：
{
  "personal": {"fullName":"", "jobTitle":"", "email":"", "phone":"", "location":"", "website":"", "summary":""},
  "experiences": [{"company":"", "position":"", "location":"", "startDate":"2021-07", "endDate":"", "current":true, "description":"每行一个要点，用\\n分隔"}],
  "education": [{"school":"", "degree":"", "major":"", "startDate":"", "endDate":"", "description":""}],
  "projects": [{"name":"", "role":"", "link":"", "startDate":"", "endDate":"", "description":"每行一个要点，用\\n分隔"}],
  "skills": [{"name":"前端", "items":"React, TypeScript"}],
  "customSections": []
}
未提供的信息可以给出合理的通用示例或留空。只输出 JSON。`;

  return chatWithAi(RESUME_SYSTEM, user, { temperature: 0.6, maxTokens: 4096 });
}

// 优化个人总结
export async function polishSummary(summary: string, jobTitle: string): Promise<string> {
  const user = `请优化以下求职者的个人总结（目标岗位：${jobTitle || "未指定"}），使其更专业、突出亮点、量化成果，控制在 80-120 字：\n\n${summary || "（无）"}`;
  return chatWithAi(RESUME_SYSTEM, user, { temperature: 0.7, maxTokens: 800 });
}

// 优化工作经历描述
export async function polishExperience(description: string, position: string): Promise<string> {
  const user = `请优化以下工作经历描述（岗位：${position || "未指定"}），采用「动词开头 + 量化成果」的写法，每行一个要点，用换行分隔，共 3-6 个要点：\n\n${description || "（无）"}`;
  return chatWithAi(RESUME_SYSTEM, user, { temperature: 0.7, maxTokens: 1200 });
}

// 根据 JD 定制简历（岗位匹配优化）
export async function tailorToJob(resumeJson: string, jobDescription: string): Promise<string> {
  const user = `以下是求职者当前简历 JSON：\n${resumeJson}\n\n以下是目标职位描述（JD）：\n${jobDescription}\n\n请根据 JD 优化这份简历：提取 JD 关键词，优化「个人总结」使其更匹配目标岗位，并在工作经历与项目经历中突出与 JD 相关的技能与成果。输出优化后的完整简历 JSON（保持原结构，字段名一致），只输出 JSON。`;
  return chatWithAi(RESUME_SYSTEM, user, { temperature: 0.5, maxTokens: 4096 });
}

// 通用语言润色（大白话 → 专业表达）
export async function polishText(text: string, kind: string): Promise<string> {
  const user = `请润色以下${kind}内容，使语言更专业、简洁、有说服力，使用量化表达，保留原意和关键信息，不要编造事实：\n\n${text || "（无）"}`;
  return chatWithAi(RESUME_SYSTEM, user, { temperature: 0.6, maxTokens: 1200 });
}

// 优化项目经历
export async function polishProject(description: string, name: string): Promise<string> {
  return polishText(description, `项目经历「${name || "未命名项目"}」描述`);
}

// 优化教育经历
export async function polishEducation(description: string, school: string): Promise<string> {
  return polishText(description, `教育经历「${school || "未指定学校"}」`);
}

// 优化技能
export async function polishSkills(items: string): Promise<string> {
  const user = `请整理并润色以下技能列表，使用规范的行业术语，按相关性排序，用逗号分隔（保持简洁）：\n\n${items || "（无）"}`;
  return chatWithAi(RESUME_SYSTEM, user, { temperature: 0.5, maxTokens: 800 });
}

// 优化自定义模块
export async function polishCustom(content: string, title: string): Promise<string> {
  return polishText(content, `「${title || "自定义模块"}」`);
}

// 提取/解析 JSON（容错处理）
export function extractJson(text: string): any {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        /* ignore */
      }
    }
    return null;
  }
}
