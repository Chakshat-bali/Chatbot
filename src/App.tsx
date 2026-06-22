import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Image as ImageIcon,
  Trash2,
  Plus,
  Menu,
  X,
  Sparkles,
  Code,
  Compass,
  HelpCircle,
  AlertCircle,
  ChevronRight,
  SendHorizontal,
  Loader2,
  Trash,
  Globe,
  Search,
  Paperclip,
  Info,
  Zap
} from "lucide-react";
import { PERSONAS } from "./personas";
import { ChatMessage, PersonaId } from "./types";
import { MessageContentRenderer } from "./components/MessageContentRenderer";

interface Thread {
  id: string;
  title: string;
  personaId: PersonaId;
  messages: ChatMessage[];
  createdAt: string;
}

export default function App() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>("");
  const [input, setInput] = useState("");
  const [fileAttachment, setFileAttachment] = useState<{
    data: string; // base64
    mimeType: string;
    name: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [enableSearch, setEnableSearch] = useState<boolean>(true);
  const [autoRoute, setAutoRoute] = useState<boolean>(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial threads from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("lumina_threads");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          setThreads(parsed);
          setActiveThreadId(parsed[0].id);
          return;
        }
      } catch (e) {
        console.error("Failed to parse saved threads", e);
      }
    }

    // Default thread if none exist
    const defaultThread: Thread = {
      id: "thread-default",
      title: "Welcome Chat",
      personaId: "assistant",
      createdAt: new Date().toISOString(),
      messages: [
        {
          id: "welcome-msg",
          role: "model",
          text: `Hello! I'm **Aura**, your dedicated **LuminaBot** companion. I am here to help you summarize full documents, explain complex topics, answer general questions, or run real-time searches!

You can also attach **PDF documents** or **Images** using the Paperclip attach icon next to the input area (or by dragging and dropping them here) to ask advanced queries about them. How can I support you today?`,
          timestamp: new Date().toISOString()
        }
      ]
    };
    setThreads([defaultThread]);
    setActiveThreadId(defaultThread.id);
  }, []);

  // Save threads to localStorage on change
  useEffect(() => {
    if (threads.length > 0) {
      localStorage.setItem("lumina_threads", JSON.stringify(threads));
    }
  }, [threads]);

  // Scroll to bottom helper
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threads, activeThreadId, loading]);

  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];
  const activePersona = activeThread ? PERSONAS[activeThread.personaId] : PERSONAS.assistant;

  // Change persona of the current thread (or create new thread if requested)
  const handlePersonaChange = (pId: PersonaId) => {
    if (!activeThread) return;

    // Direct change on existing thread, or if starter, replace welcome text with new persona welcome
    const targetPersona = PERSONAS[pId];
    const updatedThreads = threads.map((thread) => {
      if (thread.id === activeThread.id) {
        // If it was just a fresh thread with only welcome message, swap welcome too
        let newMessages = [...thread.messages];
        if (newMessages.length === 1 && newMessages[0].id === "welcome-msg") {
          newMessages = [
            {
              id: "welcome-msg",
              role: "model",
              text: `Hello! I'm **${targetPersona.name}**, your **${targetPersona.tagline}**. ${targetPersona.description}\n\n${targetPersona.placeholder}`,
              timestamp: new Date().toISOString()
            }
          ];
        }
        return {
          ...thread,
          personaId: pId,
          messages: newMessages
        };
      }
      return thread;
    });

    setThreads(updatedThreads);
  };

  // Helper to handle general file processing (including images and PDFs)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isPDF = file.type === "application/pdf";

    if (!isImage && !isPDF) {
      alert("Please upload a supported file: an Image (PNG, JPEG, WEBP) or a PDF document.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = (reader.result as string).split(",")[1];
      setFileAttachment({
        data: base64String,
        mimeType: file.type,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const isImage = file.type.startsWith("image/");
      const isPDF = file.type === "application/pdf";

      if (isImage || isPDF) {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = (reader.result as string).split(",")[1];
          setFileAttachment({
            data: base64String,
            mimeType: file.type,
            name: file.name
          });
        };
        reader.readAsDataURL(file);
      } else {
        alert("Please drop a supported Image file or a PDF document.");
      }
    }
  };

  const handleSend = async (customMessage?: string) => {
    const messageText = customMessage || input;
    if (!messageText.trim() && !fileAttachment) return;

    if (!activeThread) return;

    const userMessageId = `msg-user-${Date.now()}`;
    const userMessageText = messageText;

    const newUserMessage: ChatMessage = {
      id: userMessageId,
      role: "user",
      text: userMessageText,
      file: fileAttachment ? { data: fileAttachment.data, mimeType: fileAttachment.mimeType, name: fileAttachment.name } : undefined,
      // Keep old image structure populated if it's an image
      image: (fileAttachment && fileAttachment.mimeType.startsWith("image/")) ? { data: fileAttachment.data, mimeType: fileAttachment.mimeType } : undefined,
      timestamp: new Date().toISOString()
    };

    let finalPersonaId = activeThread.personaId;
    let finalMessages = [...activeThread.messages, newUserMessage];
    let threadTitle = activeThread.title;

    // Automatically name empty or welcome threads on first user input
    if (activeThread.title === "Welcome Chat" || activeThread.title === "New Chat Thread") {
      threadTitle = messageText.slice(0, 30) + (messageText.length > 30 ? "..." : "");
    }

    setLoading(true);
    setInput("");
    setFileAttachment(null);

    // Auto Modality Switcher active query mapping
    if (autoRoute && messageText.trim()) {
      try {
        const routeRes = await fetch("/api/classify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ text: messageText })
        });
        if (routeRes.ok) {
          const routeData = await routeRes.json();
          const classifiedId = routeData.personaId as PersonaId;
          if (classifiedId !== activeThread.personaId) {
            finalPersonaId = classifiedId;
          }
        }
      } catch (e) {
        console.error("Auto-classification error:", e);
      }
    }

    // Update threads state immediately with the user query (and potential auto-route notification message)
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === activeThread.id) {
          return {
            ...t,
            title: threadTitle,
            personaId: finalPersonaId,
            messages: finalMessages
          };
        }
        return t;
      })
    );

    // Reconstruct conversation history into Gemini format based on finalMessages state
    const contentsPayload = finalMessages.map((msg) => {
      const parts: any[] = [];
      parts.push({ text: msg.text || "" });

      if (msg.file) {
        parts.push({
          inlineData: {
            mimeType: msg.file.mimeType,
            data: msg.file.data
          }
        });
      } else if (msg.image) {
        parts.push({
          inlineData: {
            mimeType: msg.image.mimeType,
            data: msg.image.data
          }
        });
      }
      
      return {
        role: msg.role,
        parts
      };
    });

    try {
      const activePersonaConfig = PERSONAS[finalPersonaId];
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: contentsPayload,
          systemInstruction: activePersonaConfig.systemInstruction,
          enableSearch: enableSearch
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || errData.details || "Failed to generate bot reply.");
      }

      const resData = await response.json();
      const botTextResponse = resData.text || "I was unable to formulate a response. Let us try again.";

      const modelMessageId = `msg-model-${Date.now()}`;
      const newModelMessage: ChatMessage = {
        id: modelMessageId,
        role: "model",
        text: botTextResponse,
        timestamp: new Date().toISOString(),
        groundingMetadata: resData.groundingMetadata || undefined
      };

      setThreads((prevThreads) =>
        prevThreads.map((t) => {
          if (t.id === activeThread.id) {
            return {
              ...t,
              messages: [...finalMessages, newModelMessage]
            };
          }
          return t;
        })
      );
    } catch (error: any) {
      console.error(error);
      const errorMessageId = `msg-error-${Date.now()}`;
      const newModelMessageError: ChatMessage = {
        id: errorMessageId,
        role: "model",
        text: "I encountered a processing anomaly while accessing the digital network.",
        error: error.message || String(error),
        timestamp: new Date().toISOString()
      };

      setThreads((prevThreads) =>
        prevThreads.map((t) => {
          if (t.id === activeThread.id) {
            return {
              ...t,
              messages: [...finalMessages, newModelMessageError]
            };
          }
          return t;
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewThread = () => {
    const newId = `thread-${Date.now()}`;
    const newThread: Thread = {
      id: newId,
      title: "New Chat Thread",
      personaId: "assistant",
      createdAt: new Date().toISOString(),
      messages: [
        {
          id: "welcome-msg",
          role: "model",
          text: "Hello! I'm **Aura**, your **Productivity Companion**. Let's start a fresh discussion.",
          timestamp: new Date().toISOString()
        }
      ]
    };
    setThreads([newThread, ...threads]);
    setActiveThreadId(newId);
    setMobileSidebarOpen(false);
  };

  const handleDeleteThread = (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = threads.filter((t) => t.id !== idToDelete);

    if (filtered.length === 0) {
      const defaultThread: Thread = {
        id: "thread-default",
        title: "Welcome Chat",
        personaId: "assistant",
        createdAt: new Date().toISOString(),
        messages: [
          {
            id: "welcome-msg",
            role: "model",
            text: `Hello! I'm **Aura**, your **Productivity Companion**. How are you doing?`,
            timestamp: new Date().toISOString()
          }
        ]
      };
      setThreads([defaultThread]);
      setActiveThreadId(defaultThread.id);
    } else {
      setThreads(filtered);
      if (activeThreadId === idToDelete) {
        setActiveThreadId(filtered[0].id);
      }
    }
  };

  return (
    <div className="h-screen max-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 selection:bg-indigo-500 selection:text-white overflow-hidden" id="main-container">
      
      {/* Top Banner indicating API key Status or welcome info */}
      <nav id="top-navigation" className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-10 shrink-0 shadow-sm z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            aria-label="Toggle Navigation Panel"
            id="mobile-menu-btn"
          >
            <Menu size={20} />
          </button>
          
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-md shadow-indigo-100 flex items-center justify-center relative group">
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-[10px]"></div>
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.886L4 10l5.886 1.912L12 21l1.912-5.886L20 10l-5.886-1.912L12 3Z" fill="url(#logo-gradient)" />
                <defs>
                  <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#818CF8" />
                    <stop offset="50%" stopColor="#C084FC" />
                    <stop offset="100%" stopColor="#F472B6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          <div>
            <span className="font-bold text-lg md:text-xl tracking-tight uppercase">
              Lumina<span className="text-indigo-600">Bot</span>
            </span>
          </div>
        </div>

      </nav>

      {/* Main workspace frame: 3 panels */}
      <div className="flex-1 flex overflow-hidden relative" id="workspace-frame">
        
        {/* PANEL 1: Left rail - Navigation History & Agent Personas */}
        <aside
          id="left-rail"
          className={`
            fixed md:relative inset-y-0 left-0 w-80 bg-white border-r border-slate-200 flex flex-col z-40 transform transition-transform duration-300 ease-in-out
            ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}
        >
          {/* Mobile Overlay close button */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100 md:hidden bg-slate-50">
            <span className="font-bold text-slate-800 text-sm">Navigation Portal</span>
            <button onClick={() => setMobileSidebarOpen(false)} className="p-1 rounded-md hover:bg-slate-200 text-slate-500">
              <X size={18} />
            </button>
          </div>

          {/* Core Personas Hub */}
          <div className="p-5 border-b border-slate-100 bg-slate-55/60">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Model Core Personality</h2>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PERSONAS) as PersonaId[]).map((pKey) => {
                const persona = PERSONAS[pKey];
                const isSelected = activeThread?.personaId === pKey;
                return (
                  <div key={pKey} className="relative group/card">
                    <button
                      onClick={() => handlePersonaChange(pKey)}
                      className={`
                        p-3 rounded-lg flex flex-col text-left transition-all relative overflow-hidden ring-1 border w-full h-full
                        ${isSelected 
                          ? `${persona.color.bg} border-slate-300 ring-indigo-500/30 ring-2` 
                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 ring-transparent"
                        }
                      `}
                      id={`persona-btn-${pKey}`}
                    >
                      <span className="text-2xl mb-1.5 block">{persona.emoji}</span>
                      <span className={`font-bold text-xs ${isSelected ? "text-slate-900" : "text-slate-700"}`}>
                        {persona.name}
                      </span>
                      <span className="text-[9px] text-slate-400 mt-0.5 line-clamp-1">
                        {persona.tagline}
                      </span>
                    </button>

                    {/* Small 'i' info hover trigger */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <div className="relative group/tooltip flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                          className="w-4 h-4 rounded-full bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors shadow-sm cursor-help"
                          aria-label={`More about ${persona.name}`}
                        >
                          <Info size={10} className="stroke-[2.5]" />
                        </button>
                        
                        {/* Custom Rich Tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-52 p-3 bg-slate-900/95 backdrop-blur-sm border border-slate-800 text-white text-[11px] rounded-xl shadow-xl pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 z-50 translate-y-1 group-hover/tooltip:translate-y-0">
                          <p className="font-bold text-indigo-300 mb-1 flex items-center gap-1.5 font-sans">
                            <span>{persona.emoji}</span>
                            <span>{persona.name}</span>
                          </p>
                          <p className="text-slate-200 leading-normal font-sans text-[10px] font-normal">
                            {persona.description}
                          </p>
                          {/* Triangle indicator */}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-slate-900 border-r border-b border-slate-800 rotate-45 -mt-1"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Conversations/Threads list */}
          <div className="flex-1 flex flex-col p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Chats</h2>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded">
                {threads.length}
              </span>
            </div>

            <div className="space-y-1.5 flex-1 pr-1">
              {threads.map((t) => {
                const isSelected = t.id === activeThreadId;
                const persona = PERSONAS[t.personaId];
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setActiveThreadId(t.id);
                      setMobileSidebarOpen(false);
                    }}
                    className={`
                      group p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all border
                      ${isSelected
                        ? "bg-indigo-50/70 border-indigo-200 font-semibold text-indigo-950 shadow-sm"
                        : "bg-white hover:bg-slate-50/80 border-slate-100 text-slate-600 hover:text-slate-800"
                      }
                    `}
                    id={`thread-select-${t.id}`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                      <span className="text-base shrink-0 select-none">{persona?.emoji || "✨"}</span>
                      <div className="overflow-hidden flex-1">
                        <p className="text-xs font-semibold truncate leading-tight">
                          {t.title}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          {persona?.name || "Assistant"} • {t.messages.length} messages
                        </p>
                      </div>
                    </div>
                    
                    {/* Delete chat option */}
                    <button
                      onClick={(e) => handleDeleteThread(t.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-all ml-1.5 shrink-0"
                      title="Terminate this logical chat"
                      id={`delete-btn-${t.id}`}
                    >
                      <Trash size={13} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 shrink-0">
              <button
                onClick={handleCreateNewThread}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-all shadow-md flex items-center justify-center gap-2"
                id="btn-create-new-thread"
              >
                <Plus size={14} />
                <span>New Chat</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Outer overlay when left rail is active in responsive mobile view */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 z-30 md:hidden"
            id="mobile-sidebar-overlay"
          ></div>
        )}

        {/* PANEL 2: Central chat workspace */}
        <section id="chat-center" className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative">
          
          {/* Conversation stream box */}
          <div
            className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            id="chat-messages-container"
          >
            {activeThread?.messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`} id={`message-${message.id}`}>
                  <div className={`flex gap-3 max-w-2xl ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                    
                    {/* Circle Avatar badge */}
                    <div className={`w-8 h-8 rounded-full border shrink-0 flex items-center justify-center font-bold text-xs select-none shadow-sm
                      ${isUser 
                        ? "bg-slate-900 border-slate-800 text-white" 
                        : "bg-white border-slate-200 text-indigo-600"
                      }
                    `}>
                      {isUser ? "U" : activePersona.emoji}
                    </div>

                    {/* Chat Bubble card container */}
                    <div className="flex flex-col space-y-1.5">
                      <div className={`p-4 md:p-5 rounded-2xl shadow-sm leading-relaxed relative
                        ${isUser 
                          ? "bg-indigo-600 text-white rounded-tr-none" 
                          : "bg-white border border-slate-200/90 text-slate-800 rounded-tl-none"
                        }
                      `}>
                        {/* Display User image or PDF document upload inside message bubble */}
                        {isUser && message.file && (
                          <div className="mb-3">
                            {message.file.mimeType === "application/pdf" ? (
                              <div className="flex items-center gap-3 px-4 py-3 bg-indigo-700/60 border border-indigo-400/40 rounded-xl max-w-sm text-white shrink-0 shadow-sm" id={`pdf-badge-${message.id}`}>
                                <div className="w-10 h-10 rounded-lg bg-rose-600 flex flex-col items-center justify-center font-bold text-[10px] shadow-md border border-rose-500 shrink-0">
                                  <span className="text-white">PDF</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold truncate text-white">{message.file.name}</p>
                                  <p className="text-[10px] text-indigo-200">Interactive PDF Document</p>
                                </div>
                              </div>
                            ) : message.file.mimeType.startsWith("image/") ? (
                              <div className="max-w-[200px] rounded-lg overflow-hidden border border-indigo-500 bg-slate-950 shadow-sm">
                                <img
                                  src={`data:${message.file.mimeType};base64,${message.file.data}`}
                                  alt="Multimodal User Prompt payload"
                                  className="w-full object-cover max-h-48"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 px-4 py-3 bg-indigo-700/60 border border-indigo-400/40 rounded-xl max-w-sm text-white shrink-0 shadow-sm">
                                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs shrink-0">
                                  DOC
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold truncate text-white">{message.file.name}</p>
                                  <p className="text-[10px] text-indigo-200">Attachment</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Fallback to legacy structure if file field not set but image field is present */}
                        {isUser && !message.file && message.image && (
                          <div className="mb-3 max-w-[200px] rounded-lg overflow-hidden border border-indigo-500 bg-slate-950">
                            <img
                              src={`data:${message.image.mimeType};base64,${message.image.data}`}
                              alt="Multimodal User Prompt payload"
                              className="w-full object-cover max-h-48"
                            />
                          </div>
                        )}

                        {/* Text formatting content block (with specialized lists / bold parsing / copy blocks) */}
                        <MessageContentRenderer text={message.text} isUser={isUser} />

                        {/* Render Google Search citations and sources */}
                        {!isUser && message.groundingMetadata?.groundingChunks && message.groundingMetadata.groundingChunks.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 flex items-center gap-1">
                              <Globe size={11} className="text-indigo-500" />
                              <span>Verified Search Sources</span>
                            </span>
                            <div className="flex flex-wrap gap-2 mt-1.5">
                              {message.groundingMetadata.groundingChunks.map((chunk, idx) => {
                                if (!chunk.web) return null;
                                return (
                                  <a
                                    key={idx}
                                    href={chunk.web.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    referrerPolicy="no-referrer"
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-[10px] text-indigo-600 hover:text-indigo-700 font-medium rounded-md transition-all shadow-sm"
                                    title={chunk.web.title}
                                  >
                                    <span className="max-w-[120px] truncate">{chunk.web.title || "Web Link"}</span>
                                    <span className="text-[8px] text-slate-400 font-mono">[{idx + 1}]</span>
                                  </a>
                                );
                              })}
                            </div>
                            {message.groundingMetadata.webSearchQueries && message.groundingMetadata.webSearchQueries.length > 0 && (
                              <div className="mt-2 text-[10px] text-slate-400 italic">
                                Search query formulated: "{message.groundingMetadata.webSearchQueries[0]}"
                              </div>
                            )}
                          </div>
                        )}

                        {message.error && (
                          <div className="mt-3 bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-lg text-xs leading-relaxed space-y-1">
                            <div className="flex items-center gap-1 text-rose-700 font-bold uppercase tracking-wider text-[10px]">
                              <AlertCircle size={12} />
                              <span>Initialization Anomaly</span>
                            </div>
                            <p>{message.error}</p>
                            <div className="pt-2 border-t border-rose-200 mt-2 text-[10px] text-rose-600 font-mono">
                              Suggestion: Ensure your Gemini Secret API key is active. Go to top-right Settings &gt; Secrets to configure `GEMINI_API_KEY`.
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Msg Timestamp */}
                      <span className={`text-[10px] text-slate-400 font-semibold select-none px-1 ${isUser ? "text-right" : "text-left"}`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                  </div>
                </div>
              );
            })}

            {/* Waiting/Typing simulated active process indicator */}
            {loading && (
              <div className="flex justify-start animate-fade-in" id="loading-spinner-wrapper">
                <div className="flex gap-3 max-w-2xl">
                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 text-indigo-600 font-bold text-xs shrink-0 flex items-center justify-center animate-spin">
                    🌀
                  </div>
                  <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2.5">
                    <Loader2 size={16} className="text-indigo-600 animate-spin" />
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                      {activePersona.name} is computing response ...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick interactive Starters / Suggested prompt cards inside chatbot input container */}
          {activeThread?.messages.length <= 1 && (
            <div className="px-6 md:px-10 py-3 bg-slate-50 border-t border-slate-100 animate-fade-in shrink-0" id="suggested-prompts-panel">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Sparkles size={11} className="text-indigo-500" />
                <span>Suggested topics for {activePersona.name}</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {activePersona.suggestedPrompts.map((promptText, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(promptText);
                      handleSend(promptText);
                    }}
                    className="p-3 bg-white border border-slate-200/80 hover:border-indigo-400 rounded-xl text-left text-xs font-semibold text-slate-700 hover:text-indigo-950 transition-all shadow-sm hover:shadow-md cursor-pointer"
                    id={`suggested-prompt-btn-${i}`}
                  >
                    {promptText}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bottom input area layout */}
          <div className="bg-white border-t border-slate-200/80 p-4 md:p-6 shrink-0 relative">
            
            {/* Show local file status if uploaded preview exists */}
            {fileAttachment && (
              <div className="absolute top-0 left-6 -translate-y-full bg-slate-900 text-white rounded-t-xl px-4 py-2 border border-slate-800 shadow-xl flex items-center gap-3 animate-fade-in-up" id="file-preview-badge">
                {fileAttachment.mimeType === "application/pdf" ? (
                  <div className="w-5 h-5 rounded bg-rose-600 text-[10px] flex items-center justify-center font-bold text-white shrink-0 shadow-sm border border-rose-500">
                    PDF
                  </div>
                ) : fileAttachment.mimeType.startsWith("image/") ? (
                  <img
                    src={`data:${fileAttachment.mimeType};base64,${fileAttachment.data}`}
                    alt="attachment-preview"
                    className="w-5 h-5 rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="w-5 h-5 rounded bg-slate-700 text-[10px] flex items-center justify-center font-bold text-white shrink-0">
                    DOC
                  </div>
                )}
                <span className="text-[10px] font-mono text-zinc-300 truncate max-w-[150px]">
                  📎 {fileAttachment.name}
                </span>
                <span className="text-[9px] bg-indigo-500 font-bold px-1.5 rounded uppercase">
                  Ready
                </span>
                <button
                  onClick={() => setFileAttachment(null)}
                  className="hover:text-rose-400 text-slate-400 p-0.5 rounded transition-all cursor-pointer"
                  title="Remove attachment"
                  id="remove-file-btn"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-3" id="input-chat-form">
              {/* File input attachment click area */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all shrink-0 cursor-pointer
                  ${fileAttachment 
                    ? "bg-indigo-50 text-indigo-600 border-indigo-200" 
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-700"
                  }
                `}
                title="Attach picture parameters or PDFs for analysis"
                id="file-attachment-trigger"
              >
                <Paperclip size={18} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,application/pdf"
                className="hidden"
                id="hidden-file-input"
              />

              {/* Google Search grounding toggle button */}
              <button
                onClick={() => setEnableSearch((prev) => !prev)}
                className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center border transition-all shrink-0 cursor-pointer
                  ${enableSearch 
                    ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200" 
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-400"
                  }
                `}
                title={enableSearch ? "Google Search grounding is active" : "Enable Google Search"}
                id="search-grounding-toggle"
              >
                <Globe size={16} className={enableSearch ? "text-emerald-600" : "text-slate-400"} />
                <span className="text-[9px] font-bold uppercase select-none leading-none mt-1 font-sans">
                  {enableSearch ? "Search" : "Off"}
                </span>
              </button>

              {/* Enter message text */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !loading) {
                      handleSend();
                    }
                  }}
                  disabled={loading}
                  placeholder={activePersona.placeholder}
                  className="w-full h-12 bg-slate-50 border border-slate-200 focus:border-indigo-400 hover:border-slate-300 rounded-xl px-5 pr-12 text-sm text-slate-900 dark:text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all leading-normal"
                  id="message-input-textbox"
                />

                <button
                  onClick={() => handleSend()}
                  disabled={loading || (!input.trim() && !fileAttachment)}
                  className={`absolute right-2 top-2 h-8 w-8 rounded-lg flex items-center justify-center transition-all
                    ${(input.trim() || fileAttachment) && !loading
                      ? "bg-indigo-600 text-white cursor-pointer hover:bg-indigo-700"
                      : "bg-slate-100 text-slate-300 cursor-not-allowed"
                    }
                  `}
                  title="Forward query to model"
                  id="btn-send-message"
                >
                  <SendHorizontal size={14} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 text-[10px] text-slate-400 font-semibold select-none px-1">
              <span>Press enter or click paper airplane widget to submit.</span>
              <span className="hidden sm:inline">Drag and drop images or PDFs onto this panel to inspect them.</span>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
