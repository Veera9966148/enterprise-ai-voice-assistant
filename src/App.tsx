import { useEffect, useRef, useState, FormEvent, ChangeEvent, useMemo } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Moon,
  Sun,
  Send,
  AlertCircle,
  X,
  Database,
  Settings as SettingsIcon,
  MessageSquare,
  Brain,
  Wrench,
  Eye,
  Paperclip,
} from "lucide-react";
import { AssistantSettings, Message, RagDocument, MemoryItem, UserProfileData, ToolExecutionRecord, ToolId, FileAttachment } from "./types";
import { PERSONAS } from "./data";
import VoiceOrb from "./components/VoiceOrb";
import SettingsPanel from "./components/SettingsPanel";
import ChatLogs from "./components/ChatLogs";
import RagManager from "./components/RagManager";
import MemoryManager from "./components/MemoryManager";
import ToolsManager from "./components/ToolsManager";
import VisionManager from "./components/VisionManager";
import { processUploadedFile } from "./lib/docProcessor";

const DEFAULT_SETTINGS: AssistantSettings = {
  name: "Echo",
  persona: "friendly",
  voiceURI: "",
  voiceRate: 1.0,
  voicePitch: 1.0,
  muteOutput: false,
  autoSpeak: true,
  continuousListening: false,
  model: "gemini-3.6-flash",
  temperature: 0.7,
  enableSearchGrounding: false,
  enableRag: true,
  ragTopK: 3,
  enableMemory: true,
  autoExtractMemory: true,
  memorySearchTopK: 5,
  enableTools: true,
  enabledToolIds: {
    calculator: true,
    weather: true,
    web_search: true,
    date_time: true,
    unit_converter: true,
  },
};

