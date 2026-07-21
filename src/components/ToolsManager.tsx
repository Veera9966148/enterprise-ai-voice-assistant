import React, { useState } from "react";
import {
  Wrench,
  Calculator as CalcIcon,
  CloudSun,
  Globe,
  Clock,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  Play,
  Trash2,
  Zap,
  Search,
  Filter,
  Check,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ToolCatalogItem, ToolExecutionRecord, ToolId, ToolUsedInfo } from "../types";
import {
  runCalculator,
  runWeather,
  runDateTime,
  runUnitConverter,
  runWebSearch,
} from "../lib/toolEngine";

interface ToolsManagerProps {
  toolLogs: ToolExecutionRecord[];
  enabledToolIds: Record<ToolId, boolean>;
  onToggleTool: (toolId: ToolId, enabled: boolean) => void;
  onClearToolLogs: () => void;
  onRunTestQuery?: (query: string) => void;
}

const TOOL_CATALOG: ToolCatalogItem[] = [
  {
    id: "calculator",
    name: "Calculator",
    description: "Evaluates arithmetic, percentages, square roots, powers, BMI, and age calculations instantly.",
    category: "Math & Analytics",
    enabled: true,
    examples: ["567 * 89", "15% of 250", "sqrt(144)", "2^10", "BMI 70kg 175cm", "Age born in 1995"],
    usageCount: 0,
    avgLatencyMs: 3,
  },
  {
    id: "weather",
    name: "Weather Tool",
    description: "Fetches live temperature, humidity, wind speed, and daily forecasts via Open-Meteo API.",
    category: "Environment & Geo",
    enabled: true,
    examples: ["Weather in Hyderabad", "Temperature in Tokyo", "Is it raining in London?", "Climate in New York"],
    usageCount: 0,
    avgLatencyMs: 140,
  },
  {
    id: "web_search",
    name: "Web Search Tool",
    description: "Searches the web for recent information and grounding summaries with source links.",
    category: "Information",
    enabled: true,
    examples: ["Latest AI news", "Who won the recent match?", "Search for quantum computing breakthroughs"],
    usageCount: 0,
    avgLatencyMs: 220,
  },
  {
    id: "date_time",
    name: "Date & Time Tool",
    description: "Provides current date, clock time, day of week, and timezone conversions (UTC, IST, EST, PST, JST).",
    category: "System Utilities",
    enabled: true,
    examples: ["What is today's date?", "Current time in Tokyo", "What time is it in IST?", "Day of week"],
    usageCount: 0,
    avgLatencyMs: 2,
  },
  {
    id: "unit_converter",
    name: "Unit Converter",
    description: "Converts temperature, length, weight, and live currency rates (USD, EUR, GBP, INR, JPY).",
    category: "Calculations",
    enabled: true,
    examples: ["Convert 100 kg to lbs", "25 Celsius to Fahrenheit", "10 km to miles", "100 USD to INR"],
    usageCount: 0,
    avgLatencyMs: 4,
  },
];

