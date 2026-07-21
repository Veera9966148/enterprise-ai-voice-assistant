import { useEffect, useState } from "react";
import { AssistantSettings, LLMModel, Persona } from "../types";
import { PERSONAS } from "../data";
import { Volume2, Settings, User, Sliders, ChevronDown, Sparkles, Smile, Briefcase, Heart, Cpu, RotateCcw, Brain, Globe, Database, Wrench } from "lucide-react";

interface SettingsPanelProps {
  settings: AssistantSettings;
  onUpdateSettings: (newSettings: Partial<AssistantSettings>) => void;
  onResetSettings: () => void;
}

export default function SettingsPanel({
  settings,
  onUpdateSettings,
  onResetSettings,
}: SettingsPanelProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showVoiceSelect, setShowVoiceSelect] = useState(false);

  // Load and subscribe to speechSynthesis voices
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      // Filter primarily English voices first, fallback to all voices
      const englishOrAll = allVoices.filter((v) => v.lang.startsWith("en") || v.lang.startsWith("EN"));
      setVoices(englishOrAll.length > 0 ? englishOrAll : allVoices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const selectedVoice = voices.find((v) => v.voiceURI === settings.voiceURI) || voices[0];

  // Map persona to its corresponding icon
  const getPersonaIcon = (id: Persona) => {
    switch (id) {
      case "friendly":
        return <Smile className="w-4 h-4" />;
      case "professional":
        return <Briefcase className="w-4 h-4" />;
      case "witty":
        return <Sparkles className="w-4 h-4" />;
      case "zen":
        return <Heart className="w-4 h-4" />;
      case "tech":
        return <Cpu className="w-4 h-4" />;
    }
  };

  const testVoice = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`Hello there! My name is ${settings.name || "Assistant"}. I am ready to help you.`);
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = settings.voiceRate;
    utterance.pitch = settings.voicePitch;
    window.speechSynthesis.speak(utterance);
  };

  const LLM_MODELS: { id: LLMModel; name: string; tag: string; desc: string }[] = [
    { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash", tag: "Recommended", desc: "Fast, highly intelligent model for real-time voice & text chat" },
    { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro", tag: "High Reasoning", desc: "Advanced reasoning for complex logical & technical queries" },
    { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite", tag: "Ultra Low-Latency", desc: "Lightweight and optimized for fast dialogue response" },
    { id: "gemini-flash-latest", name: "Gemini Flash Latest", tag: "Auto-Updated", desc: "Always points to the newest stable Flash model release" },
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col gap-6" id="settings-panel">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-500" />
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Configure Assistant</h2>
        </div>
        <button
          onClick={onResetSettings}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
          title="Reset to defaults"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* LLM Engine & API Configuration */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-indigo-500" /> LLM Model & API Engine
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Select Model</span>
          <div className="grid grid-cols-1 gap-1.5">
            {LLM_MODELS.map((m) => {
              const isSelected = settings.model === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onUpdateSettings({ model: m.id })}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30"
                      : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-100/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">{m.name}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                      isSelected ? "bg-indigo-600 text-white" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    }`}>
                      {m.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{m.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Temperature & Features */}
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Creativity (Temperature)</span>
              <span className="text-xs font-mono font-bold text-indigo-500">{settings.temperature.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => onUpdateSettings({ temperature: parseFloat(e.target.value) })}
              className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          <label className="flex items-center justify-between cursor-pointer select-none p-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 rounded-xl">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-500" />
              <div>
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Google Search Grounding</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Fetch live search facts & weather</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.enableSearchGrounding}
              onChange={(e) => onUpdateSettings({ enableSearchGrounding: e.target.checked })}
              className="w-8 h-4 bg-zinc-300 dark:bg-zinc-600 rounded-full appearance-none checked:bg-indigo-500 relative transition-colors duration-200 cursor-pointer before:content-[''] before:absolute before:h-3 before:w-3 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:left-[18px] before:transition-all"
            />
          </label>

          {/* Tool Calling System */}
          <label className="flex items-center justify-between cursor-pointer select-none p-2 bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/80 rounded-xl">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-purple-500" />
              <div>
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">AI Tool Calling System</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Auto-execute Calculator, Weather, Date, Units & Search</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.enableTools ?? true}
              onChange={(e) => onUpdateSettings({ enableTools: e.target.checked })}
              className="w-8 h-4 bg-zinc-300 dark:bg-zinc-600 rounded-full appearance-none checked:bg-indigo-500 relative transition-colors duration-200 cursor-pointer before:content-[''] before:absolute before:h-3 before:w-3 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:left-[18px] before:transition-all"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer select-none p-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 rounded-xl">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-500" />
              <div>
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">RAG Document Grounding</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Query custom knowledge base documents</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.enableRag}
              onChange={(e) => onUpdateSettings({ enableRag: e.target.checked })}
              className="w-8 h-4 bg-zinc-300 dark:bg-zinc-600 rounded-full appearance-none checked:bg-indigo-500 relative transition-colors duration-200 cursor-pointer before:content-[''] before:absolute before:h-3 before:w-3 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:left-[18px] before:transition-all"
            />
          </label>

          {/* Memory Settings */}
          <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/80 space-y-2">
            <label className="flex items-center justify-between cursor-pointer select-none p-2 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 rounded-xl">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-500" />
                <div>
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Enable AI Memory</p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Persist user profile & conversation facts</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.enableMemory}
                onChange={(e) => onUpdateSettings({ enableMemory: e.target.checked })}
                className="w-8 h-4 bg-zinc-300 dark:bg-zinc-600 rounded-full appearance-none checked:bg-indigo-500 relative transition-colors duration-200 cursor-pointer before:content-[''] before:absolute before:h-3 before:w-3 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:left-[18px] before:transition-all"
              />
            </label>

            {settings.enableMemory && (
              <label className="flex items-center justify-between cursor-pointer select-none p-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 rounded-xl">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <div>
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Smart Memory Auto-Extraction</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Automatically save facts from dialogue</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoExtractMemory}
                  onChange={(e) => onUpdateSettings({ autoExtractMemory: e.target.checked })}
                  className="w-8 h-4 bg-zinc-300 dark:bg-zinc-600 rounded-full appearance-none checked:bg-indigo-500 relative transition-colors duration-200 cursor-pointer before:content-[''] before:absolute before:h-3 before:w-3 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:left-[18px] before:transition-all"
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Assistant Identity */}
      <div className="flex flex-col gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-5">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" /> Assistant Profile
        </label>
        
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Assistant Name</span>
          <input
            type="text"
            value={settings.name}
            onChange={(e) => onUpdateSettings({ name: e.target.value })}
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-zinc-800 dark:text-zinc-100"
            placeholder="e.g. Jarvis"
          />
        </div>
      </div>

      {/* Persona Selection */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Personality Persona
        </span>

        <div className="grid grid-cols-1 gap-2">
          {PERSONAS.map((p) => {
            const isSelected = settings.persona === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onUpdateSettings({ persona: p.id })}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-200 ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20"
                    : "border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50"
                }`}
              >
                <div className={`p-1.5 rounded-lg border ${
                  isSelected ? "bg-indigo-100 border-indigo-200 text-indigo-600 dark:bg-indigo-900/50 dark:border-indigo-800 dark:text-indigo-400" : "bg-zinc-100 border-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400"
                }`}>
                  {getPersonaIcon(p.id)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                    {p.label}
                    {isSelected && <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold px-1.5 py-0.5 rounded-full">Active</span>}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{p.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Voice Configuration */}
      <div className="flex flex-col gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-5">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5" /> Speech & Sound Settings
        </label>

        {/* Browser Synthesis Voice Select */}
        <div className="flex flex-col gap-1.5 relative">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Synthesizer Voice</span>
          <button
            type="button"
            onClick={() => setShowVoiceSelect(!showVoiceSelect)}
            className="w-full flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-zinc-800 dark:text-zinc-100 text-left"
          >
            <span className="truncate">
              {selectedVoice ? `${selectedVoice.name} (${selectedVoice.lang})` : "System Default Voice"}
            </span>
            <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${showVoiceSelect ? "rotate-180" : ""}`} />
          </button>

          {showVoiceSelect && (
            <div className="absolute top-[100%] left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg p-1.5 flex flex-col gap-0.5">
              {voices.length === 0 ? (
                <div className="px-3 py-2 text-xs text-zinc-400">Loading system voices...</div>
              ) : (
                voices.map((v) => (
                  <button
                    key={v.voiceURI}
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ voiceURI: v.voiceURI });
                      setShowVoiceSelect(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors ${
                      settings.voiceURI === v.voiceURI
                        ? "bg-indigo-500 text-white font-medium"
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/60"
                    }`}
                  >
                    {v.name} <span className="opacity-75 font-normal">({v.lang})</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Speed (Rate) and Pitch Sliders */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <Sliders className="w-3 h-3" /> Voice Speed (Rate)
              </span>
              <span className="text-xs font-mono font-bold text-indigo-500">{settings.voiceRate.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={settings.voiceRate}
              onChange={(e) => onUpdateSettings({ voiceRate: parseFloat(e.target.value) })}
              className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <Sliders className="w-3 h-3" /> Voice Pitch
              </span>
              <span className="text-xs font-mono font-bold text-indigo-500">{settings.voicePitch.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={settings.voicePitch}
              onChange={(e) => onUpdateSettings({ voicePitch: parseFloat(e.target.value) })}
              className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>

        {/* Test voice play */}
        <button
          type="button"
          onClick={testVoice}
          className="w-full py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
        >
          <Volume2 className="w-3.5 h-3.5" />
          Test Speech Output
        </button>

        {/* Interactive Toggles */}
        <div className="flex flex-col gap-3.5 border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-1">
          <label className="flex items-center justify-between cursor-pointer select-none">
            <div>
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Mute Assistant Speech</p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Silence voice output entirely</p>
            </div>
            <input
              type="checkbox"
              checked={settings.muteOutput}
              onChange={(e) => onUpdateSettings({ muteOutput: e.target.checked })}
              className="w-8 h-4 bg-zinc-300 dark:bg-zinc-600 rounded-full appearance-none checked:bg-indigo-500 relative transition-colors duration-200 cursor-pointer before:content-[''] before:absolute before:h-3 before:w-3 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:left-[18px] before:transition-all"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer select-none">
            <div>
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Hands-Free Conversation</p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Automatically re-activate mic after speaking</p>
            </div>
            <input
              type="checkbox"
              checked={settings.continuousListening}
              onChange={(e) => onUpdateSettings({ continuousListening: e.target.checked })}
              className="w-8 h-4 bg-zinc-300 dark:bg-zinc-600 rounded-full appearance-none checked:bg-indigo-500 relative transition-colors duration-200 cursor-pointer before:content-[''] before:absolute before:h-3 before:w-3 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:left-[18px] before:transition-all"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

