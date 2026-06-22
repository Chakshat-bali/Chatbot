export interface MessagePart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // base64 encoded data
  };
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  image?: {
    data: string; // base64
    mimeType: string;
  };
  file?: {
    data: string; // base64
    mimeType: string;
    name: string;
  };
  timestamp: string;
  error?: string;
  isPending?: boolean;
  groundingMetadata?: {
    webSearchQueries?: string[];
    groundingChunks?: Array<{
      web?: {
        uri?: string;
        title?: string;
      };
    }>;
  };
}

export type PersonaId = "assistant" | "creative" | "developer" | "socratic";

export interface Persona {
  id: PersonaId;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  systemInstruction: string;
  placeholder: string;
  suggestedPrompts: string[];
  color: {
    bg: string;
    text: string;
    border: string;
    accent: string;
    bubbleUser: string;
    bubbleModel: string;
  };
}
