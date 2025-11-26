// ai-editor/src/machines/editorMachine.ts

import { createMachine, assign } from "xstate";

interface EditorContext {
  text: string;
  wordCount: number;
  charCount: number;
  history: string[];
  error: string | null;
}

type EditorEvent =
  | { type: "UPDATE"; text: string }
  | { type: "CONTINUE" }
  | { type: "UNDO" }
  | { type: "CLEAR" }
  | { type: "RETRY" };

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
    } as EditorContext,
    states: {
      idle: {
        on: {
          UPDATE: {
            actions: "updateText",
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
        },
      },
      loading: {
        entry: "saveToHistory",
        invoke: {
          id: "continueWriter",
          src: "generateContinuation",
          onDone: {
            target: "idle",
            actions: "applyGeneration",
          },
          onError: {
            target: "error",
            actions: "setError",
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
          wordCount: text.trim() ? text.trim().split(/\s+/).length : 0,
          charCount: text.length,
          error: null,
        };
      }),
      saveToHistory: assign((ctx: EditorContext) => ({
        history: [...ctx.history.slice(-9), ctx.text],
      })),
      applyGeneration: assign((ctx: EditorContext, evt: any) => {
        const newText = evt.data || ctx.text;
        return {
          text: newText,
          wordCount: newText.trim() ? newText.trim().split(/\s+/).length : 0,
          charCount: newText.length,
          error: null,
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
      })),
      setError: assign((ctx: EditorContext, evt: any) => ({
        error: evt.data?.message || "An error occurred",
      })),
    },
    guards: {
      hasText: (ctx: EditorContext) => ctx.text.trim().length > 0,
      hasHistory: (ctx: EditorContext) => ctx.history.length > 0,
    },
    services: {
      generateContinuation: (ctx: EditorContext) =>
        new Promise<string>((resolve, reject) => {
          setTimeout(() => {
            if (Math.random() > 0.9) {
              reject(new Error("AI service temporarily unavailable"));
            } else {
              const continuations = [
                " Furthermore, this opens up new possibilities for innovation.",
                " In addition, the implications of this are far-reaching.",
                " This perspective reveals deeper insights into the matter.",
                " Building on this foundation, we can explore further dimensions.",
                " The evidence suggests a compelling narrative worth exploring.",
              ];
              const continuation =
                continuations[Math.floor(Math.random() * continuations.length)];
              resolve(ctx.text + continuation);
            }
          }, 1200);
        }),
    },
  } as any
);