const INITIAL_MEMORIES: MemoryItem[] = [
  {
    id: "mem-1",
    title: "User Identity & Profession",
    category: "user_profile",
    content: "User is an AI Engineer who builds full-stack applications and Kotlin Android apps.",
    importanceScore: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "mem-2",
    title: "Favorite Programming Language",
    category: "preference",
    content: "User's favorite programming language is TypeScript, followed by Kotlin and Rust.",
    importanceScore: 9,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "mem-3",
    title: "Primary Career Goal",
    category: "user_profile",
    content: "User's goal is to deploy high-performance AI Voice Assistants with low latency RAG and Memory integration.",
    importanceScore: 9,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const INITIAL_RAG_DOCS: RagDocument[] = [
  {
    id: "doc-1",
    title: "AI Voice Assistant Capabilities & Specs",
    category: "Technical Overview",
    content: "This AI Voice Assistant supports multi-model LLM reasoning (Gemini 2.5 Flash, Gemini 2.5 Pro, Gemini 3.6 Flash), Web Speech API voice synthesis, continuous hands-free dialogue, custom RAG knowledge grounding, and an advanced AI Memory system for long-term and short-term profile recall.",
    enabled: true,
    createdAt: new Date(),
  },
  {
    id: "doc-2",
    title: "Company Return Policy & Support Hours",
    category: "Company Policies",
    content: "All purchases qualify for a 100 percent full refund within 30 days of delivery. Support operates Monday through Friday, 9 AM to 6 PM Eastern Time. Email support is support@example.com.",
    enabled: true,
    createdAt: new Date(),
  },
  {
    id: "doc-3",
    title: "User Profile & Preferences",
    category: "Personal Notes",
    content: "The primary user is a full-stack developer who enjoys building Android apps with Kotlin and Jetpack Compose, as well as AI web applications using TypeScript, React, and Gemini models.",
    enabled: true,
    createdAt: new Date(),
  },
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [settings, setSettings] = useState<AssistantSettings>(DEFAULT_SETTINGS);
  const [ragDocuments, setRagDocuments] = useState<RagDocument[]>(INITIAL_RAG_DOCS);
  const [memories, setMemories] = useState<MemoryItem[]>(INITIAL_MEMORIES);
  const [toolLogs, setToolLogs] = useState<ToolExecutionRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"logs" | "tools" | "vision" | "memory" | "rag" | "settings">("logs");
  const [chatAttachment, setChatAttachment] = useState<FileAttachment | null>(null);
  const chatAttachmentInputRef = useRef<HTMLInputElement | null>(null);
  const [assistantState, setAssistantState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [userInput, setUserInput] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize: Load logs, settings, RAG docs, memories and theme from localStorage
  useEffect(() => {
    try {
      const storedLogs = localStorage.getItem("voice_assistant_logs");
      if (storedLogs) {
        const parsed = JSON.parse(storedLogs).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(parsed);
      }

      const storedSettings = localStorage.getItem("voice_assistant_settings");
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        if (!["gemini-3.6-flash", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite", "gemini-flash-latest"].includes(parsedSettings.model)) {
          parsedSettings.model = "gemini-3.6-flash";
        }
        setSettings((prev) => ({ ...prev, ...parsedSettings }));
      }

      const storedRag = localStorage.getItem("voice_assistant_rag_docs");
      if (storedRag) {
        const parsedRag = JSON.parse(storedRag).map((doc: any) => ({
          ...doc,
          createdAt: new Date(doc.createdAt),
        }));
        setRagDocuments(parsedRag);
      }

      const storedMemories = localStorage.getItem("voice_assistant_memories");
      if (storedMemories) {
        const parsedMems = JSON.parse(storedMemories).map((mem: any) => ({
          ...mem,
          createdAt: new Date(mem.createdAt),
          updatedAt: new Date(mem.updatedAt),
        }));
        setMemories(parsedMems);
      }

      const storedToolLogs = localStorage.getItem("voice_assistant_tool_logs");
      if (storedToolLogs) {
        const parsedToolLogs = JSON.parse(storedToolLogs).map((t: any) => ({
          ...t,
          timestamp: new Date(t.timestamp),
        }));
        setToolLogs(parsedToolLogs);
      }

      const storedTheme = localStorage.getItem("voice_assistant_theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initialDark = storedTheme ? storedTheme === "dark" : prefersDark;
      setDarkMode(initialDark);
      if (initialDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch (err) {
      console.error("Failed to load local storage state:", err);
    }
  }, []);

  // Save logs whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("voice_assistant_logs", JSON.stringify(messages));
    } else {
      localStorage.removeItem("voice_assistant_logs");
    }
  }, [messages]);

  // Save settings whenever they change
  useEffect(() => {
    localStorage.setItem("voice_assistant_settings", JSON.stringify(settings));
  }, [settings]);

  // Save RAG documents
  useEffect(() => {
    localStorage.setItem("voice_assistant_rag_docs", JSON.stringify(ragDocuments));
  }, [ragDocuments]);

  // Save Memories
  useEffect(() => {
    localStorage.setItem("voice_assistant_memories", JSON.stringify(memories));
  }, [memories]);

  // Save Tool Logs
  useEffect(() => {
    if (toolLogs.length > 0) {
      localStorage.setItem("voice_assistant_tool_logs", JSON.stringify(toolLogs));
    } else {
      localStorage.removeItem("voice_assistant_tool_logs");
    }
  }, [toolLogs]);

  // Dynamic synthesis of User Profile from Memories
  const userProfile: UserProfileData = useMemo(() => {
    const profile: UserProfileData = {
      skills: [],
      goals: [],
      interests: [],
    };

    memories.forEach((mem) => {
      const lower = mem.content.toLowerCase();
      
      // Name detection
      if (lower.includes("name is")) {
        const match = mem.content.match(/name is\s+([A-Za-z0-9_\-\s]+)/i);
        if (match && match[1]) profile.name = match[1].trim();
      }

      // Profession / Job
      if (lower.includes("ai engineer") || lower.includes("developer") || lower.includes("works as")) {
        profile.profession = mem.content;
      }

      // Favorite language
      if (lower.includes("favorite programming language") || lower.includes("favorite language")) {
        profile.favoriteLanguage = mem.content;
      }

      // Goals
      if (lower.includes("goal") || mem.category === "user_profile") {
        if (!profile.goals) profile.goals = [];
        profile.goals.push(mem.title || mem.content);
      }
    });

    return profile;
  }, [memories]);

  // Toggle Dark Theme
  const toggleTheme = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    localStorage.setItem("voice_assistant_theme", nextDark ? "dark" : "light");
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Check if speech recognition is supported natively
  const isSpeechRecognitionSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // Setup Speech Recognition engine
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      const rec = new SpeechRecognitionClass();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => {
        setAssistantState("listening");
        setInterimTranscript("");
        setErrorMsg(null);
      };

      rec.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (interim) {
          setInterimTranscript(interim);
        }
        if (final) {
          setInterimTranscript("");
          handleVoiceSubmit(final);
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "no-speech") {
          setAssistantState("idle");
        } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setErrorMsg("Microphone permission was denied. Please allow mic access in your address bar.");
          setAssistantState("idle");
        } else {
          setErrorMsg(`Voice input error: ${event.error}`);
          setAssistantState("idle");
        }
      };

      rec.onend = () => {
        setAssistantState((current) => {
          if (current === "listening") {
            return "idle";
          }
          return current;
        });
      };

      recognitionRef.current = rec;
    }
  }, [settings]);

  // Handle active persona configurations
  const activePersonaDetails = PERSONAS.find((p) => p.id === settings.persona) || PERSONAS[0];

  // Starts microphone capture
  const startListening = () => {
    if (!isSpeechRecognitionSupported) {
      setErrorMsg("Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.");
      return;
    }

    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (e: any) {
      console.warn("Recognition already started or error: ", e);
    }
  };

  // Stops microphone capture
  const stopListening = () => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setAssistantState("idle");
    } catch (e) {
      console.error("Error stopping recognition:", e);
    }
  };

  // Text-To-Speech engine play
  const speakText = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    if (settings.muteOutput) {
      setAssistantState("idle");
      return;
    }

    // Clean text of markdown formatting so it is spoken naturally
    const cleanText = text
      .replace(/[\*\#\_\[\]\(\)\{\}\-\+\=\>\<\`]/g, "")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utteranceRef.current = utterance;

    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => v.voiceURI === settings.voiceURI);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = settings.voiceRate;
    utterance.pitch = settings.voicePitch;

    utterance.onstart = () => {
      setAssistantState("speaking");
    };

    utterance.onend = () => {
      setAssistantState("idle");

      // Hands-free continuous conversations
      if (settings.continuousListening && isSpeechRecognitionSupported) {
        setTimeout(() => {
          startListening();
        }, 500);
      }
    };

    utterance.onerror = (err) => {
      console.error("Speech synthesis error:", err);
      setAssistantState("idle");
    };

    window.speechSynthesis.speak(utterance);
  };

  // Submits prompt to Express Server -> Gemini
  const submitQueryToAPI = async (promptText: string, isSpeech: boolean, attachment?: FileAttachment | null) => {
    if (!promptText.trim() && !attachment) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: promptText || `[Attached ${attachment?.type}: ${attachment?.name}]`,
      timestamp: new Date(),
      isSpeech,
      ...(attachment && { attachment }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setAssistantState("thinking");

    try {
      const chatHistoryForAPI = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: promptText || `Please analyze this attached ${attachment?.type}: ${attachment?.name}`,
          history: chatHistoryForAPI,
          ...(attachment && { attachment }),
          persona: settings.persona,
          assistantName: settings.name,
          model: settings.model,
          temperature: settings.temperature,
          enableSearchGrounding: settings.enableSearchGrounding,
          enableRag: settings.enableRag,
          ragDocuments: ragDocuments,
          ragTopK: settings.ragTopK,
          enableMemory: settings.enableMemory,
          autoExtractMemory: settings.autoExtractMemory,
          memories: memories,
          memorySearchTopK: settings.memorySearchTopK,
          enableTools: settings.enableTools,
          enabledToolIds: settings.enabledToolIds,
        }),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Record tool execution if a tool was executed
      if (data.toolUsed) {
        const toolRecord: ToolExecutionRecord = {
          ...data.toolUsed,
          id: "tool_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
          timestamp: new Date(),
        };
        setToolLogs((prev) => [toolRecord, ...prev]);
      }

      // Check for smart auto-extracted memories
      if (Array.isArray(data.extractedMemories) && data.extractedMemories.length > 0) {
        setMemories((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newMems = data.extractedMemories.filter((m: any) => !existingIds.has(m.id));
          return [...newMems, ...prev];
        });
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.text,
        timestamp: new Date(),
        isSpeech: !settings.muteOutput,
        sourcesUsed: data.sourcesUsed,
        memoriesUsed: data.memoriesUsed,
        toolUsed: data.toolUsed,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      speakText(data.text);
    } catch (err: any) {
      console.error("Failed to generate voice response:", err);
      const errString = err.message || "Unknown API error";
      setErrorMsg(`API request error: ${errString}. Reverting model to Gemini 3.6 Flash.`);
      setSettings((prev) => ({ ...prev, model: "gemini-3.6-flash" }));
      setAssistantState("idle");
    }
  };

  const handleVoiceSubmit = (transcript: string) => {
    submitQueryToAPI(transcript, true);
  };

  const handleChatAttachmentSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const processed = await processUploadedFile(file);
      setChatAttachment({
        name: processed.fileName,
        mimeType: processed.mimeType,
        data: processed.base64Data,
        type: processed.fileType,
        size: processed.fileSize,
      });
    } catch (err: any) {
      setErrorMsg("Error attaching file: " + err.message);
    }
  };

  const handleTextSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const prompt = userInput.trim();
    if (!prompt && !chatAttachment) return;

    setUserInput("");
    const attachmentToSubmit = chatAttachment;
    setChatAttachment(null);
    setErrorMsg(null);
    submitQueryToAPI(prompt, false, attachmentToSubmit);
  };

  // Clean whole conversation state
  const clearConversation = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setMessages([]);
    setAssistantState("idle");
    setErrorMsg(null);
  };

  // Reset helper configurations
  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  // RAG Document operations
  const addRagDocument = (doc: Omit<RagDocument, "id" | "createdAt">) => {
    const newDoc: RagDocument = {
      ...doc,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    setRagDocuments((prev) => [newDoc, ...prev]);
  };

  const deleteRagDocument = (id: string) => {
    setRagDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const toggleRagDocument = (id: string) => {
    setRagDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, enabled: !d.enabled } : d))
    );
  };

  const loadPresetDocuments = () => {
    setRagDocuments(INITIAL_RAG_DOCS);
  };

  // Memory operations
  const addMemory = (mem: Omit<MemoryItem, "id" | "createdAt" | "updatedAt">) => {
    const newMem: MemoryItem = {
      ...mem,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setMemories((prev) => [newMem, ...prev]);
  };

  const updateMemory = (id: string, updated: Partial<Omit<MemoryItem, "id" | "createdAt">>) => {
    setMemories((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updated, updatedAt: new Date() } : m))
    );
  };

  const deleteMemory = (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  const clearMemories = () => {
    setMemories([]);
  };

  const importMemories = (imported: MemoryItem[]) => {
    setMemories(imported);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col transition-colors duration-300">
      {/* Premium Header */}
      <header className="border-b border-zinc-200/60 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/10">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-display text-lg font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                AI Voice Assistant
                <span className="text-xs font-bold px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-md">
                  {settings.model}
                </span>
              </h1>
              <p className="text-[10px] text-zinc-400 font-semibold tracking-wide uppercase">
                LLMs • Web Speech API • RAG Knowledge Grounding
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl transition-all border border-zinc-200/50 dark:border-zinc-700/50"
              title="Toggle theme"
            >
              {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Responsive Grid Canvas */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-6 flex flex-col gap-6">
        {/* Error Notification Banner */}
        {errorMsg && (
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/60 rounded-xl p-4 flex items-start gap-3 relative animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">Device/API Notification</p>
              <p className="text-xs text-rose-600/90 dark:text-rose-400/80 mt-1">{errorMsg}</p>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="p-1 text-rose-400 hover:text-rose-600 dark:text-rose-500 dark:hover:text-rose-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Bento Board Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1">
          {/* LEFT: Central Voice Stage (5 Columns) */}
          <section className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 flex flex-col justify-between shadow-sm relative min-h-[520px]" id="voice-stage">
            {/* Persona & Model Status Pill */}
            <div className="absolute top-6 left-6 flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 capitalize
                ${
                  settings.persona === "friendly"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900"
                    : settings.persona === "professional"
                    ? "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900"
                    : settings.persona === "witty"
                    ? "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900"
                    : settings.persona === "zen"
                    ? "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900"
                    : "bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-900"
                }
              `}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                {settings.name} ({activePersonaDetails.label})
              </span>

              {settings.enableRag && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 rounded-md">
                  RAG Active
                </span>
              )}

              {settings.enableSearchGrounding && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60 rounded-md">
                  Search Grounding
                </span>
              )}
            </div>

            {/* Orb Stage */}
            <div className="flex-1 flex flex-col justify-center items-center py-6">
              <VoiceOrb
                state={assistantState}
                waveColor={activePersonaDetails.waveColor}
                accentColor={activePersonaDetails.accentColor}
                onMicError={(msg) => setErrorMsg(msg)}
              />
            </div>

            {/* Transcription & Controls Panel */}
            <div className="flex flex-col gap-5">
              {/* Voice Transcription Feedback */}
              <div className="min-h-12 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                {interimTranscript ? (
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 italic animate-pulse">
                    "... {interimTranscript} ..."
                  </p>
                ) : assistantState === "listening" ? (
                  <p className="text-xs text-indigo-500 font-bold tracking-wide uppercase animate-pulse flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 animate-bounce" /> Listening to your speech...
                  </p>
                ) : assistantState === "thinking" ? (
                  <p className="text-xs text-amber-500 font-bold tracking-wide uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" /> Thinking ({settings.model})...
                  </p>
                ) : (
                  <p className="text-xs text-zinc-400 font-medium">
                    Your speech transcription will appear here in real-time
                  </p>
                )}
              </div>

              {/* Main Microphone Action Buttons */}
              <div className="flex justify-center items-center gap-4">
                {assistantState === "listening" ? (
                  <button
                    onClick={stopListening}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-rose-500/20 active:scale-95 transition-all text-sm group"
                    id="stop-mic-btn"
                  >
                    <MicOff className="w-5 h-5 animate-pulse" />
                    <span>Stop Recording</span>
                  </button>
                ) : (
                  <button
                    onClick={startListening}
                    disabled={assistantState === "thinking"}
                    className={`flex items-center justify-center gap-2 px-7 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-2xl shadow-lg shadow-indigo-600/25 active:scale-95 transition-all text-sm group
                      ${assistantState === "thinking" ? "cursor-not-allowed" : "cursor-pointer"}
                    `}
                    id="start-mic-btn"
                  >
                    <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span>Talk to {settings.name}</span>
                  </button>
                )}

                {/* Sound Output Indicator Button */}
                <button
                  onClick={() => setSettings((s) => ({ ...s, muteOutput: !s.muteOutput }))}
                  className={`p-3.5 border rounded-2xl transition-all
                    ${
                      settings.muteOutput
                        ? "bg-rose-50/50 text-rose-500 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/60 dark:text-rose-400"
                        : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 border-zinc-200 dark:border-zinc-700"
                    }
                  `}
                  title={settings.muteOutput ? "Unmute assistant voice output" : "Mute assistant voice output"}
                >
                  {settings.muteOutput ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>

              {/* Text Input Fallback / Keyboard */}
              <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-1">
                {chatAttachment && (
                  <div className="flex items-center justify-between p-2 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate">
                        {chatAttachment.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-indigo-200 dark:bg-indigo-800 font-mono rounded-xs">
                        {chatAttachment.type.toUpperCase()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setChatAttachment(null)}
                      className="p-1 hover:text-rose-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleTextSubmit} className="flex gap-2" id="text-input-form">
                  <button
                    type="button"
                    onClick={() => chatAttachmentInputRef.current?.click()}
                    className="p-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-colors"
                    title="Attach Image or Document"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <input
                    ref={chatAttachmentInputRef}
                    type="file"
                    accept="image/*,.pdf,.docx,.doc,.txt,.md,.csv,.xlsx,.xls,.json"
                    onChange={handleChatAttachmentSelect}
                    className="hidden"
                  />

                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    disabled={assistantState === "thinking"}
                    placeholder="Type a message or attach an image/doc..."
                    className="flex-1 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-zinc-800 dark:text-zinc-100"
                  />
                  <button
                    type="submit"
                    disabled={(!userInput.trim() && !chatAttachment) || assistantState === "thinking"}
                    className="px-4 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:hover:bg-indigo-500 text-white font-bold rounded-xl active:scale-95 transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </section>

          {/* RIGHT: Tabbed Workspace - Logs, RAG Manager & LLM Settings (7 Columns) */}
          <section className="lg:col-span-7 flex flex-col gap-4">
            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-sm overflow-x-auto">
              <button
                onClick={() => setActiveTab("logs")}
                className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "logs"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Logs ({messages.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("tools")}
                className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "tools"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <Wrench className="w-3.5 h-3.5 text-purple-400" />
                <span>Tools ({Object.values(settings.enabledToolIds || {}).filter(Boolean).length})</span>
              </button>

              <button
                onClick={() => setActiveTab("vision")}
                className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "vision"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Vision</span>
              </button>

              <button
                onClick={() => setActiveTab("memory")}
                className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "memory"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <Brain className="w-3.5 h-3.5" />
                <span>Memory ({memories.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("rag")}
                className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "rag"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>RAG ({ragDocuments.filter((d) => d.enabled).length})</span>
              </button>

              <button
                onClick={() => setActiveTab("settings")}
                className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "settings"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <SettingsIcon className="w-3.5 h-3.5" />
                <span>Settings</span>
              </button>
            </div>

            {/* Tab Views */}
            <div className="flex-1">
              {activeTab === "logs" && (
                <div className="h-[520px]">
                  <ChatLogs
                    messages={messages}
                    persona={activePersonaDetails}
                    assistantName={settings.name}
                    onClear={clearConversation}
                    onSuggestionClick={(prompt) => {
                      stopListening();
                      submitQueryToAPI(prompt, false);
                    }}
                    onSpeakMessage={(text) => speakText(text)}
                  />
                </div>
              )}

              {activeTab === "tools" && (
                <ToolsManager
                  toolLogs={toolLogs}
                  enabledToolIds={settings.enabledToolIds || {
                    calculator: true,
                    weather: true,
                    web_search: true,
                    date_time: true,
                    unit_converter: true,
                  }}
                  onToggleTool={(toolId, enabled) => {
                    setSettings((prev) => ({
                      ...prev,
                      enabledToolIds: {
                        ...(prev.enabledToolIds || {
                          calculator: true,
                          weather: true,
                          web_search: true,
                          date_time: true,
                          unit_converter: true,
                        }),
                        [toolId]: enabled,
                      },
                    }));
                  }}
                  onClearToolLogs={() => setToolLogs([])}
                  onRunTestQuery={(query) => {
                    submitQueryToAPI(query, false);
                    setActiveTab("logs");
                  }}
                />
              )}

              {activeTab === "vision" && (
                <VisionManager
                  ragDocuments={ragDocuments}
                  onAddRagDocument={(title, content, category) => {
                    const newDoc: RagDocument = {
                      id: "rag_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
                      title,
                      content,
                      category,
                      enabled: true,
                      createdAt: new Date(),
                    };
                    setRagDocuments((prev) => [newDoc, ...prev]);
                  }}
                  onSendToChat={(query, attachment) => {
                    if (attachment) {
                      setChatAttachment(attachment);
                    }
                    setUserInput(query);
                    setActiveTab("logs");
                  }}
                />
              )}

              {activeTab === "memory" && (
                <MemoryManager
                  memories={memories}
                  userProfile={userProfile}
                  autoExtractMemory={settings.autoExtractMemory}
                  onAddMemory={addMemory}
                  onUpdateMemory={updateMemory}
                  onDeleteMemory={deleteMemory}
                  onClearMemories={clearMemories}
                  onImportMemories={importMemories}
                  onRecallQuery={() => {
                    submitQueryToAPI("What do you remember about me?", false);
                    setActiveTab("logs");
                  }}
                />
              )}

              {activeTab === "rag" && (
                <RagManager
                  documents={ragDocuments}
                  onAddDocument={addRagDocument}
                  onDeleteDocument={deleteRagDocument}
                  onToggleDocument={toggleRagDocument}
                  onLoadPresetDocuments={loadPresetDocuments}
                />
              )}

              {activeTab === "settings" && (
                <SettingsPanel
                  settings={settings}
                  onUpdateSettings={(newSets) => setSettings((s) => ({ ...s, ...newSets }))}
                  onResetSettings={resetSettings}
                />
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

