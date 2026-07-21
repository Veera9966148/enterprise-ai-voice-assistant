import { useEffect, useRef } from "react";
import { Message, PersonaDetails } from "../types";
import { Play, RotateCcw, Volume2, User, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ChatLogsProps {
  messages: Message[];
  persona: PersonaDetails;
  assistantName: string;
  onClear: () => void;
  onSuggestionClick: (promptText: string) => void;
  onSpeakMessage: (text: string) => void;
}

export default function ChatLogs({
  messages,
  persona,
  assistantName,
  onClear,
  onSuggestionClick,
  onSpeakMessage,
}: ChatLogsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden" id="chat-logs">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
            Conversation Logs
          </span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Transcript</span>
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent"
      >
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto gap-5"
            >
              {/* Persona Greetings Card */}
              <div className={`p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 w-full ${persona.bgColor}`}>
                <div className="flex flex-col items-center gap-3">
                  <div className={`p-3 rounded-full bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/50 dark:border-zinc-700`}>
                    <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    Meet {assistantName}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    "{persona.description}"
                  </p>
                </div>
              </div>

              {/* Suggestions */}
              <div className="flex flex-col gap-2.5 w-full">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 text-left">
                  Try asking or saying:
                </span>
                <div className="flex flex-col gap-2">
                  {persona.suggestedPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSuggestionClick(prompt)}
                      className="w-full text-left px-4 py-3 bg-zinc-50 hover:bg-indigo-50/40 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 hover:border-indigo-200 dark:hover:border-indigo-900/60 rounded-xl text-xs text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-all duration-200"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex flex-col max-w-[85%] ${isUser ? "items-end" : "items-start"} gap-1`}>
                    {/* Speaker Header */}
                    <span className="text-[10px] text-zinc-400 font-bold flex items-center gap-1 px-1">
                      {isUser ? (
                        <>
                          <span>You</span>
                          <User className="w-3 h-3 text-zinc-400" />
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-indigo-500" />
                          <span>{assistantName}</span>
                        </>
                      )}
                    </span>

                    {/* Bubble Content */}
                    <div className="flex items-center gap-2 group">
                      {/* Play Button for Assistant Messages */}
                      {!isUser && (
                        <button
                          onClick={() => onSpeakMessage(msg.content)}
                          className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400 border border-zinc-100 dark:border-zinc-800 text-zinc-400 transition-all opacity-0 group-hover:opacity-100"
                          title="Read message aloud"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      )}

                      <div
                        className={`px-4 py-3 rounded-2xl text-sm ${
                          isUser
                            ? "bg-indigo-500 text-white rounded-br-none"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200/50 dark:border-zinc-700/50 rounded-bl-none"
                        }`}
                      >
                        {msg.attachment && (
                          <div className="mb-2 p-2 bg-black/10 dark:bg-white/10 rounded-xl flex items-center gap-2">
                            {msg.attachment.type === "image" && msg.attachment.data ? (
                              <img
                                src={`data:${msg.attachment.mimeType};base64,${msg.attachment.data}`}
                                alt={msg.attachment.name}
                                className="w-12 h-12 rounded-lg object-cover border border-white/20"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-indigo-600/30 rounded-lg flex items-center justify-center font-bold text-xs">
                                📄
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold truncate">{msg.attachment.name}</p>
                              <p className="text-[10px] opacity-80">{msg.attachment.type.toUpperCase()}</p>
                            </div>
                          </div>
                        )}

                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                        {!isUser && msg.toolUsed && (
                          <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-2 flex-wrap text-[10px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                🛠 Tool Used:
                              </span>
                              <span className="font-semibold px-2 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 rounded-md">
                                {msg.toolUsed.name}
                              </span>
                              <span className="font-medium text-zinc-500">
                                ({msg.toolUsed.executionTimeMs}ms)
                              </span>
                            </div>
                            <span className="text-[9px] text-zinc-400 font-mono italic truncate max-w-[200px]" title={msg.toolUsed.result}>
                              Result: {msg.toolUsed.result}
                            </span>
                          </div>
                        )}

                        {!isUser && msg.memoriesUsed && msg.memoriesUsed.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                              🧠 Memory Used:
                            </span>
                            {msg.memoriesUsed.map((mem, i) => (
                              <span
                                key={i}
                                className="text-[10px] font-semibold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 rounded-md"
                              >
                                {mem}
                              </span>
                            ))}
                          </div>
                        )}

                        {!isUser && msg.sourcesUsed && msg.sourcesUsed.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              RAG Grounded:
                            </span>
                            {msg.sourcesUsed.map((src, i) => (
                              <span
                                key={i}
                                className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 rounded-md"
                              >
                                {src}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Timing & Channel Indicator */}
                    <div className="flex items-center gap-1.5 px-1 mt-0.5">
                      <span className="text-[9px] font-medium text-zinc-400">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                      {msg.isSpeech && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-zinc-300" />
                          <span className="text-[9px] font-semibold text-indigo-500 flex items-center gap-0.5">
                            <Volume2 className="w-2.5 h-2.5" />
                            <span>Voice</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
