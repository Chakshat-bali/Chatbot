import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

interface Props {
  text: string;
  isUser?: boolean;
}

export function MessageContentRenderer({ text, isUser }: Props) {
  if (!text) return null;

  // Split by triple-backticks to separate code blocks from formatting text segments
  const codeParts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className={`space-y-4 leading-relaxed break-words font-sans text-sm md:text-[15px] ${isUser ? "text-white" : "text-slate-800"}`}>
      {codeParts.map((part, index) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          // Standard markdown code block extraction
          const content = part.slice(3, -3);
          const newlineIndex = content.indexOf("\n");
          let language = "code";
          let code = content;
          if (newlineIndex !== -1) {
            const langCandidate = content.substring(0, newlineIndex).trim();
            if (langCandidate.length > 0 && langCandidate.length < 15) {
              language = langCandidate;
              code = content.substring(newlineIndex + 1);
            }
          }

          return <CodeBlock key={`code-${index}`} code={code.trim()} language={language} />;
        } else {
          // Render structured text paragraphs, headers, tables, lists, and email components
          return <StructuredTextBlock key={`text-${index}`} rawText={part} isUser={isUser} />;
        }
      })}
    </div>
  );
}

// Subcomponent for Code Block with active user feedback on Copy action
function CodeBlock({ code, language }: { code: string; language: string; key?: React.Key }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Could not copy code to clipboard:", err);
    }
  };

  return (
    <div className="my-4 overflow-hidden rounded-xl bg-slate-900 border border-slate-800/80 shadow-lg font-mono text-[13px] text-zinc-100">
      <div className="flex items-center justify-between bg-slate-950/80 px-4 py-2 text-[11px] font-semibold text-slate-400 border-b border-slate-900 select-none">
        <span className="uppercase tracking-wider text-slate-300 font-mono">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 hover:text-white transition-colors py-1 px-2 rounded-md hover:bg-slate-800/80 cursor-pointer"
          title="Copy block to clipboard"
        >
          {copied ? (
            <>
              <Check size={13} className="text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto p-4 leading-relaxed font-mono">
        <pre><code className="block whitespace-pre">{code}</code></pre>
      </div>
    </div>
  );
}

interface Block {
  type: "header" | "blockquote" | "list" | "table" | "email" | "paragraph";
  level?: number;
  ordered?: boolean;
  items?: string[];
  headers?: string[];
  rows?: string[][];
  emailSubject?: string;
  emailTo?: string;
  emailBody?: string;
  text?: string;
}

// Helper to partition standard text paragraphs into structured logical blocks
function StructuredTextBlock({ rawText, isUser }: { rawText: string; isUser?: boolean; key?: React.Key }) {
  const lines = rawText.split("\n");
  const blocks: Block[] = [];

  let currentListType: "bullet" | "ordered" | null = null;
  let currentListItems: string[] = [];

  let currentTableRows: string[] = [];
  let currentBlockquoteLines: string[] = [];
  let currentParagraphLines: string[] = [];

  const flushList = () => {
    if (currentListType && currentListItems.length > 0) {
      blocks.push({
        type: "list",
        ordered: currentListType === "ordered",
        items: [...currentListItems]
      });
      currentListItems = [];
      currentListType = null;
    }
  };

  const flushTable = () => {
    if (currentTableRows.length > 0) {
      // Clean and separate rows
      let cellRows = currentTableRows.map(line => {
        const rawParts = line.split("|");
        let parts = rawParts.map(p => p.trim());
        if (line.trim().startsWith("|")) {
          parts = parts.slice(1);
        }
        if (line.trim().endsWith("|")) {
          parts = parts.slice(0, -1);
        }
        return parts;
      });

      // Filter out divider alignment rows from markdown table
      cellRows = cellRows.filter(row => {
        if (row.length === 0) return false;
        const isDivider = row.every(cell => /^[:\-\s\+]+$/.test(cell));
        return !isDivider;
      });

      if (cellRows.length > 0) {
        const headers = cellRows[0];
        const rows = cellRows.slice(1);
        blocks.push({
          type: "table",
          headers,
          rows
        });
      }
      currentTableRows = [];
    }
  };

  const flushBlockquote = () => {
    if (currentBlockquoteLines.length > 0) {
      blocks.push({
        type: "blockquote",
        text: currentBlockquoteLines.join("\n")
      });
      currentBlockquoteLines = [];
    }
  };

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      const paragraphText = currentParagraphLines.join("\n").trim();
      if (paragraphText) {
        // Attempt to parse as nested email copy block
        const emailMatch = parseAsEmailIfApplicable(paragraphText);
        if (emailMatch) {
          blocks.push(emailMatch);
        } else {
          blocks.push({
            type: "paragraph",
            text: paragraphText
          });
        }
      }
      currentParagraphLines = [];
    }
  };

  const flushAll = () => {
    flushList();
    flushTable();
    flushBlockquote();
    flushParagraph();
  };

  // Heuristic algorithm to check if a block matches mail drafts
  function parseAsEmailIfApplicable(paragraphText: string): Block | null {
    const pLines = paragraphText.split("\n");
    let subjectLineIndex = -1;
    let toLineIndex = -1;

    for (let i = 0; i < Math.min(pLines.length, 4); i++) {
      const l = pLines[i].trim();
      if (/^subject\s*:/i.test(l)) {
        subjectLineIndex = i;
      }
      if (/^to\s*:/i.test(l)) {
        toLineIndex = i;
      }
    }

    if (subjectLineIndex !== -1) {
      const subject = pLines[subjectLineIndex].replace(/^subject\s*:/i, "").trim();
      const to = toLineIndex !== -1 ? pLines[toLineIndex].replace(/^to\s*:/i, "").trim() : "";
      
      const cleanBodyLines = pLines.filter((_, idx) => idx !== subjectLineIndex && idx !== toLineIndex);
      const bodyText = cleanBodyLines.join("\n").trim();

      return {
        type: "email",
        emailSubject: subject,
        emailTo: to || undefined,
        emailBody: bodyText
      };
    }

    const lowerText = paragraphText.toLowerCase().trim();
    const hasGreeting = lowerText.startsWith("dear ") || lowerText.startsWith("hi ") || lowerText.startsWith("hello ") || lowerText.startsWith("to whom it may concern");
    const hasSignoff = lowerText.includes("best regards") || lowerText.includes("sincerely") || lowerText.includes("warm regards") || lowerText.includes("kind regards") || lowerText.includes("thanks,") || lowerText.includes("thank you,");

    if (hasGreeting && hasSignoff && pLines.length > 3) {
      return {
        type: "email",
        emailSubject: "Draft Mail",
        emailBody: paragraphText
      };
    }

    return null;
  }

  // Scan lines sequentially
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Markdown Title Headers (# Header Block)
    if (/^#{1,6}\s+(.*)/.test(trimmed)) {
      flushAll();
      const match = trimmed.match(/^(#{1,6})\s+(.*)/);
      if (match) {
        const level = match[1].length;
        const headerText = match[2];
        blocks.push({
          type: "header",
          level,
          text: headerText
        });
      }
      continue;
    }

    // 2. Markdown Table Block
    const isTableRow = trimmed.startsWith("|") || trimmed.endsWith("|") || (trimmed.match(/\|/g) || []).length >= 2;
    if (isTableRow && trimmed.length > 1) {
      flushList();
      flushBlockquote();
      flushParagraph();
      currentTableRows.push(line);
      continue;
    } else {
      flushTable();
    }

    // 3. Blockquotes (> block)
    if (trimmed.startsWith(">")) {
      flushList();
      flushTable();
      flushParagraph();
      const blockQuoteContent = trimmed.slice(1).replace(/^\s/, "");
      currentBlockquoteLines.push(blockQuoteContent);
      continue;
    } else {
      flushBlockquote();
    }

    // 4. Bullet lists (*, -, +)
    const bulletMatch = trimmed.match(/^([-*+])\s+(.*)/);
    if (bulletMatch) {
      if (currentListType === "ordered") {
        flushList();
      }
      flushTable();
      flushBlockquote();
      flushParagraph();

      currentListType = "bullet";
      currentListItems.push(bulletMatch[2]);
      continue;
    }

    // 5. Ordered Numerical lists (1.)
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      if (currentListType === "bullet") {
        flushList();
      }
      flushTable();
      flushBlockquote();
      flushParagraph();

      currentListType = "ordered";
      currentListItems.push(numberedMatch[2]);
      continue;
    }

    // 6. Natural line or paragraph builders
    if (trimmed === "") {
      flushAll();
    } else {
      if (currentListType) {
        flushList();
      }
      currentParagraphLines.push(line);
    }
  }

  flushAll();

  // Draw blocks using matching HTML structures
  return (
    <div className="space-y-3.5 text-inherit">
      {blocks.map((block, bidx) => {
        switch (block.type) {
          case "header": {
            const level = block.level || 1;
            if (level === 1) {
              return (
                <h1 key={bidx} className={`text-lg md:text-xl font-extrabold font-sans tracking-tight pt-3 pb-1 border-b mb-2 mt-4 ${isUser ? "text-white border-white/20" : "text-slate-950 border-slate-100"}`}>
                  {renderInlineMarkdown(block.text || "", isUser)}
                </h1>
              );
            } else if (level === 2) {
              return (
                <h2 key={bidx} className={`text-base md:text-lg font-bold font-sans tracking-tight pt-2 pb-0.5 mt-3 mb-1.5 ${isUser ? "text-white" : "text-slate-900"}`}>
                  {renderInlineMarkdown(block.text || "", isUser)}
                </h2>
              );
            } else if (level === 3) {
              return (
                <h3 key={bidx} className={`text-[15px] md:text-base font-semibold mt-2.5 mb-1 ${isUser ? "text-slate-100" : "text-slate-800"}`}>
                  {renderInlineMarkdown(block.text || "", isUser)}
                </h3>
              );
            } else {
              return (
                <h4 key={bidx} className={`text-sm md:text-[15px] font-semibold mt-2 mb-1 ${isUser ? "text-slate-200" : "text-slate-700"}`}>
                  {renderInlineMarkdown(block.text || "", isUser)}
                </h4>
              );
            }
          }
          case "blockquote":
            return (
              <blockquote key={bidx} className={`pl-4 py-1.5 border-l-4 border-indigo-500 italic my-3 rounded-r-lg font-serif ${isUser ? "bg-white/10 text-slate-100" : "bg-indigo-50/60 text-slate-700"}`}>
                {block.text?.split("\n").map((line, lidx) => (
                  <p key={lidx}>{renderInlineMarkdown(line, isUser)}</p>
                ))}
              </blockquote>
            );
          case "list":
            if (block.ordered) {
              return (
                <ol key={bidx} className="list-decimal pl-6 my-2 space-y-1.5 text-inherit">
                  {block.items?.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {renderInlineMarkdown(item, isUser)}
                    </li>
                  ))}
                </ol>
              );
            } else {
              return (
                <ul key={bidx} className="list-disc pl-6 my-2 space-y-1.5 text-inherit">
                  {block.items?.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {renderInlineMarkdown(item, isUser)}
                    </li>
                  ))}
                </ul>
              );
            }
          case "table":
            return (
              <div key={bidx} className={`overflow-x-auto my-4 rounded-xl border shadow-sm ${isUser ? "border-white/20" : "border-slate-200"}`}>
                <table className={`min-w-full divide-y text-xs md:text-sm ${isUser ? "divide-white/10 text-white" : "divide-slate-200"}`}>
                  <thead className={isUser ? "bg-white/10" : "bg-slate-50"}>
                    <tr>
                      {block.headers?.map((header, hidx) => (
                        <th
                          key={hidx}
                          className={`px-4 py-2.5 text-left font-bold uppercase tracking-wider font-mono text-[11px] ${isUser ? "text-white" : "text-slate-700"}`}
                        >
                          {renderInlineMarkdown(header, isUser)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isUser ? "divide-white/10 bg-indigo-700/10" : "divide-slate-100 bg-white"}`}>
                    {block.rows?.map((row, ridx) => (
                      <tr
                        key={ridx}
                        className={`transition-colors ${isUser ? "hover:bg-white/5 odd:bg-indigo-600/5 even:bg-indigo-600/10" : "hover:bg-slate-50/50 odd:bg-white even:bg-slate-50/20"}`}
                      >
                        {row.map((cell, cidx) => (
                          <td key={cidx} className={`px-4 py-2 font-sans ${isUser ? "text-white" : "text-slate-800"}`}>
                            {renderInlineMarkdown(cell, isUser)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "email":
            return (
              <EmailPreviewBlock
                key={bidx}
                subject={block.emailSubject}
                to={block.emailTo}
                body={block.emailBody || ""}
              />
            );
          case "paragraph":
          default:
            return (
              <p key={bidx} className="my-1.5 leading-relaxed text-inherit font-sans text-[14.5px]">
                {renderInlineMarkdown(block.text || "", isUser)}
              </p>
            );
        }
      })}
    </div>
  );
}

// Dedicated beautifully crafted interactive Email client block
function EmailPreviewBlock({ 
  subject, 
  to, 
  body 
}: { 
  subject?: string; 
  to?: string; 
  body: string; 
  key?: React.Key;
}) {
  const [copied, setCopied] = useState(false);

  const fullEmailText = `${to ? `To: ${to}\n` : ""}${subject ? `Subject: ${subject}\n\n` : ""}${body}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullEmailText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Could not copy email copy:", err);
    }
  };

  return (
    <div className="my-5 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-md max-w-2xl mx-auto flex flex-col text-slate-800">
      {/* Top mail title Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-4 py-3 select-none">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
          </div>
          <span className="text-[10px] font-bold text-slate-500 font-mono tracking-wider ml-1.5">EMAIL DRAFT COMPOSER</span>
        </div>
        
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-600 text-[11px] font-semibold rounded-lg transition-all shadow-sm cursor-pointer"
        >
          {copied ? (
            <>
              <Check size={11} className="text-emerald-500" />
              <span className="text-emerald-500 font-bold">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              <span>Copy Email text</span>
            </>
          )}
        </button>
      </div>

      {/* Address fields */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/30 text-xs text-slate-500 space-y-2">
        {to && (
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase w-14 text-slate-400">To:</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold">{to}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="font-bold uppercase w-14 text-slate-400">Subject:</span>
          <span className="text-slate-900 font-bold font-sans text-xs md:text-sm">{subject || "(No Subject)"}</span>
        </div>
      </div>

      {/* Actual mail message body */}
      <div className="p-5 font-sans text-sm text-slate-800 bg-white leading-relaxed space-y-3">
        {body.split("\n\n").map((para, pidx) => (
          <p key={pidx} className="my-1 text-slate-800 leading-relaxed font-sans text-[14px]">
            {para.split("\n").map((line, lidx) => (
              <React.Fragment key={lidx}>
                {lidx > 0 && <br />}
                {renderInlineMarkdown(line)}
              </React.Fragment>
            ))}
          </p>
        ))}
      </div>
    </div>
  );
}

// Basic styling of inline elements like bold, italic, links, and code highlights
function renderInlineMarkdown(text: string, isUser?: boolean): React.ReactNode[] {
  if (!text) return [];

  // Match:
  // 1. **bold** or __bold__ => /(\*\*.*?\*\*|__.*?__)/
  // 2. Inline `code` value => /(`.*?`)/
  // 3. Markdowns links e.g. [label](url) => /(\[.*?\]\(.*?\))/
  const regex = /(\*\*.*?\*\*|__.*?__|`.*?`|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    // 1. Bold text parsing
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      const stripped = part.slice(2, -2);
      return (
        <strong key={index} className={`font-extrabold ${isUser ? "text-white" : "text-slate-950"}`}>
          {renderInlineMarkdown(stripped, isUser)}
        </strong>
      );
    }
    
    // 2. Code highlight parsing
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className={`mx-1 px-1.5 py-0.5 rounded font-semibold font-mono text-[12px] border ${isUser ? "bg-white/15 text-white border-white/20" : "bg-slate-100 text-indigo-600 border-slate-200/40"}`}
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // 3. Link parsing format [label](url)
    if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
      const closingBracketIndex = part.indexOf("](");
      if (closingBracketIndex !== -1) {
        const label = part.substring(1, closingBracketIndex);
        const url = part.substring(closingBracketIndex + 2, part.length - 1);
        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            className={`underline font-semibold transition-colors inline ${isUser ? "text-indigo-200 hover:text-white decoration-indigo-300/45" : "text-indigo-600 hover:text-indigo-800 decoration-indigo-400/45 hover:decoration-indigo-700"}`}
          >
            {label}
          </a>
        );
      }
    }

    // Fallback: Check for simple italics parsing (*text* or _text_)
    const italicRegex = /(\*.*?\*|_.*?_)/g;
    if (italicRegex.test(part)) {
      const italicParts = part.split(italicRegex);
      return (
        <React.Fragment key={index}>
          {italicParts.map((subPart, subIdx) => {
            if ((subPart.startsWith("*") && subPart.endsWith("*")) || (subPart.startsWith("_") && subPart.endsWith("_"))) {
              return (
                <em key={subIdx} className={`italic ${isUser ? "text-white" : "text-slate-900"}`}>
                  {subPart.slice(1, -1)}
                </em>
              );
            }
            return subPart;
          })}
        </React.Fragment>
      );
    }

    return part;
  });
}