export default function ToolsManager({
  toolLogs,
  enabledToolIds,
  onToggleTool,
  onClearToolLogs,
  onRunTestQuery,
}: ToolsManagerProps) {
  const [selectedToolId, setSelectedToolId] = useState<ToolId>("calculator");
  const [sandboxInput, setSandboxInput] = useState("567 * 89");
  const [sandboxResult, setSandboxResult] = useState<ToolUsedInfo | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Compute Statistics
  const totalExecutions = toolLogs.length;
  const successfulExecutions = toolLogs.filter((l) => l.status === "success").length;
  const successRate = totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 100;
  const avgLatency =
    totalExecutions > 0
      ? Math.round(toolLogs.reduce((acc, curr) => acc + curr.executionTimeMs, 0) / totalExecutions)
      : 0;

  const activeToolsCount = Object.values(enabledToolIds).filter(Boolean).length;
  const lastToolUsed = toolLogs.length > 0 ? toolLogs[0] : null;

  // Run Sandbox Test
  const handleExecuteSandbox = async () => {
    if (!sandboxInput.trim()) return;
    setIsExecuting(true);
    setSandboxResult(null);

    let res: ToolUsedInfo;
    const input = sandboxInput.trim();

    try {
      if (selectedToolId === "calculator") {
        res = runCalculator(input);
      } else if (selectedToolId === "weather") {
        res = await runWeather(input);
      } else if (selectedToolId === "date_time") {
        res = runDateTime(input);
      } else if (selectedToolId === "unit_converter") {
        res = runUnitConverter(input);
      } else {
        res = runWebSearch(input);
      }
      setSandboxResult(res);
    } catch (err: any) {
      setSandboxResult({
        toolId: selectedToolId,
        name: selectedToolId,
        executionTimeMs: 10,
        result: `Execution failed: ${err.message}`,
        confidence: 0,
        status: "error",
        input,
        errorDetails: err.message,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const getToolIcon = (id: ToolId) => {
    switch (id) {
      case "calculator":
        return <CalcIcon className="w-5 h-5 text-indigo-500" />;
      case "weather":
        return <CloudSun className="w-5 h-5 text-amber-500" />;
      case "web_search":
        return <Globe className="w-5 h-5 text-blue-500" />;
      case "date_time":
        return <Clock className="w-5 h-5 text-emerald-500" />;
      case "unit_converter":
        return <ArrowRightLeft className="w-5 h-5 text-purple-500" />;
    }
  };

  const filteredLogs = toolLogs.filter((log) => {
    const matchesCategory =
      filterCategory === "all" ||
      (filterCategory === "success" && log.status === "success") ||
      (filterCategory === "error" && log.status === "error") ||
      log.toolId === filterCategory;

    const matchesSearch =
      searchFilter.trim() === "" ||
      log.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      log.input.toLowerCase().includes(searchFilter.toLowerCase()) ||
      log.result.toLowerCase().includes(searchFilter.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header & Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs font-semibold mb-1">
            <Zap className="w-4 h-4 text-indigo-500" />
            Active Tools
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
            {activeToolsCount} <span className="text-xs font-normal text-zinc-400">/ 5 Ready</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs font-semibold mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Success Rate
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
            {successRate}%
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs font-semibold mb-1">
            <Clock className="w-4 h-4 text-blue-500" />
            Avg Response Latency
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
            {avgLatency} <span className="text-xs font-normal text-zinc-400">ms</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs font-semibold mb-1">
            <Wrench className="w-4 h-4 text-purple-500" />
            Total Invocations
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
            {totalExecutions}
          </div>
        </div>
      </div>

      {/* 2. Last Executed Tool Banner */}
      {lastToolUsed && (
        <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 rounded-xl shadow-xs">
              {getToolIcon(lastToolUsed.toolId)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  Last Tool Used
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-md font-semibold">
                  {lastToolUsed.executionTimeMs}ms
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold rounded-md">
                  Confidence: {Math.round(lastToolUsed.confidence * 100)}%
                </span>
              </div>
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
                Input: "{lastToolUsed.input}"
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 line-clamp-1">
                Result: {lastToolUsed.result}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Tool Catalog Grid */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Tool Calling Catalog ({TOOL_CATALOG.length})
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">
            Assistant automatically selects tools based on user prompt intent
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {TOOL_CATALOG.map((tool) => {
            const isEnabled = enabledToolIds[tool.id] ?? true;
            return (
              <div
                key={tool.id}
                className={`p-4 rounded-xl border transition-all ${
                  isEnabled
                    ? "bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800"
                    : "bg-zinc-100/40 dark:bg-zinc-900/40 border-zinc-200/40 dark:border-zinc-800/40 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-xs">
                      {getToolIcon(tool.id)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {tool.name}
                      </h4>
                      <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                        {tool.category}
                      </span>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => onToggleTool(tool.id, e.target.checked)}
                      className="w-8 h-4 bg-zinc-300 dark:bg-zinc-600 rounded-full appearance-none checked:bg-indigo-600 relative transition-colors duration-200 cursor-pointer before:content-[''] before:absolute before:h-3 before:w-3 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:left-[18px] before:transition-all"
                    />
                  </label>
                </div>

                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug line-clamp-2 mb-3">
                  {tool.description}
                </p>

                <div className="space-y-1.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/80">
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    Example Prompts
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {tool.examples.slice(0, 3).map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setSelectedToolId(tool.id);
                          setSandboxInput(ex);
                        }}
                        className="text-[10px] font-medium px-2 py-0.5 bg-white dark:bg-zinc-900 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 rounded-md transition-colors text-left"
                      >
                        "{ex}"
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Interactive Tool Testing Sandbox */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Play className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Interactive Tool Execution Sandbox
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Test and benchmark individual tools with custom input parameter strings
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Select Tool
            </label>
            <select
              value={selectedToolId}
              onChange={(e) => {
                const id = e.target.value as ToolId;
                setSelectedToolId(id);
                const catalog = TOOL_CATALOG.find((t) => t.id === id);
                if (catalog && catalog.examples[0]) {
                  setSandboxInput(catalog.examples[0]);
                }
              }}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {TOOL_CATALOG.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.category})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Input Query / Parameters
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={sandboxInput}
                onChange={(e) => setSandboxInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleExecuteSandbox()}
                placeholder="e.g. 567 * 89 or Weather in Hyderabad"
                className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleExecuteSandbox}
                disabled={isExecuting || !sandboxInput.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                {isExecuting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    Run Tool
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {sandboxResult && (
          <div
            className={`p-4 rounded-xl border ${
              sandboxResult.status === "success"
                ? "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/80"
                : "bg-rose-50/50 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-800/80"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {sandboxResult.status === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                )}
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {sandboxResult.name} Result
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-md font-bold">
                  ⚡ {sandboxResult.executionTimeMs}ms
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 border border-zinc-200 dark:border-zinc-700 rounded-md font-bold">
                  Confidence: {Math.round(sandboxResult.confidence * 100)}%
                </span>
              </div>
            </div>

            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 font-mono whitespace-pre-wrap">
              {sandboxResult.result}
            </p>

            {onRunTestQuery && (
              <button
                onClick={() => onRunTestQuery(sandboxInput)}
                className="mt-3 flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Send this question to Assistant in chat &rarr;
              </button>
            )}
          </div>
        )}
      </div>

      {/* 5. Tool Execution Logs Timeline */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Tool Execution History ({filteredLogs.length})
            </h3>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search tool logs..."
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-700 dark:text-zinc-300 focus:outline-hidden"
            >
              <option value="all">All Logs</option>
              <option value="success">Success Only</option>
              <option value="error">Error Only</option>
              <option value="calculator">Calculator</option>
              <option value="weather">Weather</option>
              <option value="date_time">Date & Time</option>
              <option value="unit_converter">Unit Converter</option>
              <option value="web_search">Web Search</option>
            </select>

            {toolLogs.length > 0 && (
              <button
                onClick={onClearToolLogs}
                className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                title="Clear Tool Logs"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-zinc-400 text-xs bg-zinc-50/50 dark:bg-zinc-800/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
            No tool execution records found. Ask the Assistant a math, weather, date, or unit question to trigger automatic tool calling!
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              return (
                <div
                  key={log.id}
                  className="bg-zinc-50/60 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-3 space-y-2 transition-all hover:border-indigo-300 dark:hover:border-indigo-700"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getToolIcon(log.toolId)}
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {log.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-md font-semibold">
                        {log.executionTimeMs}ms
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-400">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                    <span className="text-zinc-400 font-normal">Input:</span> "{log.input}"
                  </div>

                  <div className="text-xs text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200/60 dark:border-zinc-800 font-mono">
                    {log.result}
                  </div>

                  {isExpanded && (
                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700/80 text-[11px] text-zinc-500 space-y-1">
                      <div>Confidence Score: {Math.round(log.confidence * 100)}%</div>
                      <div>Status: {log.status}</div>
                      {log.errorDetails && <div className="text-rose-500">Error: {log.errorDetails}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
