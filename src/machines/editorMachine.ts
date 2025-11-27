// ai-editor/src/machines/editorMachine.ts
import { createMachine, assign } from "xstate";

interface EditorContext {
  text: string;
  wordCount: number;
  charCount: number;
  history: string[];
  error: string | null;
  generatedText: string | null;
  typingIndex: number;
  isTyping: boolean;
}

type EditorEvent =
  | { type: "UPDATE"; text: string }
  | { type: "UPDATE_STATS"; wordCount: number; charCount: number }
  | { type: "CONTINUE" }
  | { type: "UNDO" }
  | { type: "CLEAR" }
  | { type: "RETRY" }
  | { type: "SAVE_HISTORY" }
  | { type: "TYPE_NEXT_CHAR" }
  | { type: "TYPING_COMPLETE" }
  | { type: "STOP_TYPING" };

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

export const editorMachine = createMachine(
  {
    id: "editor",
    initial: "idle",
    context: {
      text: "",
      wordCount: 0,
      charCount: 0,
      history: [],
      error: null,
      generatedText: null,
      typingIndex: 0,
      isTyping: false,
    } as EditorContext,
    states: {
      idle: {
        on: {
          UPDATE: {
            actions: "updateText",
          },
          UPDATE_STATS: {
            actions: "updateStats",
          },
          CONTINUE: {
            target: "loading",
            cond: "hasText",
          },
          UNDO: {
            actions: "undoText",
            cond: "hasHistory",
          },
          CLEAR: {
            actions: "clearText",
          },
          SAVE_HISTORY: {
            actions: "saveToHistory",
          },
        },
      },
      loading: {
        entry: "saveToHistory",
        invoke: {
          id: "continueWriter",
          src: "generateContinuation",
          onDone: {
            target: "typing",
            actions: "prepareTyping",
          },
          onError: {
            target: "error",
            actions: "setError",
          },
        },
      },
      typing: {
        entry: "startTyping",
        exit: "stopTyping",
        on: {
          TYPE_NEXT_CHAR: [
            {
              target: "idle",
              cond: "isTypingComplete",
              actions: "completeTyping",
            },
            {
              actions: "typeNextChar",
            },
          ],
          STOP_TYPING: {
            target: "idle",
            actions: "completeTypingImmediately",
          },
          CLEAR: {
            target: "idle",
            actions: "clearText",
          },
        },
      },
      error: {
        on: {
          RETRY: "loading",
          UPDATE: {
            target: "idle",
            actions: "updateText",
          },
          UPDATE_STATS: {
            actions: "updateStats",
          },
          CLEAR: {
            target: "idle",
            actions: "clearText",
          },
        },
      },
    },
  },
  {
    actions: {
      updateText: assign((ctx: EditorContext, evt: any) => {
        const text = evt.text || "";
        return {
          text,
          error: null,
        };
      }),
      updateStats: assign((ctx: EditorContext, evt: any) => ({
        wordCount: evt.wordCount || 0,
        charCount: evt.charCount || 0,
      })),
      saveToHistory: assign((ctx: EditorContext) => ({
        history: [...ctx.history.slice(-9), ctx.text],
      })),
      prepareTyping: assign((ctx: EditorContext, evt: any) => {
        const generatedText = evt.data || "";
        return {
          generatedText,
          typingIndex: 0,
          error: null,
        };
      }),
      startTyping: assign(() => ({
        isTyping: true,
      })),
      stopTyping: assign(() => ({
        isTyping: false,
      })),
      typeNextChar: assign((ctx: EditorContext) => {
        if (!ctx.generatedText) return {};
        
        const nextIndex = ctx.typingIndex + 1;
        const newText = ctx.text + ctx.generatedText.charAt(ctx.typingIndex);
        
        return {
          text: newText,
          typingIndex: nextIndex,
          wordCount: newText.trim() ? newText.trim().split(/\s+/).length : 0,
          charCount: newText.length,
        };
      }),
      completeTyping: assign((ctx: EditorContext) => ({
        generatedText: null,
        typingIndex: 0,
        isTyping: false,
      })),
      completeTypingImmediately: assign((ctx: EditorContext) => {
        if (!ctx.generatedText) return { isTyping: false };
        
        const finalText = ctx.text + ctx.generatedText.slice(ctx.typingIndex);
        return {
          text: finalText,
          wordCount: finalText.trim() ? finalText.trim().split(/\s+/).length : 0,
          charCount: finalText.length,
          generatedText: null,
          typingIndex: 0,
          isTyping: false,
        };
      }),
      undoText: assign((ctx: EditorContext) => {
        const previousText = ctx.history[ctx.history.length - 1] || "";
        return {
          text: previousText,
          wordCount: previousText.trim()
            ? previousText.trim().split(/\s+/).length
            : 0,
          charCount: previousText.length,
          history: ctx.history.slice(0, -1),
        };
      }),
      clearText: assign(() => ({
        text: "",
        wordCount: 0,
        charCount: 0,
        error: null,
        generatedText: null,
        typingIndex: 0,
        isTyping: false,
      })),
      setError: assign((ctx: EditorContext, evt: any) => ({
        error: evt.data?.message || "An error occurred. Please try again.",
      })),
    },
    guards: {
      hasText: (ctx: EditorContext) => ctx.text.trim().length > 0,
      hasHistory: (ctx: EditorContext) => ctx.history.length > 0,
      isTypingComplete: (ctx: EditorContext) => {
        if (!ctx.generatedText) return true;
        return ctx.typingIndex >= ctx.generatedText.length;
      },
    },
    services: {
      generateContinuation: async (ctx: EditorContext) => {
        try {
          const response = await fetch(`${API_URL}/api/continue-writing`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: ctx.text,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to generate continuation");
          }

          const data = await response.json();
          return data.text;
        } catch (error: any) {
          console.error("API Error:", error);
          throw new Error(
            error.message || "Unable to connect to AI service. Please try again."
          );
        }
      },
    },
  } as any
);