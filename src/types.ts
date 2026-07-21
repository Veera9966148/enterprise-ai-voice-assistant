export type Persona = "friendly" | "professional" | "witty" | "zen" | "tech";

export type LLMModel = 
  | "gemini-3.6-flash"
  | "gemini-3.1-pro-preview"
  | "gemini-3.1-flash-lite"
  | "gemini-flash-latest";

export type MemoryCategory = 
  | "user_profile"
  | "preference"
  | "knowledge"
  | "conversation"
  | "session";

export interface MemoryItem {
  id: string;
  title: string;
  category: MemoryCategory;
  content: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  importanceScore: number; // 1 to 10
}

export interface UserProfileData {
  name?: string;
  nickname?: string;
  profession?: string;
  education?: string;
  skills?: string[];
  goals?: string[];
  interests?: string[];
  favoriteLanguage?: string;
  preferredModel?: string;
  preferredLanguage?: string;
}

export type ToolId = "calculator" | "weather" | "web_search" | "date_time" | "unit_converter";

export interface ToolUsedInfo {
  toolId: ToolId;
  name: string;
  executionTimeMs: number;
  result: string;
  confidence: number;
  status: "success" | "error";
  input: string;
  errorDetails?: string;
}

export interface ToolExecutionRecord extends ToolUsedInfo {
  id: string;
  timestamp: Date | string;
}

export interface ToolCatalogItem {
  id: ToolId;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  examples: string[];
  usageCount: number;
  avgLatencyMs: number;
}

export interface FileAttachment {
  name: string;
  mimeType: string;
  data: string; // Base64 data string or URL
  type: "image" | "document";
  size?: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isSpeech?: boolean;
  sourcesUsed?: string[];
  memoriesUsed?: string[];
  toolUsed?: ToolUsedInfo;
  attachment?: FileAttachment;
}

export type VisionMode = 
  | "auto"
  | "ocr"
  | "summary"
  | "ui_ux"
  | "error_debug"
  | "chart_reader"
  | "action_items"
  | "qa";

export interface VisionAnalysisResult {
  id: string;
  title: string;
  fileType: "image" | "document";
  fileFormat: string;
  fileName: string;
  fileSize: number;
  previewUrl?: string;
  mode: VisionMode;
  summary: string;
  ocrText?: string;
  sceneDescription?: string;
  uiAnalysis?: string;
  errorFix?: string;
  keyPoints?: string[];
  actionItems?: string[];
  sources?: string[];
  qaAnswers?: { question: string; answer: string }[];
  timestamp: Date | string;
  indexedToRag: boolean;
}

export interface RagDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  enabled: boolean;
  createdAt: Date;
}

export interface AssistantSettings {
  name: string;
  persona: Persona;
  voiceURI: string; // Web Speech API SpeechSynthesisVoice URI
  voiceRate: number; // 0.5 to 2
  voicePitch: number; // 0.5 to 2
  muteOutput: boolean;
  autoSpeak: boolean;
  continuousListening: boolean;
  // LLM & API Integration
  model: LLMModel;
  temperature: number;
  enableSearchGrounding: boolean;
  enableRag: boolean;
  ragTopK: number;
  // AI Memory Settings
  enableMemory: boolean;
  autoExtractMemory: boolean;
  memorySearchTopK: number;
  // Tool System Settings
  enableTools: boolean;
  enabledToolIds: Record<ToolId, boolean>;
}

export interface PersonaDetails {
  id: Persona;
  label: string;
  iconName: string;
  description: string;
  bgColor: string;
  waveColor: string;
  accentColor: string;
  glowingColor: string;
  suggestedPrompts: string[];
}


