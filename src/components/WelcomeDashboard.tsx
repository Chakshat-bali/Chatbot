import React from "react";
import { Sparkles, Zap, Paperclip, Globe, ChevronRight, ChevronLeft, X, Info } from "lucide-react";
import { PersonaId } from "../types";
import { PERSONAS } from "../personas";

interface WelcomeDashboardProps {
  activePersonaId: PersonaId;
  onPersonaChange: (pId: PersonaId) => void;
  autoRoute: boolean;
  onAutoRouteToggle: () => void;
  enableSearch: boolean;
  onSearchToggle: () => void;
  tourStep: number | null;
  setTourStep: (step: number | null) => void;
}

export function WelcomeDashboard({
  activePersonaId,
  onPersonaChange,
  autoRoute,
  onAutoRouteToggle,
  enableSearch,
  onSearchToggle,
  tourStep,
  setTourStep,
}: WelcomeDashboardProps) {
  const currentPersona = PERSONAS[activePersonaId];

  const tourSteps = [
    {
      title: "Agent Personas",
      description: "Synapse AI houses 4 specialized personalities. Aura helps with editing and summaries; Muse collaborates creatively; Compiler writes and debugs code; Athena mentors through philosophical inquiry. Click any agent in the sidebar to switch manual contexts.",
      highlightId: "left-rail",
      icon: <Sparkles className="w-5 h-5 text-indigo-500" />,
    },
    {
      title: "Smart Auto-Routing",
      description: "When active, Synapse AI auto-classifies the intent of your input query and routes it to the matching agent. For example, pasting Python code will auto-route to Compiler! Toggle Auto-Routing in the chat panel below.",
      highlightId: "auto-routing-toggle",
      icon: <Zap className="w-5 h-5 text-amber-500" />,
      action: (
        <button
          onClick={onAutoRouteToggle}
          className={`mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${autoRoute
              ? "bg-indigo-50 border-indigo-200 text-indigo-700"
              : "bg-slate-50 border-slate-200 text-slate-500"
            }`}
        >
          <Zap size={12} className={autoRoute ? "animate-pulse" : ""} />
          <span>Auto-Routing: {autoRoute ? "ACTIVE" : "INACTIVE"}</span>
        </button>
      ),
    },
    {
      title: "Document & Image Intelligence",
      description: "Click the paperclip button to upload PDF files or images (up to 5MB), or simply drag and drop them anywhere in the chat panel. You can ask queries, extract info, or request summaries directly.",
      highlightId: "file-attachment-trigger",
      icon: <Paperclip className="w-5 h-5 text-rose-500" />,
    },
    {
      title: "Google Search Grounding",
      description: "Toggle Google Search Grounding to let the model fetch live, real-time data from the web. Responses will include clickable, verified citations and source titles at the bottom.",
      highlightId: "search-grounding-toggle",
      icon: <Globe className="w-5 h-5 text-emerald-500" />,
      action: (
        <button
          onClick={onSearchToggle}
          className={`mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${enableSearch
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-slate-50 border-slate-200 text-slate-500"
            }`}
        >
          <Globe size={12} />
          <span>Google Search: {enableSearch ? "ACTIVE" : "INACTIVE"}</span>
        </button>
      ),
    },
  ];

  const isTourActive = tourStep !== null;

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4 md:px-8 space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-12 -mt-12"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-slate-500/5 rounded-full blur-2xl -ml-8 -mb-8"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2.5 max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-linear-to-r from-white via-indigo-100 to-indigo-200 bg-clip-text text-transparent">
              Welcome to Synapse AI
            </h1>
            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
              Interact with specialized agents, analyze rich PDF documents or images, and leverage real-time web search grounding to accelerate your productivity.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 shrink-0">
            <button
              onClick={() => setTourStep(0)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20 flex items-center gap-2 border border-indigo-400/20 cursor-pointer"
            >
              <Sparkles size={14} />
              <span>Take a Tour</span>
            </button>
            {isTourActive && (
              <button
                onClick={() => setTourStep(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-slate-700 cursor-pointer"
              >
                <span>Dismiss Tour</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Conditional: Tour Stepper Panel or Features Grid */}
      {isTourActive ? (
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-xl space-y-6 relative overflow-hidden animate-fade-in-up">
          {/* Accent decoration */}
          <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-100/80 border border-slate-200 shadow-sm shrink-0">
                {tourSteps[tourStep].icon}
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                  Walkthrough Step {tourStep + 1} of {tourSteps.length}
                </span>
                <h3 className="text-base font-bold text-slate-800 mt-0.5">
                  {tourSteps[tourStep].title}
                </h3>
              </div>
            </div>
            <button
              onClick={() => setTourStep(null)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              title="Close tour walkthrough"
            >
              <X size={18} />
            </button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed max-w-2xl font-medium">
            {tourSteps[tourStep].description}
          </p>

          {tourSteps[tourStep].action && (
            <div className="pt-1">{tourSteps[tourStep].action}</div>
          )}

          {/* Stepper Progress Bar */}
          <div className="pt-2">
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
              {tourSteps.map((_, idx) => (
                <div
                  key={idx}
                  className={`flex-1 h-full transition-all duration-300 border-r border-white last:border-r-0 ${idx <= tourStep ? "bg-indigo-600" : "bg-slate-200/80"
                    }`}
                ></div>
              ))}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setTourStep(tourStep > 0 ? tourStep - 1 : null)}
              disabled={tourStep === 0}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${tourStep === 0
                  ? "text-slate-300 cursor-not-allowed"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                }`}
            >
              <ChevronLeft size={14} />
              <span>Back</span>
            </button>

            {tourStep < tourSteps.length - 1 ? (
              <button
                onClick={() => setTourStep(tourStep + 1)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-md flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={() => setTourStep(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-all shadow-md flex items-center gap-1 cursor-pointer"
              >
                <span>Finish Tour</span>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Features Showcase Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Agent Switching */}
          <div className="bg-white hover:bg-slate-50/50 border border-slate-200/80 hover:border-slate-300 rounded-2xl p-5 shadow-sm transition-all group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-600 shadow-sm shrink-0">
                ✨
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-xs">4 Custom AI Personalities</h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Aura, Muse, Compiler, Athena</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              Toggle between specialized agents in the sidebar. Click their <strong className="text-slate-700">Info (i)</strong> button to see details about system commands and expertise targets.
            </p>
            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">Current Agent: {currentPersona.emoji} {currentPersona.name}</span>
            </div>
          </div>

          {/* Card 2: Auto-routing */}
          <div className="bg-white hover:bg-slate-50/50 border border-slate-200/80 hover:border-slate-300 rounded-2xl p-5 shadow-sm transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-sm shrink-0">
                  <Zap size={16} className={autoRoute ? "animate-pulse text-amber-500" : ""} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-xs">Smart Auto-Routing</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Intelligent Agent Dispatcher</p>
                </div>
              </div>
              {/* Inline Toggle switch */}
              <button
                onClick={onAutoRouteToggle}
                className={`w-10 h-5 rounded-full p-0.5 transition-colors relative cursor-pointer ${autoRoute ? "bg-indigo-600" : "bg-slate-300"
                  }`}
                title="Toggle Auto Routing"
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${autoRoute ? "translate-x-5" : "translate-x-0"
                    }`}
                ></div>
              </button>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              When active, inputs are pre-classified. If you write creative copy, Muse takes over. If you input standard questions, Aura replies. Fully seamless modality handling.
            </p>
          </div>

          {/* Card 3: Multimodal upload */}
          <div className="bg-white hover:bg-slate-50/50 border border-slate-200/80 hover:border-slate-300 rounded-2xl p-5 shadow-sm transition-all group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-sm shrink-0">
                <Paperclip size={16} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-xs">Document Intelligence</h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">PDF and Image Analysis</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              Analyze documents or photos instantly. Use the clip attachment widget or drop files directly on the workspace. Supports PDFs and images up to 5MB.
            </p>
          </div>

          {/* Card 4: Web search */}
          <div className="bg-white hover:bg-slate-50/50 border border-slate-200/80 hover:border-slate-300 rounded-2xl p-5 shadow-sm transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                  <Globe size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-xs">Live Web Grounding</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Google Search Integration</p>
                </div>
              </div>
              {/* Inline Toggle switch */}
              <button
                onClick={onSearchToggle}
                className={`w-10 h-5 rounded-full p-0.5 transition-colors relative cursor-pointer ${enableSearch ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                title="Toggle Web Search"
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${enableSearch ? "translate-x-5" : "translate-x-0"
                    }`}
                ></div>
              </button>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              Ground your queries in the latest web data. Toggle Google Search to fetch up-to-date reports, code libraries, or live event information. Citations are fully mapped.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
