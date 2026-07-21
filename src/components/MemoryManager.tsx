import React, { useState, ChangeEvent, FormEvent } from "react";
import { MemoryItem, MemoryCategory, UserProfileData } from "../types";
import {
  Brain,
  Plus,
  Trash2,
  Edit3,
  Search,
  Download,
  Upload,
  User,
  Star,
  Sparkles,
  RefreshCw,
  Check,
  X,
  Target,
  Code,
  Briefcase,
  GraduationCap,
  Heart,
  MessageSquare,
  Clock,
  ShieldCheck,
  Tag,
  Cpu,
} from "lucide-react";

interface MemoryManagerProps {
  memories: MemoryItem[];
  userProfile: UserProfileData;
  autoExtractMemory?: boolean;
  onAddMemory: (mem: Omit<MemoryItem, "id" | "createdAt" | "updatedAt">) => void;
  onUpdateMemory: (id: string, updated: Partial<MemoryItem>) => void;
  onDeleteMemory: (id: string) => void;
  onClearMemories: () => void;
  onImportMemories: (imported: MemoryItem[]) => void;
  onRecallQuery: () => void;
}

const CATEGORY_COLORS: Record<MemoryCategory, { bg: string; text: string; border: string }> = {
  user_profile: {
    bg: "bg-indigo-50 dark:bg-indigo-950/60",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200 dark:border-indigo-800",
  },
  preference: {
    bg: "bg-purple-50 dark:bg-purple-950/60",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
  },
  knowledge: {
    bg: "bg-emerald-50 dark:bg-emerald-950/60",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  conversation: {
    bg: "bg-amber-50 dark:bg-amber-950/60",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
  },
  session: {
    bg: "bg-sky-50 dark:bg-sky-950/60",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-200 dark:border-sky-800",
  },
};

export default function MemoryManager({
  memories,
  userProfile,
  onAddMemory,
  onUpdateMemory,
  onDeleteMemory,
  onClearMemories,
  onImportMemories,
  onRecallQuery,
}: MemoryManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states for Add / Edit
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<MemoryCategory>("user_profile");
  const [content, setContent] = useState("");
  const [importanceScore, setImportanceScore] = useState<number>(7);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState<MemoryCategory>("user_profile");
  const [editContent, setEditContent] = useState("");
  const [editImportance, setEditImportance] = useState<number>(7);

  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onAddMemory({
      title: title.trim(),
      category,
      content: content.trim(),
      importanceScore,
    });
    setTitle("");
    setContent("");
    setImportanceScore(7);
    setIsAdding(false);
  };

  const startEdit = (mem: MemoryItem) => {
    setEditingId(mem.id);
    setEditTitle(mem.title);
    setEditCategory(mem.category);
    setEditContent(mem.content);
    setEditImportance(mem.importanceScore || 7);
  };

  const handleEditSubmit = (id: string, e: FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !editContent.trim()) return;
    onUpdateMemory(id, {
      title: editTitle.trim(),
      category: editCategory,
      content: editContent.trim(),
      importanceScore: editImportance,
      updatedAt: new Date(),
    });
    setEditingId(null);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(memories, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ai_voice_assistant_memories_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportMemories(parsed);
        } else {
          alert("Invalid JSON structure. Expected an array of memory objects.");
        }
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const filteredMemories = memories.filter((mem) => {
    const matchesCategory = selectedCategory === "all" || mem.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      mem.title.toLowerCase().includes(q) ||
      mem.content.toLowerCase().includes(q) ||
      mem.category.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 shadow-sm h-[520px] flex flex-col justify-between overflow-hidden">
      {/* Header & Controls */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                AI Memory System
                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-full">
                  {memories.length} Memories Saved
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Persistent long-term & short-term profile memory automatically used by Gemini
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={onRecallQuery}
              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border border-indigo-200/60 dark:border-indigo-800/60"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Recall All
            </button>

            <button
              onClick={() => setIsAdding(!isAdding)}
              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Memory
            </button>

            <button
              onClick={handleExportJSON}
              title="Export Memories to JSON"
              className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs transition-all"
            >
              <Download className="w-4 h-4" />
            </button>

            <label
              title="Import Memories from JSON"
              className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>

            <button
              onClick={() => {
                if (confirm("Are you sure you want to clear all stored memories?")) {
                  onClearMemories();
                }
              }}
              title="Clear All Memories"
              className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-lg text-xs transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* User Profile Snapshot Bar */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800 rounded-xl flex items-center gap-3 overflow-x-auto text-xs">
          <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 font-bold whitespace-nowrap">
            <User className="w-3.5 h-3.5 text-indigo-500" />
            <span>Profile:</span>
          </div>

          <div className="flex items-center gap-2 flex-nowrap text-[11px]">
            {userProfile.name && (
              <span className="px-2 py-0.5 bg-white dark:bg-zinc-800 border rounded-md font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                Name: <strong className="text-indigo-600 dark:text-indigo-400">{userProfile.name}</strong>
              </span>
            )}
            {userProfile.profession && (
              <span className="px-2 py-0.5 bg-white dark:bg-zinc-800 border rounded-md font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-purple-500" /> {userProfile.profession}
              </span>
            )}
            {userProfile.favoriteLanguage && (
              <span className="px-2 py-0.5 bg-white dark:bg-zinc-800 border rounded-md font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                <Code className="w-3 h-3 text-emerald-500" /> {userProfile.favoriteLanguage}
              </span>
            )}
            {userProfile.goals && userProfile.goals.length > 0 && (
              <span className="px-2 py-0.5 bg-white dark:bg-zinc-800 border rounded-md font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                <Target className="w-3 h-3 text-amber-500" /> {userProfile.goals[0]}
              </span>
            )}
            {!userProfile.name && !userProfile.profession && !userProfile.favoriteLanguage && (
              <span className="text-zinc-400 italic">
                Speak to the assistant (e.g., "My name is Alex", "I work as a Developer") to automatically populate your profile.
              </span>
            )}
          </div>
        </div>

        {/* Add Memory Modal / Form */}
        {isAdding && (
          <form onSubmit={handleAddSubmit} className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-xl space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-indigo-600" /> Create New Memory Item
              </span>
              <button type="button" onClick={() => setIsAdding(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Title (e.g., Favorite Language)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100"
              />

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MemoryCategory)}
                className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 capitalize"
              >
                <option value="user_profile">User Profile</option>
                <option value="preference">Preference</option>
                <option value="knowledge">Knowledge</option>
                <option value="conversation">Conversation</option>
                <option value="session">Session Context</option>
              </select>

              <div className="flex items-center gap-2 px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs">
                <span className="text-zinc-500 whitespace-nowrap">Score (1-10):</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={importanceScore}
                  onChange={(e) => setImportanceScore(Number(e.target.value))}
                  className="w-full bg-transparent text-xs font-bold text-indigo-600 dark:text-indigo-400"
                />
              </div>
            </div>

            <textarea
              placeholder="Memory content or statement..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={2}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 resize-none"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1 text-xs font-bold text-zinc-500 hover:text-zinc-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Save Memory
              </button>
            </div>
          </form>
        )}

        {/* Search & Category Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
            {["all", "user_profile", "preference", "knowledge", "conversation", "session"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all capitalize whitespace-nowrap ${
                  selectedCategory === cat
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                }`}
              >
                {cat.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Memory Cards Scroll Area */}
      <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2.5 custom-scrollbar">
        {filteredMemories.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
            <Brain className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-xs font-bold text-zinc-600 dark:text-zinc-300">No Memories Found</p>
            <p className="text-[11px] max-w-xs mt-1">
              Start chatting with the assistant or click "Add Memory" to manually store user facts and preferences.
            </p>
          </div>
        ) : (
          filteredMemories.map((mem) => {
            const catStyle = CATEGORY_COLORS[mem.category] || CATEGORY_COLORS.user_profile;
            const isEditing = editingId === mem.id;

            if (isEditing) {
              return (
                <form
                  key={mem.id}
                  onSubmit={(e) => handleEditSubmit(mem.id, e)}
                  className="p-3 bg-zinc-50 dark:bg-zinc-800/80 border border-indigo-300 dark:border-indigo-700 rounded-xl space-y-2"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="px-2 py-1 bg-white dark:bg-zinc-900 border rounded text-xs"
                      required
                    />
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as MemoryCategory)}
                      className="px-2 py-1 bg-white dark:bg-zinc-900 border rounded text-xs capitalize"
                    >
                      <option value="user_profile">User Profile</option>
                      <option value="preference">Preference</option>
                      <option value="knowledge">Knowledge</option>
                      <option value="conversation">Conversation</option>
                      <option value="session">Session Context</option>
                    </select>
                  </div>

                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-2 py-1 bg-white dark:bg-zinc-900 border rounded text-xs resize-none"
                    rows={2}
                    required
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-zinc-500">Importance:</span>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={editImportance}
                        onChange={(e) => setEditImportance(Number(e.target.value))}
                        className="w-12 px-1 border rounded text-xs font-bold text-indigo-600"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-2 py-0.5 text-xs font-bold text-zinc-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-2.5 py-0.5 bg-indigo-600 text-white rounded text-xs font-bold"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </form>
              );
            }

            return (
              <div
                key={mem.id}
                className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-800 rounded-xl hover:border-indigo-300/80 transition-all group relative flex flex-col justify-between gap-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border capitalize ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                    >
                      {mem.category.replace("_", " ")}
                    </span>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{mem.title}</h4>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-md flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {mem.importanceScore || 5}/10
                    </span>

                    <button
                      onClick={() => startEdit(mem)}
                      className="p-1 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-indigo-600 transition-all"
                      title="Edit Memory"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onDeleteMemory(mem.id)}
                      className="p-1 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-600 transition-all"
                      title="Delete Memory"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">
                  {mem.content}
                </p>

                <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-200/40 dark:border-zinc-800">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(mem.createdAt).toLocaleDateString()}
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Memory Active
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
