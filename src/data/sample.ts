import { ResumeData } from "@/types/resume";

export const emptyResume: ResumeData = {
  personal: {
    fullName: "",
    jobTitle: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    avatar: "",
    summary: "",
  },
  experiences: [],
  education: [],
  projects: [],
  skills: [],
  customSections: [],
};

export const sampleResume: ResumeData = {
  personal: {
    fullName: "张三",
    jobTitle: "高级前端工程师",
    email: "zhangsan@example.com",
    phone: "138-0000-0000",
    location: "北京",
    website: "https://github.com/zhangsan",
    avatar: "",
    summary:
      "拥有 6 年前端开发经验，深耕 React/TypeScript 技术栈，主导过多个大型 Web 应用从 0 到 1 的建设。擅长性能优化、工程化建设与跨团队协作，注重代码质量与用户体验。",
  },
  experiences: [
    {
      id: "exp-1",
      company: "某互联网科技公司",
      position: "高级前端工程师",
      location: "北京",
      startDate: "2021-07",
      endDate: "",
      current: true,
      description:
        "负责公司核心业务中台的前端架构设计与开发，主导微前端方案落地，接入 5 个业务线\n设计并实现组件库与设计系统，被 10+ 团队复用，提升 30% 研发效率\n推动 Web 性能优化，首屏加载时间从 4.5s 降至 1.8s\n指导 3 名初级工程师，组织组内技术分享与 Code Review",
    },
    {
      id: "exp-2",
      company: "某创业公司",
      position: "前端工程师",
      location: "上海",
      startDate: "2018-07",
      endDate: "2021-06",
      current: false,
      description:
        "参与电商平台 Web 端与 H5 端开发，负责商品、订单、支付等核心模块\n基于 React + TypeScript 重构旧项目，代码可维护性显著提升\n搭建前端监控体系，线上问题定位效率提升 50%",
    },
  ],
  education: [
    {
      id: "edu-1",
      school: "某某大学",
      degree: "本科",
      major: "计算机科学与技术",
      startDate: "2014-09",
      endDate: "2018-06",
      description: "GPA 3.7/4.0，获校级优秀毕业生，参与 ACM 竞赛并获省级二等奖",
    },
  ],
  projects: [
    {
      id: "proj-1",
      name: "低代码可视化搭建平台",
      role: "核心开发者",
      link: "https://github.com/example/lowcode",
      startDate: "2022-01",
      endDate: "2022-12",
      description:
        "基于 React + Redux + Konva 实现拖拽式页面搭建引擎\n设计 JSON Schema 驱动渲染协议，支持组件热插拔与版本管理\n支撑公司内部 200+ 运营页面搭建，交付效率提升 3 倍",
    },
  ],
  skills: [
    { id: "skill-1", name: "前端", items: "React, Vue, TypeScript, Next.js, Tailwind CSS, Vite" },
    { id: "skill-2", name: "工程化", items: "Webpack, ESLint, CI/CD, Jest, Playwright, Monorepo" },
    { id: "skill-3", name: "其他", items: "Node.js, Git, Linux, Docker, 性能优化" },
  ],
  customSections: [
    {
      id: "custom-1",
      title: "荣誉奖项",
      content: "2023 年度公司技术之星\n2020 年公司最佳新人奖",
      images: [],
    },
  ],
};
