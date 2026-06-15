/** Recruiter-focused quick-start cards on empty /chat (click sends full prompt). */

export type ChatStarterCard = {
  id: string;
  title: string;
  prompt: string;
};

/** Ordered for HR / hiring manager browse path (highest intent first). */
export const RECRUITER_STARTER_CARDS: readonly ChatStarterCard[] = [
  {
    id: "work-authorization",
    title: "Work Authorization",
    prompt: "Does Taixing require visa sponsorship?",
  },
  {
    id: "resume-download",
    title: "Resume Download",
    prompt: "Where can I download Taixing Bi's resume?",
  },
  {
    id: "ai-infrastructure",
    title: "AI Infrastructure",
    prompt: "Summarize Taixing's Kubernetes and platform engineering experience.",
  },
  {
    id: "huntai-platform",
    title: "HuntAI Platform",
    prompt: "Explain the architecture and technologies behind HuntAI.",
  },
  {
    id: "project-ownership-impact",
    title: "Project Ownership & Impact",
    prompt: "Describe Taixing's project ownership and measurable impact.",
  },
] as const;
