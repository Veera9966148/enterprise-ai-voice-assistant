import React, { useState, useRef, useEffect } from "react";
import {
  Eye,
  FileText,
  Upload,
  Camera,
  Search,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  Zap,
  Layout,
  Bug,
  BarChart3,
  ListTodo,
  AlignLeft,
  Trash2,
  Download,
  Share2,
  RefreshCw,
  X,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Database,
  ArrowRight,
  Sliders,
} from "lucide-react";
import { RagDocument, VisionAnalysisResult, VisionMode } from "../types";
import { processUploadedFile, formatFileSize } from "../lib/docProcessor";

interface VisionManagerProps {
  ragDocuments: RagDocument[];
  onAddRagDocument: (title: string, content: string, category: string) => void;
  onSendToChat?: (query: string, attachment?: any) => void;
}

export default function VisionManager({
  ragDocuments,
  onAddRagDocument,
  onSendToChat,
}: VisionManagerProps) {
  // Input State
  const [selectedFile, setSelectedFile] = useState<{
    fileName: string;
    fileSize: number;
    mimeType: string;
    fileType: "image" | "document";
    base64Data: string;
    dataUrl: string;
    rawText?: string;
  } | null>(null);

  const [visionMode, setVisionMode] = useState<VisionMode>("auto");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "ocr" | "actions" | "sources">("summary");
  const [copiedText, setCopiedText] = useState(false);

  // Results State & Saved History
  const [currentResult, setCurrentResult] = useState<VisionAnalysisResult | null>(null);
  const [visionHistory, setVisionHistory] = useState<VisionAnalysisResult[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [filterFileType, setFilterFileType] = useState<"all" | "image" | "document">("all");

  // Camera Modal State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load saved history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("voice_assistant_vision_history");
    if (stored) {
      try {
        setVisionHistory(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse vision history:", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    if (visionHistory.length > 0) {
      localStorage.setItem("voice_assistant_vision_history", JSON.stringify(visionHistory));
    } else {
      localStorage.removeItem("voice_assistant_vision_history");
    }
  }, [visionHistory]);

  // Start Camera Stream
  const handleOpenCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      alert("Unable to access camera: " + err.message);
      setIsCameraOpen(false);
    }
  };

  // Close Camera Stream
  const handleCloseCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  // Capture Snapshot from Camera
  const handleCaptureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      const base64Data = dataUrl.split(",")[1] || "";

      setSelectedFile({
        fileName: `Camera_Capture_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "_")}.png`,
        fileSize: Math.round(base64Data.length * 0.75),
        mimeType: "image/png",
        fileType: "image",
        base64Data,
        dataUrl,
      });
      handleCloseCamera();
    }
  };

  // Handle File Upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const processed = await processUploadedFile(file);
      setSelectedFile(processed);
    } catch (err: any) {
      alert("Error reading file: " + err.message);
    }
  };

  // Drag and Drop Handlers
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    try {
      const processed = await processUploadedFile(file);
      setSelectedFile(processed);
    } catch (err: any) {
      alert("Error reading file: " + err.message);
    }
  };

  // Execute Vision Analysis API
  const handleRunAnalysis = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    setCurrentResult(null);

    try {
      const response = await fetch("/api/vision/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileData: selectedFile.base64Data,
          rawText: selectedFile.rawText,
          mimeType: selectedFile.mimeType,
          fileName: selectedFile.fileName,
          fileType: selectedFile.fileType,
          mode: visionMode,
          customPrompt,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Vision analysis failed");
      }

      const newRecord: VisionAnalysisResult = {
        id: "vis_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
        title: selectedFile.fileName,
        fileType: selectedFile.fileType,
        fileFormat: selectedFile.fileName.split(".").pop() || "file",
        fileName: selectedFile.fileName,
        fileSize: selectedFile.fileSize,
        previewUrl: selectedFile.dataUrl,
        mode: visionMode,
        summary: data.summary,
        ocrText: data.ocrText,
        sceneDescription: data.sceneDescription,
        uiAnalysis: data.uiAnalysis,
        errorFix: data.errorFix,
        keyPoints: data.keyPoints,
        actionItems: data.actionItems,
        sources: data.sources,
        timestamp: new Date(),
        indexedToRag: false,
      };

      setCurrentResult(newRecord);
      setVisionHistory((prev) => [newRecord, ...prev]);
    } catch (err: any) {
      alert("Vision Analysis Error: " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // One-Click Index to RAG Knowledge Base
  const handleIndexToRag = (record: VisionAnalysisResult) => {
    const ragTitle = `[Vision/Doc] ${record.fileName}`;
    const ragContent = `Document/Image: ${record.fileName} (${record.fileType.toUpperCase()})
Summary: ${record.summary}
${record.ocrText ? `\nExtracted Text (OCR):\n${record.ocrText}` : ""}
${record.keyPoints?.length ? `\nKey Points:\n- ${record.keyPoints.join("\n- ")}` : ""}
${record.actionItems?.length ? `\nAction Items:\n- ${record.actionItems.join("\n- ")}` : ""}`;

    onAddRagDocument(ragTitle, ragContent, "Vision AI & Documents");

    // Mark as indexed
    const updated = { ...record, indexedToRag: true };
    setCurrentResult(updated);
    setVisionHistory((prev) => prev.map((item) => (item.id === record.id ? updated : item)));
  };

  // Copy OCR Text
  const handleCopyOcr = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Statistics
  const totalAnalyzed = visionHistory.length;
  const imageCount = visionHistory.filter((h) => h.fileType === "image").length;
  const docCount = visionHistory.filter((h) => h.fileType === "document").length;
  const ragIndexedCount = visionHistory.filter((h) => h.indexedToRag).length;

  const filteredHistory = visionHistory.filter((item) => {
    const matchesSearch =
      searchFilter === "" ||
      item.fileName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesType = filterFileType === "all" || item.fileType === filterFileType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* 1. Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs font-semibold mb-1">
            <Eye className="w-4 h-4 text-indigo-500" />
            Analyzed Files
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{totalAnalyzed}</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs font-semibold mb-1">
            <ImageIcon className="w-4 h-4 text-amber-500" />
            Images & UI
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{imageCount}</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs font-semibold mb-1">
            <FileText className="w-4 h-4 text-emerald-500" />
            Documents (PDF/DOCX)
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{docCount}</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs font-semibold mb-1">
            <Database className="w-4 h-4 text-purple-500" />
            Indexed to RAG
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{ragIndexedCount}</div>
        </div>
      </div>

      {/* 2. Upload / Capture Section */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Vision AI & Document Intelligence Studio
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Upload images, screenshots, PDFs, DOCX, CSV, Excel, or capture directly with camera
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenCamera}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              Camera Capture
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload File
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.docx,.doc,.txt,.md,.csv,.xlsx,.xls,.json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* Dropzone Area */}
        {!selectedFile ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-8 text-center cursor-pointer transition-all bg-zinc-50/50 dark:bg-zinc-900/50 space-y-3"
          >
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-200 dark:border-indigo-800">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Drag and drop your file here, or <span className="text-indigo-600 dark:text-indigo-400">browse</span>
              </p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                Supports Images (PNG, JPG, WEBP), PDF, Word (DOCX), Text (TXT, MD), Spreadsheets (CSV, XLSX)
              </p>
            </div>
          </div>
        ) : (
          /* Selected File Preview Card & Configuration */
          <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {selectedFile.fileType === "image" ? (
                  <img
                    src={selectedFile.dataUrl}
                    alt={selectedFile.fileName}
                    className="w-12 h-12 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shadow-xs"
                  />
                ) : (
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <FileText className="w-6 h-6" />
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    {selectedFile.fileName}
                    <span className="text-[10px] px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-md font-mono uppercase">
                      {selectedFile.mimeType.split("/")[1] || "doc"}
                    </span>
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Size: {formatFileSize(selectedFile.fileSize)} • Type: {selectedFile.fileType.toUpperCase()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedFile(null)}
                className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg transition-colors"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Analysis Mode Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Select Vision Intelligence Analysis Mode:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "auto", label: "Auto Analysis", icon: Sparkles, desc: "Comprehensive review" },
                  { id: "ocr", label: "OCR Text Extract", icon: FileText, desc: "Extract readable text" },
                  { id: "summary", label: "Summarize Doc", icon: AlignLeft, desc: "Executive summary" },
                  { id: "ui_ux", label: "UI/UX Analysis", icon: Layout, desc: "Design & UX review" },
                  { id: "error_debug", label: "Debug Error", icon: Bug, desc: "Code/Error fix" },
                  { id: "chart_reader", label: "Chart / Data", icon: BarChart3, desc: "Graphs & tables" },
                  { id: "action_items", label: "Action Items", icon: ListTodo, desc: "Extract todos" },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = visionMode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setVisionMode(m.id as VisionMode)}
                      className={`p-2.5 text-left rounded-xl border transition-all ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-800 hover:border-indigo-300"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-indigo-500"}`} />
                        <span className="text-xs font-bold">{m.label}</span>
                      </div>
                      <p className={`text-[10px] mt-0.5 line-clamp-1 ${isSelected ? "text-indigo-100" : "text-zinc-400"}`}>
                        {m.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Prompt / Question Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Custom Focus Question / Prompt (Optional):
              </label>
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g. 'What are the main financial risks?' or 'Is the color contrast accessible?'"
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* CTA Execution Button */}
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing with Gemini Vision AI...
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Run Vision AI Analysis
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* 3. Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-400" />
                Live Camera Capture
              </h3>
              <button onClick={handleCloseCamera} className="p-1 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={handleCloseCamera}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleCaptureSnapshot}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md"
              >
                <Camera className="w-4 h-4" />
                Take Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Active Analysis Result View */}
      {currentResult && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-200/80 dark:border-zinc-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Vision Result
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold rounded-md">
                  Mode: {currentResult.mode.toUpperCase()}
                </span>
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                {currentResult.fileName}
              </h3>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleIndexToRag(currentResult)}
                disabled={currentResult.indexedToRag}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  currentResult.indexedToRag
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 cursor-default"
                    : "bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                {currentResult.indexedToRag ? "Indexed in RAG Knowledge" : "Add to RAG Knowledge"}
              </button>

              {onSendToChat && (
                <button
                  onClick={() =>
                    onSendToChat(
                      `Based on the document/image "${currentResult.fileName}", answer my question...`
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Ask in Chat
                </button>
              )}
            </div>
          </div>

          {/* Sub-Tabs */}
          <div className="flex items-center gap-2 border-b border-zinc-200/80 dark:border-zinc-800 pb-2">
            {[
              { id: "summary", label: "Full Analysis" },
              { id: "ocr", label: `OCR Text (${currentResult.ocrText ? "Available" : "None"})` },
              { id: "actions", label: `Action Items (${currentResult.actionItems?.length || 0})` },
              { id: "sources", label: "Sources & Citation" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="pt-2">
            {activeTab === "summary" && (
              <div className="space-y-4">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    Executive Summary
                  </h4>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {currentResult.summary}
                  </p>
                </div>

                {currentResult.uiAnalysis && (
                  <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Layout className="w-3.5 h-3.5 text-indigo-500" />
                      UI/UX Design Insights
                    </h4>
                    <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap font-mono">
                      {currentResult.uiAnalysis}
                    </p>
                  </div>
                )}

                {currentResult.errorFix && (
                  <div className="p-4 bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/80 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Bug className="w-3.5 h-3.5 text-rose-500" />
                      Error Debugging & Fix
                    </h4>
                    <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap font-mono">
                      {currentResult.errorFix}
                    </p>
                  </div>
                )}

                {currentResult.keyPoints && currentResult.keyPoints.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                      Key Highlights & Takeaways
                    </h4>
                    <ul className="space-y-1.5">
                      {currentResult.keyPoints.map((pt, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/30 p-2.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === "ocr" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Extracted OCR Raw Text Content
                  </span>
                  <button
                    onClick={() => handleCopyOcr(currentResult.ocrText)}
                    className="flex items-center gap-1 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold transition-colors"
                  >
                    {copiedText ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Text
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-zinc-950 text-zinc-200 p-4 rounded-xl border border-zinc-800 font-mono text-xs max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                  {currentResult.ocrText || "No text extracted from this file."}
                </div>
              </div>
            )}

            {activeTab === "actions" && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Extracted Action Items & Next Steps
                </h4>
                {currentResult.actionItems && currentResult.actionItems.length > 0 ? (
                  <div className="space-y-2">
                    {currentResult.actionItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 rounded-xl"
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded-md text-indigo-600 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 py-4">No explicit action items found in this document.</p>
                )}
              </div>
            )}

            {activeTab === "sources" && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Source Document Citations
                </h4>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 rounded-xl space-y-1">
                  <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                    File: {currentResult.fileName}
                  </p>
                  <p className="text-[11px] text-zinc-500">Format: {currentResult.fileFormat}</p>
                  <p className="text-[11px] text-zinc-500">Size: {formatFileSize(currentResult.fileSize)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Vision History Library */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Eye className="w-4 h-4 text-indigo-500" />
            Processed Vision Library ({filteredHistory.length})
          </h3>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search history..."
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
              />
            </div>

            <select
              value={filterFileType}
              onChange={(e) => setFilterFileType(e.target.value as any)}
              className="px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-700 dark:text-zinc-300 focus:outline-hidden"
            >
              <option value="all">All Types</option>
              <option value="image">Images Only</option>
              <option value="document">Documents Only</option>
            </select>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-8 text-zinc-400 text-xs bg-zinc-50/50 dark:bg-zinc-800/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
            No processed vision files found. Upload a file or take a camera capture to analyze!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                onClick={() => setCurrentResult(item)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  currentResult?.id === item.id
                    ? "bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-xs"
                    : "bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800 hover:border-indigo-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {item.fileType === "image" && item.previewUrl ? (
                      <img
                        src={item.previewUrl}
                        alt={item.fileName}
                        className="w-10 h-10 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {item.fileName}
                      </h4>
                      <p className="text-[10px] text-zinc-400 font-mono">
                        {item.fileType.toUpperCase()} • {item.mode.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setVisionHistory((prev) => prev.filter((h) => h.id !== item.id));
                      if (currentResult?.id === item.id) setCurrentResult(null);
                    }}
                    className="p-1 text-zinc-400 hover:text-rose-500 rounded-md"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-2 line-clamp-2 leading-snug">
                  {item.summary}
                </p>

                {item.indexedToRag && (
                  <div className="mt-2 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Indexed in RAG Knowledge
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
