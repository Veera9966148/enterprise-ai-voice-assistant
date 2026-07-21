import { PersonaDetails } from "./types";

export const PERSONAS: PersonaDetails[] = [
  {
    id: "friendly",
    label: "Friendly & Warm",
    iconName: "Smile",
    description: "Cheerful, enthusiastic, and highly empathetic companion.",
    bgColor: "bg-emerald-50/50 dark:bg-emerald-950/20",
    waveColor: "rgba(16, 185, 129, 0.4)", // emerald
    accentColor: "emerald",
    glowingColor: "shadow-emerald-500/30 dark:shadow-emerald-500/20",
    suggestedPrompts: [
      "Tell me a cheerful short story",
      "I had a busy day, can we chat?",
      "Give me a positive quote for today",
      "What is your favorite hobby?"
    ]
  },
  {
    id: "professional",
    label: "Professional Expert",
    iconName: "Briefcase",
    description: "Highly articulate, efficient, direct, and intelligent.",
    bgColor: "bg-blue-50/50 dark:bg-blue-950/20",
    waveColor: "rgba(59, 130, 246, 0.4)", // blue
    accentColor: "blue",
    glowingColor: "shadow-blue-500/30 dark:shadow-blue-500/20",
    suggestedPrompts: [
      "Summarize the benefits of solar energy",
      "Draft a professional reply to a client query",
      "Explain quantum computing in simple terms",
      "Give me a productivity tips list"
    ]
  },
  {
    id: "witty",
    label: "Witty & Playful",
    iconName: "Sparkles",
    description: "Energetic, funny, and loves a good banter.",
    bgColor: "bg-amber-50/50 dark:bg-amber-950/20",
    waveColor: "rgba(245, 158, 11, 0.4)", // amber
    accentColor: "amber",
    glowingColor: "shadow-amber-500/30 dark:shadow-amber-500/20",
    suggestedPrompts: [
      "Tell me a hilarious tech joke",
      "Do you think robots will take over?",
      "Give me a sarcastic remark about Mondays",
      "Who would win: a ninja or a pirate?"
    ]
  },
  {
    id: "zen",
    label: "Zen Mindful",
    iconName: "Heart",
    description: "Calm, peaceful, soothing, and encourages mindfulness.",
    bgColor: "bg-purple-50/50 dark:bg-purple-950/20",
    waveColor: "rgba(168, 85, 247, 0.4)", // purple
    accentColor: "purple",
    glowingColor: "shadow-purple-500/30 dark:shadow-purple-500/20",
    suggestedPrompts: [
      "Guide me through a 1-minute breathing exercise",
      "Help me calm my anxious thoughts",
      "What is a beautiful zen proverb?",
      "Describe a peaceful beach at sunset"
    ]
  },
  {
    id: "tech",
    label: "Tech Guru",
    iconName: "Cpu",
    description: "Nerdily passionate about coding, gadgets, and the future.",
    bgColor: "bg-cyan-50/50 dark:bg-cyan-950/20",
    waveColor: "rgba(6, 182, 212, 0.4)", // cyan
    accentColor: "cyan",
    glowingColor: "shadow-cyan-500/30 dark:shadow-cyan-500/20",
    suggestedPrompts: [
      "How does a recursive function work?",
      "Explain the differences between REST and GraphQL",
      "What is the future of AI in 10 years?",
      "Give me a quick terminal cheat sheet"
    ]
  }
];
