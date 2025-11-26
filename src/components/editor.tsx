// ai-editor/src/components/editor.tsx

import { useEffect, useRef } from "react";
import { useMachine } from "@xstate/react";
import { editorMachine } from "../machines/editorMachine";
import { createEditor } from "../editor/createEditor";
import { toggleMark } from "prosemirror-commands";
import { schema } from "prosemirror-schema-basic";

export default function Editor() {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const editorApiRef = useRef<{ view: any; setText: (t: string) => void; runCommand?: (c: any) => boolean } | null>(null);

  const [state, send] = useMachine(editorMachine);

  // Initialize ProseMirror
  useEffect(() => {
    if (editorRef.current) {
      editorApiRef.current = createEditor(editorRef.current, (text) => {
        send({ type: "UPDATE", text });
      }) as any;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [send]);

  // When AI updates the context text, programmatically set editor content
  useEffect(() => {
    if (!editorApiRef.current) return;

    const { setText } = editorApiRef.current;
    setText((state.context as any).text);
  }, [(state.context as any).text]);

  const runMark = (markName: "strong" | "em" | "code") => {
    if (!editorApiRef.current?.runCommand) return;
    const mark = (schema as any).marks[markName];
    if (!mark) return;
    const cmd = toggleMark(mark);
    editorApiRef.current.runCommand(cmd);
  };

  const statsStyle: React.CSSProperties = { marginLeft: 12, color: "#555" };

  return (
    <div style={{ fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => runMark("strong")} style={{ padding: "6px 10px" }}>Bold</button>
          <button onClick={() => runMark("em")} style={{ padding: "6px 10px" }}>Italic</button>
          <button onClick={() => runMark("code")} style={{ padding: "6px 10px" }}>Code</button>
          <button onClick={() => send({ type: "UNDO" })} style={{ padding: "6px 10px" }}>Undo</button>
          <button onClick={() => send({ type: "CLEAR" })} style={{ padding: "6px 10px" }}>Clear</button>
        </div>

        <div style={statsStyle}>
          <strong>{(state.context as any).wordCount}</strong> words • <strong>{(state.context as any).charCount}</strong> chars
        </div>

        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={() => send({ type: "CONTINUE" })}
            disabled={state.matches("loading")}
            style={{
              padding: "8px 14px",
              background: "linear-gradient(90deg,#6366f1,#06b6d4)",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: state.matches("loading") ? "default" : "pointer",
              opacity: state.matches("loading") ? 0.7 : 1,
            }}
          >
            {state.matches("loading") ? "Thinking..." : "Continue Writing"}
          </button>
        </div>
      </div>

      <div
        ref={editorRef}
        style={{
          border: "1px solid #e6e6ef",
          padding: "16px",
          minHeight: "260px",
          borderRadius: 10,
          background: "white",
          boxShadow: "0 6px 18px rgba(15,23,42,0.06)",
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, alignItems: "center" }}>
        <div style={{ color: "#666" }}>
          {state.matches("error") ? (
            <>
              <span style={{ color: "#c23" }}>Error: {(state.context as any).error}</span>
              <button onClick={() => send({ type: "RETRY" })} style={{ marginLeft: 10 }}>Retry</button>
            </>
          ) : (
            <span>AI generation ready</span>
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ color: "#888" }}>History:</div>
          {(state.context as any).history?.length ? (
            <div style={{ display: "flex", gap: 6 }}>
              {(state.context as any).history.slice().reverse().map((h: string, idx: number) => (
                <button key={idx} onClick={() => send({ type: "UPDATE", text: h })} style={{ padding: "4px 8px" }}>
                  Revert {idx + 1}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ color: "#bbb" }}>—</div>
          )}
        </div>
      </div>
    </div>
  );
}
