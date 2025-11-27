// ai-editor/src/components/editor.tsx
import { useEffect, useRef, useState } from "react";
import { useMachine } from "@xstate/react";
import { editorMachine } from "../machines/editorMachine";
import { createEditor } from "../editor/createEditor";
import { toggleMark, setBlockType, wrapIn } from "prosemirror-commands";
import { wrapInList } from "prosemirror-schema-list";
import { undo, redo } from "prosemirror-history";

export default function Editor() {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const editorApiRef = useRef<{ 
    view: any; 
    setText: (t: string) => void; 
    runCommand?: (c: any) => boolean;
    getSchema?: () => any;
    getView?: () => any;
  } | null>(null);

  const [state, send] = useMachine(editorMachine);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize ProseMirror
  useEffect(() => {
    if (editorRef.current && !editorApiRef.current) {
      editorApiRef.current = createEditor(
        editorRef.current, 
        (text) => {
          // Only update if not currently typing (to prevent feedback loop)
          if (!(state.context as any).isTyping) {
            send({ type: "UPDATE", text });
          }
        },
        (words, chars) => {
          send({ type: "UPDATE_STATS", wordCount: words, charCount: chars });
        }
      ) as any;
    }
  }, [send]);

  // Handle typing animation
  useEffect(() => {
    if (state.matches("typing")) {
      // Clear any existing interval
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }

      // Start typing animation
      typingIntervalRef.current = setInterval(() => {
        send({ type: "TYPE_NEXT_CHAR" });
      }, 30); // Type one character every 30ms (adjustable for speed)

      return () => {
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
      };
    }
  }, [state.value, send]);

  // When context text changes, update editor
  useEffect(() => {
    if (!editorApiRef.current) return;
    const { setText } = editorApiRef.current;
    setText((state.context as any).text);
  }, [(state.context as any).text]);

  const runMark = (markName: "strong" | "em" | "code") => {
    if (!editorApiRef.current?.runCommand || !editorApiRef.current?.getSchema) return;
    const schema = editorApiRef.current.getSchema();
    const mark = schema.marks[markName];
    if (!mark) return;
    const cmd = toggleMark(mark);
    editorApiRef.current.runCommand(cmd);
  };

  const setHeading = (level: number) => {
    if (!editorApiRef.current?.runCommand || !editorApiRef.current?.getSchema) return;
    const schema = editorApiRef.current.getSchema();
    const headingType = schema.nodes.heading;
    if (!headingType) return;
    const cmd = setBlockType(headingType, { level });
    editorApiRef.current.runCommand(cmd);
    setShowFormatMenu(false);
  };

  const setParagraph = () => {
    if (!editorApiRef.current?.runCommand || !editorApiRef.current?.getSchema) return;
    const schema = editorApiRef.current.getSchema();
    const paragraphType = schema.nodes.paragraph;
    if (!paragraphType) return;
    const cmd = setBlockType(paragraphType);
    editorApiRef.current.runCommand(cmd);
    setShowFormatMenu(false);
  };

  const toggleList = (listType: "bullet_list" | "ordered_list") => {
    if (!editorApiRef.current?.runCommand || !editorApiRef.current?.getSchema) return;
    const schema = editorApiRef.current.getSchema();
    const type = schema.nodes[listType];
    if (!type) return;
    const cmd = wrapInList(type);
    editorApiRef.current.runCommand(cmd);
  };

  const toggleBlockquote = () => {
    if (!editorApiRef.current?.runCommand || !editorApiRef.current?.getSchema) return;
    const schema = editorApiRef.current.getSchema();
    const blockquoteType = schema.nodes.blockquote;
    if (!blockquoteType) return;
    const cmd = wrapIn(blockquoteType);
    editorApiRef.current.runCommand(cmd);
  };

  const handleUndo = () => {
    if (!editorApiRef.current?.runCommand) return;
    editorApiRef.current.runCommand(undo);
  };

  const handleRedo = () => {
    if (!editorApiRef.current?.runCommand) return;
    editorApiRef.current.runCommand(redo);
  };

  const buttonStyle: React.CSSProperties = {
    padding: "8px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    background: "white",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 14,
    fontWeight: 500,
    color: "#334155",
    transition: "all 0.15s ease",
  };

  const iconButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    padding: "8px",
    minWidth: 36,
    justifyContent: "center",
  };

  const primaryButtonStyle: React.CSSProperties = {
    padding: "10px 18px",
    background: (state.matches("loading") || state.matches("typing"))
      ? "linear-gradient(135deg, #94a3b8, #64748b)"
      : "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: (state.matches("loading") || state.matches("typing")) ? "default" : "pointer",
    fontSize: 14,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 8,
    boxShadow: (state.matches("loading") || state.matches("typing"))
      ? "none"
      : "0 4px 12px rgba(99, 102, 241, 0.3)",
    transition: "all 0.2s ease",
  };

  return (
    <div style={{ 
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      maxWidth: 1200,
      margin: "0 auto",
      padding: 24,
    }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        marginBottom: 20,
      }}>
        <h1 style={{ 
          fontSize: 28, 
          fontWeight: 700, 
          color: "#0f172a",
          margin: 0,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          ✨ AI Text Editor
        </h1>
        
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ 
            padding: "8px 16px",
            background: "#f1f5f9",
            borderRadius: 8,
            fontSize: 13,
            color: "#475569",
          }}>
            <strong style={{ color: "#0f172a" }}>{(state.context as any).wordCount}</strong> words
            {" • "}
            <strong style={{ color: "#0f172a" }}>{(state.context as any).charCount}</strong> chars
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ 
        display: "flex", 
        flexWrap: "wrap",
        gap: 8,
        padding: 16,
        background: "#f8fafc",
        borderRadius: 12,
        marginBottom: 16,
        border: "1px solid #e2e8f0",
      }}>
        {/* Formatting group */}
        <div style={{ display: "flex", gap: 6, paddingRight: 12, borderRight: "1px solid #e2e8f0" }}>
          <button 
            onClick={() => runMark("strong")} 
            style={iconButtonStyle} 
            title="Bold (Cmd+B)"
            disabled={state.matches("typing")}
          >
            <strong>B</strong>
          </button>
          <button 
            onClick={() => runMark("em")} 
            style={iconButtonStyle} 
            title="Italic (Cmd+I)"
            disabled={state.matches("typing")}
          >
            <em>I</em>
          </button>
          <button 
            onClick={() => runMark("code")} 
            style={iconButtonStyle} 
            title="Code (Cmd+`)"
            disabled={state.matches("typing")}
          >
            <code style={{ fontSize: 12 }}>&lt;/&gt;</code>
          </button>
        </div>

        {/* Block formatting */}
        <div style={{ display: "flex", gap: 6, paddingRight: 12, borderRight: "1px solid #e2e8f0", position: "relative" }}>
          <button 
            onClick={() => setShowFormatMenu(!showFormatMenu)} 
            style={buttonStyle}
            disabled={state.matches("typing")}
          >
            Format ▾
          </button>
          
          {showFormatMenu && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: 4,
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
              zIndex: 100,
              minWidth: 180,
              overflow: "hidden",
            }}>
              <button 
                onClick={setParagraph} 
                style={{ 
                  ...buttonStyle, 
                  width: "100%", 
                  borderRadius: 0, 
                  border: "none", 
                  justifyContent: "flex-start",
                  borderBottom: "1px solid #f1f5f9"
                }}
              >
                Paragraph
              </button>
              <button 
                onClick={() => setHeading(1)} 
                style={{ 
                  ...buttonStyle, 
                  width: "100%", 
                  borderRadius: 0, 
                  border: "none", 
                  justifyContent: "flex-start",
                  borderBottom: "1px solid #f1f5f9"
                }}
              >
                <strong style={{ fontSize: 18 }}>Heading 1</strong>
              </button>
              <button 
                onClick={() => setHeading(2)} 
                style={{ 
                  ...buttonStyle, 
                  width: "100%", 
                  borderRadius: 0, 
                  border: "none", 
                  justifyContent: "flex-start"
                }}
              >
                <strong style={{ fontSize: 16 }}>Heading 2</strong>
              </button>
            </div>
          )}

          <button 
            onClick={() => toggleList("bullet_list")} 
            style={iconButtonStyle} 
            title="Bullet List (Shift+Ctrl+8)"
            disabled={state.matches("typing")}
          >
            •
          </button>
          <button 
            onClick={() => toggleList("ordered_list")} 
            style={iconButtonStyle} 
            title="Numbered List (Shift+Ctrl+9)"
            disabled={state.matches("typing")}
          >
            1.
          </button>
          <button 
            onClick={toggleBlockquote} 
            style={iconButtonStyle} 
            title="Quote"
            disabled={state.matches("typing")}
          >
            "
          </button>
        </div>

        {/* History group */}
        <div style={{ display: "flex", gap: 6, paddingRight: 12, borderRight: "1px solid #e2e8f0" }}>
          <button 
            onClick={handleUndo}
            style={iconButtonStyle}
            title="Undo (Cmd+Z)"
            disabled={state.matches("typing")}
          >
            ↶
          </button>
          <button 
            onClick={handleRedo}
            style={iconButtonStyle}
            title="Redo (Cmd+Y)"
            disabled={state.matches("typing")}
          >
            ↷
          </button>
          <button 
            onClick={() => send({ type: "CLEAR" })} 
            style={iconButtonStyle}
            title="Clear All"
          >
            ✕
          </button>
        </div>

        {/* AI Button */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {state.matches("typing") && (
            <button
              onClick={() => send({ type: "STOP_TYPING" })}
              style={{
                ...buttonStyle,
                background: "#fef3c7",
                border: "1px solid #fde047",
                color: "#854d0e",
              }}
            >
              ⏸ Skip Animation
            </button>
          )}
          <button
            onClick={() => send({ type: "CONTINUE" })}
            disabled={state.matches("loading") || state.matches("typing")}
            style={primaryButtonStyle}
          >
            {state.matches("loading") ? (
              <>
                <div style={{ 
                  width: 16, 
                  height: 16, 
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTop: "2px solid white",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }} />
                Thinking...
              </>
            ) : state.matches("typing") ? (
              <>
                <div style={{ 
                  width: 16, 
                  height: 16, 
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTop: "2px solid white",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }} />
                Typing...
              </>
            ) : (
              <>
                ✨ Continue Writing
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        style={{
          border: "1px solid #e2e8f0",
          minHeight: 400,
          borderRadius: 12,
          background: "white",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          fontSize: 16,
          color: "#1e293b",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      />

      {/* Footer */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        marginTop: 16, 
        alignItems: "center",
        padding: "12px 16px",
        background: "#f8fafc",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
      }}>
        <div>
          {state.matches("error") ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "#dc2626", display: "flex", alignItems: "center", gap: 6 }}>
                ⚠ {(state.context as any).error}
              </span>
              <button onClick={() => send({ type: "RETRY" })} style={{ ...buttonStyle, padding: "6px 12px" }}>
                Retry
              </button>
            </div>
          ) : state.matches("typing") ? (
            <span style={{ color: "#6366f1", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ 
                width: 12, 
                height: 12, 
                border: "2px solid #c7d2fe",
                borderTop: "2px solid #6366f1",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }} />
              AI is typing...
            </span>
          ) : (
            <span style={{ color: "#64748b", fontSize: 14 }}>
              ✓ Ready to assist • Shortcuts: Cmd+B (bold), Cmd+I (italic), Cmd+Z (undo)
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ color: "#94a3b8", fontSize: 13 }}>History:</span>
          {(state.context as any).history?.length ? (
            <div style={{ display: "flex", gap: 6 }}>
              {(state.context as any).history.slice(-3).reverse().map((h: string, idx: number) => (
                <button 
                  key={idx} 
                  onClick={() => send({ type: "UPDATE", text: h })} 
                  style={{ ...buttonStyle, padding: "6px 10px", fontSize: 13 }}
                  title={h.slice(0, 50) + "..."}
                  disabled={state.matches("typing")}
                >
                  ↶ {idx + 1}
                </button>
              ))}
            </div>
          ) : (
            <span style={{ color: "#cbd5e1", fontSize: 13 }}>None</span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .placeholder {
          color: #94a3b8;
          pointer-events: none;
          position: absolute;
          font-style: italic;
        }
        button:hover:not(:disabled) {
          background: #f1f5f9;
          transform: translateY(-1px);
        }
        button:active:not(:disabled) {
          transform: translateY(0);
        }
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .ProseMirror h1 {
          font-size: 2em;
          font-weight: 700;
          margin: 0.5em 0;
        }
        .ProseMirror h2 {
          font-size: 1.5em;
          font-weight: 600;
          margin: 0.5em 0;
        }
        .ProseMirror ul, .ProseMirror ol {
          padding-left: 30px;
          margin: 0.5em 0;
        }
        .ProseMirror blockquote {
          padding-left: 1em;
          border-left: 3px solid #e2e8f0;
          margin: 1em 0;
          font-style: italic;
          color: #64748b;
        }
        .ProseMirror code {
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 0.9em;
        }
      `}</style>
    </div>
  );
}