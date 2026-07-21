import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { detectAndExecuteTool } from "./src/lib/toolEngine";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini client on the server
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("Warning: GEMINI_API_KEY is not defined. AI interactions will fail.");
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Memory Storage array (server in-memory store backed by client persistence)
  let serverMemories: any[] = [];

  // Memory CRUD endpoints
  app.get("/api/memory", (req: express.Request, res: express.Response) => {
    res.json({ memories: serverMemories });
  });

  app.post("/api/memory", (req: express.Request, res: express.Response) => {
    const { title, category, content, importanceScore = 5 } = req.body;
    if (!content) {
      return res.status(400).json({ error: "Content is required for memory" });
    }
    const newMemory = {
      id: "mem_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      title: title || "User Note",
      category: category || "knowledge",
      content,
      importanceScore: Number(importanceScore) || 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    serverMemories.unshift(newMemory);
    res.json({ success: true, memory: newMemory });
  });

  app.put("/api/memory/:id", (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const { title, category, content, importanceScore } = req.body;
    const idx = serverMemories.findIndex((m) => m.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Memory not found" });
    }
    serverMemories[idx] = {
      ...serverMemories[idx],
      ...(title && { title }),
      ...(category && { category }),
      ...(content && { content }),
      ...(importanceScore !== undefined && { importanceScore: Number(importanceScore) }),
      updatedAt: new Date().toISOString(),
    };
    res.json({ success: true, memory: serverMemories[idx] });
  });

  app.delete("/api/memory/:id", (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    serverMemories = serverMemories.filter((m) => m.id !== id);
    res.json({ success: true });
  });

  app.delete("/api/memory", (req: express.Request, res: express.Response) => {
    serverMemories = [];
    res.json({ success: true, message: "All memories cleared" });
  });

  // Helper to resolve model name to active supported Gemini model
  function normalizeModel(modelInput?: string): string {
    if (!modelInput) return "gemini-3.6-flash";
    const m = modelInput.toLowerCase();
    if (m === "gemini-3.6-flash" || m.includes("3.6-flash")) return "gemini-3.6-flash";
    if (m === "gemini-3.1-pro-preview" || m.includes("3.1-pro")) return "gemini-3.1-pro-preview";
    if (m === "gemini-3.1-flash-lite" || m.includes("flash-lite")) return "gemini-3.1-flash-lite";
    if (m === "gemini-flash-latest" || m.includes("flash-latest")) return "gemini-flash-latest";
    
    // Default to gemini-3.6-flash for safety and highest availability
    return "gemini-3.6-flash";
  }

  // Safe wrapper with auto-fallback to gemini-3.6-flash if 429 quota or 404 model error occurs
  async function safeGenerateContent(primaryModel: string, contents: any, config: any) {
    const targetModel = normalizeModel(primaryModel);
    try {
      return await ai.models.generateContent({
        model: targetModel,
        contents,
        config,
      });
    } catch (err: any) {
      console.warn(`Primary model (${targetModel}) failed: ${err.message || err}. Attempting automatic fallback...`);
      
      // If primary was not gemini-3.6-flash, retry with gemini-3.6-flash
      if (targetModel !== "gemini-3.6-flash") {
        try {
          return await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents,
            config,
          });
        } catch (fallbackErr: any) {
          console.warn(`Fallback to gemini-3.6-flash failed with config. Retrying without search grounding tools: ${fallbackErr.message || fallbackErr}`);
        }
      }

      // Final attempt: gemini-3.6-flash without extra search grounding tools
      const strippedConfig = { ...config };
      delete strippedConfig.tools;
      return await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents,
        config: strippedConfig,
      });
    }
  }

  // API endpoints FIRST
  app.post("/api/vision/analyze", async (req: express.Request, res: express.Response) => {
    try {
      const {
        fileData,
        rawText,
        mimeType = "image/png",
        fileName = "attachment",
        fileType = "image",
        mode = "auto",
        customPrompt,
        model = "gemini-3.6-flash",
      } = req.body;

      if (!fileData && !rawText) {
        return res.status(400).json({ error: "File data or text is required for analysis" });
      }

      let systemPrompt = `You are a world-class Vision AI and Document Intelligence Specialist.
Your task is to thoroughly analyze the provided ${fileType} ("${fileName}") and extract high-precision insights.`;

      let instructionPrompt = "";
      if (mode === "ocr") {
        instructionPrompt = `Perform full OCR text extraction on this file.
Extract all visible text, maintaining structural headers, layout, paragraphs, list items, tables, and numerical data.`;
      } else if (mode === "ui_ux") {
        instructionPrompt = `Analyze the UI/UX design of this screenshot or document layout.
Evaluate:
1. Visual Hierarchy & Typography
2. Color Harmony & Contrast
3. Layout, Alignment & Spacing
4. Accessibility & User Flow
5. Top 3-5 concrete actionable UI/UX improvements.`;
      } else if (mode === "error_debug") {
        instructionPrompt = `Examine this error screenshot, terminal log, or code exception.
1. Identify the exact error message and code/stack trace.
2. Explain the root cause in clear terms.
3. Provide step-by-step resolution instructions and corrected code snippets.`;
      } else if (mode === "chart_reader") {
        instructionPrompt = `Extract and interpret all data from this chart, graph, diagram, or table.
1. Identify variables, axes, timeframes, and legends.
2. List exact data values and metrics.
3. Highlight key trends, growth drivers, outliers, and summary conclusions.`;
      } else if (mode === "action_items") {
        instructionPrompt = `Extract key decisions, deliverables, and actionable next steps/todos from this document/image.
For each action item, specify owner/role if mentioned and priority level.`;
      } else if (mode === "summary") {
        instructionPrompt = `Provide a comprehensive summary of this ${fileType}.
Include: Executive Summary, Main Topics/Sections, Key Findings, and Takeaways.`;
      } else {
        instructionPrompt = `Perform a complete analysis of this ${fileType}.
Extract:
1. Executive Summary & Scene/Document Overview
2. Full OCR Text (if text/tables are visible)
3. Key Insights & Main Points
4. Action Items & Next Steps (if applicable)`;
      }

      if (customPrompt && customPrompt.trim()) {
        instructionPrompt += `\n\nUser Specific Focus / Question: "${customPrompt.trim()}"`;
      }

      const jsonSchemaPrompt = `\n\nPlease structure your final output strictly as a valid JSON object matching this JSON schema:
{
  "summary": "High-level executive summary of the document or image",
  "ocrText": "Extracted text or OCR content from the document/image",
  "sceneDescription": "Detailed visual description of scenes, graphics, layouts, or diagrams",
  "uiAnalysis": "UI/UX analysis, design feedback, or visual structure insights (if applicable)",
  "errorFix": "Error debugging explanation and step-by-step fix (if error/code screenshot)",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "actionItems": ["Action item 1", "Action item 2"],
  "sources": ["Page or section references if applicable"]
}

Return ONLY raw valid JSON without markdown wrapping.`;

      const userTextPrompt = `${instructionPrompt}\n${jsonSchemaPrompt}`;

      const contents: any[] = [];
      const parts: any[] = [];

      if (fileData) {
        const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, "");
        parts.push({
          inlineData: {
            mimeType: mimeType || "image/png",
            data: cleanBase64,
          },
        });
      }

      if (rawText) {
        parts.push({ text: `Document Raw Text Content:\n${rawText.slice(0, 30000)}` });
      }

      parts.push({ text: userTextPrompt });
      contents.push({ role: "user", parts });

      const config = {
        systemInstruction: systemPrompt,
        temperature: 0.2,
      };

      const response = await safeGenerateContent(model, contents, config);
      const rawResponseText = response.text || "";

      let parsedResult: any = {};
      try {
        const jsonMatch = rawResponseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        } else {
          parsedResult = JSON.parse(rawResponseText.trim().replace(/^```json\s*/i, "").replace(/```$/i, ""));
        }
      } catch (e) {
        parsedResult = {
          summary: rawResponseText,
          ocrText: rawResponseText,
          keyPoints: [rawResponseText.slice(0, 250) + "..."],
          actionItems: [],
          sources: [fileName],
        };
      }

      res.json({
        success: true,
        fileName,
        fileType,
        mode,
        summary: parsedResult.summary || "Analysis completed successfully.",
        ocrText: parsedResult.ocrText || "",
        sceneDescription: parsedResult.sceneDescription || "",
        uiAnalysis: parsedResult.uiAnalysis || "",
        errorFix: parsedResult.errorFix || "",
        keyPoints: Array.isArray(parsedResult.keyPoints) ? parsedResult.keyPoints : [],
        actionItems: Array.isArray(parsedResult.actionItems) ? parsedResult.actionItems : [],
        sources: Array.isArray(parsedResult.sources) ? parsedResult.sources : [fileName],
      });
    } catch (err: any) {
      console.error("Vision Analyze Endpoint Error:", err);
      res.status(500).json({ error: err.message || "Failed to analyze document/image" });
    }
  });

  app.post("/api/chat", async (req: express.Request, res: express.Response) => {
    try {
      const {
        message,
        history,
        attachment,
        persona,
        assistantName,
        model = "gemini-3.6-flash",
        temperature = 0.7,
        enableSearchGrounding = false,
        enableRag = true,
        ragDocuments = [],
        ragTopK = 3,
        enableMemory = true,
        autoExtractMemory = true,
        memories = [],
        memorySearchTopK = 5,
        enableTools = true,
        enabledToolIds = {
          calculator: true,
          weather: true,
          web_search: true,
          date_time: true,
          unit_converter: true,
        },
      } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Sync serverMemories with client memories if provided
      if (Array.isArray(memories) && memories.length > 0) {
        serverMemories = memories;
      }

      const memoriesUsed: string[] = [];
      const sourcesUsed: string[] = [];
      const extractedMemories: any[] = [];
      let toolUsed: any = null;

      // 0. TOOL EXECUTION (Auto Tool Selection)
      let retrievedToolContext = "";
      if (enableTools !== false) {
        toolUsed = await detectAndExecuteTool(message, enabledToolIds);
        if (toolUsed && toolUsed.status === "success") {
          retrievedToolContext = `\n--- AUTOMATICALLY EXECUTED TOOL RESULT ---
Tool Name: ${toolUsed.name}
Execution Time: ${toolUsed.executionTimeMs}ms
Confidence: ${toolUsed.confidence}
Result: ${toolUsed.result}
--- END TOOL RESULT ---
Instruction: Use the exact calculated tool result above to answer the user's question accurately. State or summarize the tool result naturally for speech.\n`;
        }
      }

      // 1. MEMORY RETRIEVAL (User Profile, Preferences & Saved Memories)
      let retrievedMemoryContext = "";
      if (enableMemory && Array.isArray(serverMemories) && serverMemories.length > 0) {
        const queryLower = message.toLowerCase();
        const queryTerms = queryLower.split(/\W+/).filter((t: string) => t.length > 2);

        // Check if user is asking "what do you remember about me" or similar general recall
        const isRecallQuery = /remember|know about me|my profile|my info|what do you know|my details|my memory/i.test(message);

        const scoredMemories = serverMemories.map((mem) => {
          const memText = `${mem.title} ${mem.category} ${mem.content}`.toLowerCase();
          let score = mem.importanceScore || 5; // Base importance score bonus

          if (isRecallQuery) {
            score += 10; // Boost all memories for recall queries
          } else {
            queryTerms.forEach((term: string) => {
              if (memText.includes(term)) {
                score += 5;
                if (mem.title.toLowerCase().includes(term)) score += 3;
              }
            });
          }
          return { mem, score };
        })
        .filter((item) => isRecallQuery || item.score > 5)
        .sort((a, b) => b.score - a.score)
        .slice(0, memorySearchTopK);

        if (scoredMemories.length > 0) {
          retrievedMemoryContext = "\n--- RETRIEVED USER LONG-TERM & SHORT-TERM MEMORIES ---\n";
          scoredMemories.forEach(({ mem }) => {
            retrievedMemoryContext += `- [${mem.category.toUpperCase()}] ${mem.title}: ${mem.content} (Importance: ${mem.importanceScore}/10)\n`;
            memoriesUsed.push(`${mem.title}`);
          });
          retrievedMemoryContext += "--- END RETRIEVED USER MEMORIES ---\n";
          retrievedMemoryContext += "Instruction: Use the retrieved user memory above to personalize your answer. You can say phrases like 'I remember you told me...', 'I recall your goal is...', or 'Based on your profile...' whenever applicable.\n";
        }
      }

      // 2. RAG RETRIEVAL (Knowledge Base Documents)
      let retrievedRagContext = "";
      if (enableRag && Array.isArray(ragDocuments) && ragDocuments.length > 0) {
        const queryTerms = message.toLowerCase().split(/\W+/).filter((t: string) => t.length > 2);
        
        const scoredDocs = ragDocuments
          .filter((doc: any) => doc.enabled)
          .map((doc: any) => {
            const docText = `${doc.title} ${doc.content}`.toLowerCase();
            let score = 0;
            queryTerms.forEach((term: string) => {
              if (docText.includes(term)) {
                if (doc.title.toLowerCase().includes(term)) score += 3;
                const matches = (docText.match(new RegExp(term, "g")) || []).length;
                score += matches;
              }
            });
            return { doc, score };
          })
          .filter(item => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, ragTopK);

        if (scoredDocs.length > 0) {
          retrievedRagContext = "\n--- RETRIEVED KNOWLEDGE BASE CONTEXT (RAG) ---\n";
          scoredDocs.forEach(({ doc }, idx) => {
            retrievedRagContext += `[Source ${idx + 1}: ${doc.title}]\n${doc.content}\n\n`;
            sourcesUsed.push(doc.title);
          });
          retrievedRagContext += "--- END KNOWLEDGE BASE CONTEXT ---\n";
          retrievedRagContext += "Instruction: Use the retrieved knowledge base context above to answer the user accurately whenever applicable.\n";
        }
      }

      // Base instructions
      let systemInstruction = `You are a highly capable, human-like voice assistant equipped with an advanced AI Memory system. Your name is ${assistantName || "Assistant"}.
Key instructions for your speech:
1. Keep responses concise, simple, natural, and conversational, since they will be read aloud via text-to-speech. Limit responses to 2-3 sentences max.
2. STRICTLY avoid markdown formatting (e.g., asterisks, bold characters, lists, bullet points, hashtags). Use plain, conversational English that sounds natural when spoken.
3. Spell out abbreviations or technical symbols if they sound strange when spoken. For example, use "percent" instead of "%", "degrees" instead of "°", and "and" instead of "&".
4. When accessing memories, naturally acknowledge what you remember (e.g., "I remember your goal is...", "Since you work as...").`;

      if (persona === "friendly") {
        systemInstruction += "\nPersona Guidelines: Be cheerful, enthusiastic, warm, and highly empathetic.";
      } else if (persona === "professional") {
        systemInstruction += "\nPersona Guidelines: Be extremely professional, clear, and direct. Skip the fluff.";
      } else if (persona === "witty") {
        systemInstruction += "\nPersona Guidelines: Be funny, witty, playful, and slightly sarcastic.";
      } else if (persona === "zen") {
        systemInstruction += "\nPersona Guidelines: Be calm, soothing, peaceful, and mindful.";
      } else if (persona === "tech") {
        systemInstruction += "\nPersona Guidelines: Be a highly passionate, enthusiastic tech guru. Use creative technical analogies and celebration of code.";
      }

      if (retrievedToolContext) {
        systemInstruction += `\n${retrievedToolContext}`;
      }

      if (retrievedMemoryContext) {
        systemInstruction += `\n${retrievedMemoryContext}`;
      }

      if (retrievedRagContext) {
        systemInstruction += `\n${retrievedRagContext}`;
      }

      // Construct content list for Gemini API
      const formattedContents: any[] = [];
      
      if (history && Array.isArray(history)) {
        for (const msg of history) {
          formattedContents.push({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }]
          });
        }
      }

      const currentParts: any[] = [];
      if (attachment && attachment.data && attachment.mimeType) {
        const cleanBase64 = attachment.data.replace(/^data:[^;]+;base64,/, "");
        currentParts.push({
          inlineData: {
            mimeType: attachment.mimeType,
            data: cleanBase64,
          },
        });
      }
      currentParts.push({ text: message });

      formattedContents.push({
        role: "user",
        parts: currentParts,
      });

      const config: any = {
        systemInstruction,
        temperature: Number(temperature) || 0.7,
      };

      if (enableSearchGrounding) {
        config.tools = [{ googleSearch: {} }];
      }

      const response = await safeGenerateContent(model, formattedContents, config);

      const replyText = response.text || "I am sorry, I couldn't generate a response.";

      // 3. SMART MEMORY AUTO-EXTRACTION
      if (enableMemory && autoExtractMemory) {
        const memoryTriggers = /my name is|i am a|i work as|my profession is|my goal is|i like|i love|my favorite|remember that|remember this|i'm an?|i study|my nickname is|my skills are/i;
        
        if (memoryTriggers.test(message)) {
          try {
            const extractPrompt = `Analyze the following user statement and decide if it contains meaningful long-term personal facts or preferences worth remembering (e.g. name, nickname, profession, skills, goals, favorite programming language, preferred AI model, interests, or persistent preferences).
User Statement: "${message}"

Do NOT save temporary questions, small talk, or random queries.
If there IS meaningful long-term information, return a JSON object with:
{
  "shouldSave": true,
  "title": "Short descriptive title (e.g. User Profession or Goal to Learn Rust)",
  "category": "user_profile" | "preference" | "knowledge" | "conversation",
  "content": "Clear statement of the fact (e.g. User works as a Senior Software Engineer)",
  "importanceScore": integer from 1 to 10
}

If there is NO long-term memory to save, return:
{ "shouldSave": false }

Respond strictly with valid JSON and no markdown wrapping.`;

            const extractRes = await safeGenerateContent("gemini-3.6-flash", [{ role: "user", parts: [{ text: extractPrompt }] }], {});

            const rawJson = extractRes.text?.trim().replace(/^```json\s*/i, "").replace(/```$/i, "") || "{}";
            const parsed = JSON.parse(rawJson);

            if (parsed.shouldSave && parsed.content) {
              const newMem = {
                id: "mem_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
                title: parsed.title || "User Preference",
                category: parsed.category || "user_profile",
                content: parsed.content,
                importanceScore: parsed.importanceScore || 7,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              serverMemories.unshift(newMem);
              extractedMemories.push(newMem);
            }
          } catch (e) {
            console.warn("Smart memory auto-extraction failed:", e);
          }
        }
      }

      res.json({
        text: replyText,
        sourcesUsed,
        memoriesUsed,
        extractedMemories,
        toolUsed,
      });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // Serve static files / Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
