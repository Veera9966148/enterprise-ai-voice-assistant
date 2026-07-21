import { useState, ChangeEvent, FormEvent } from "react";
import { RagDocument } from "../types";
import { Database, Plus, Trash2, FileText, Upload, Search, CheckCircle, ToggleLeft, ToggleRight, Sparkles, BookOpen } from "lucide-react";

interface RagManagerProps {
  documents: RagDocument[];
  onAddDocument: (doc: Omit<RagDocument, "id" | "createdAt">) => void;
  onDeleteDocument: (id: string) => void;
  onToggleDocument: (id: string) => void;
  onLoadPresetDocuments: () => void;
}

export default function RagManager({
  documents,
  onAddDocument,
  onDeleteDocument,
  onToggleDocument,
  onLoadPresetDocuments,
}: RagManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General Knowledge");
  const [content, setContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onAddDocument({
      title: title.trim(),
      category: category.trim() || "General Knowledge",
      content: content.trim(),
      enabled: true,
    });
    setTitle("");
    setContent("");
    setShowAddForm(false);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
        setContent(text);
        setShowAddForm(true);
      }
    };
    reader.readAsText(file);
  };

  const filteredDocs = documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = documents.filter((d) => d.enabled).length;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/50 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              RAG Knowledge Base
              <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full">
                {activeCount} Active
              </span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Inject custom documents & notes into Gemini's context for grounded voice answers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {documents.length === 0 && (
            <button
              onClick={onLoadPresetDocuments}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 rounded-xl hover:bg-emerald-100/60 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Load Sample Data
            </button>
          )}

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Document
          </button>
        </div>
      </div>

      {/* Add Document Form or File Upload */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              New Knowledge Document
            </span>
            <label className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline">
              <Upload className="w-3.5 h-3.5" />
              Upload .txt / .md
              <input type="file" accept=".txt,.md,.json,.csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Document Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Return Policy FAQ or Project Specs"
                className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Category Tag</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Company, Personal, Technical"
                className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Knowledge Content / Text</label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste factual information, notes, or documentation text here..."
              className="w-full mt-1 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm"
            >
              Save to Knowledge Base
            </button>
          </div>
        </form>
      )}

      {/* Search Filter */}
      {documents.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by title, tag, or content..."
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      )}

      {/* Document List */}
      <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
        {filteredDocs.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
            <FileText className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">No Knowledge Documents Found</p>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              Add custom documents or click "Load Sample Data" to test RAG voice queries!
            </p>
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className={`p-3.5 border rounded-xl flex items-start justify-between gap-3 transition-all ${
                doc.enabled
                  ? "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800"
                  : "bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-100 dark:border-zinc-800/50 opacity-60"
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <button
                  onClick={() => onToggleDocument(doc.id)}
                  title={doc.enabled ? "Disable document" : "Enable document"}
                  className="mt-0.5 text-zinc-400 hover:text-indigo-500 transition-colors"
                >
                  {doc.enabled ? (
                    <ToggleRight className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-zinc-400 dark:text-zinc-600" />
                  )}
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate">{doc.title}</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md">
                      {doc.category}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {doc.content.length} chars
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1 font-mono bg-zinc-50 dark:bg-zinc-800/50 p-1.5 rounded-lg border border-zinc-100 dark:border-zinc-800/80">
                    "{doc.content}"
                  </p>
                </div>
              </div>

              <button
                onClick={() => onDeleteDocument(doc.id)}
                className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Delete document"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
