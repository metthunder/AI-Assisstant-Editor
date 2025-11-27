// FILE 1: ai-editor/src/editor/createEditor.ts

import { EditorState, Plugin, TextSelection } from "prosemirror-state";
import { EditorView, Decoration, DecorationSet } from "prosemirror-view";
import { Schema, DOMParser as PMDOMParser, Fragment, Node as PMNode } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";
import { history, undo, redo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { baseKeymap, toggleMark, setBlockType, joinUp, joinDown, lift, selectParentNode } from "prosemirror-commands";
import { wrapInList, splitListItem, liftListItem, sinkListItem } from "prosemirror-schema-list";

// Enhanced schema with list support
const mySchema = new Schema({
  nodes: addListNodes(basicSchema.spec.nodes as any, "paragraph block*", "block"),
  marks: basicSchema.spec.marks,
});

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Placeholder plugin using decorations (proper ProseMirror way)
function placeholderPlugin(text: string) {
  return new Plugin({
    props: {
      decorations(state) {
        const doc = state.doc;
        if (
          doc.childCount === 1 &&
          doc.firstChild?.isTextblock &&
          doc.firstChild.content.size === 0
        ) {
          const decoration = Decoration.widget(1, () => {
            const placeholder = document.createElement("span");
            placeholder.className = "placeholder";
            placeholder.textContent = text;
            return placeholder;
          }, { side: -1 });
          
          return DecorationSet.create(doc, [decoration]);
        }
        return DecorationSet.empty;
      },
    },
  });
}

// Stats tracking plugin
function statsPlugin(onUpdate: (words: number, chars: number) => void) {
  return new Plugin({
    view() {
      return {
        update(view) {
          const text = view.state.doc.textContent;
          const words = text.trim() ? text.trim().split(/\s+/).length : 0;
          const chars = text.length;
          onUpdate(words, chars);
        },
      };
    },
  });
}

// Build proper keymap for all shortcuts
function buildKeymap(schema: Schema) {
  const keys: { [key: string]: any } = {};
  
  // History
  keys["Mod-z"] = undo;
  keys["Mod-y"] = redo;
  keys["Shift-Mod-z"] = redo;
  
  // Marks
  if (schema.marks.strong) {
    keys["Mod-b"] = toggleMark(schema.marks.strong);
  }
  if (schema.marks.em) {
    keys["Mod-i"] = toggleMark(schema.marks.em);
  }
  if (schema.marks.code) {
    keys["Mod-`"] = toggleMark(schema.marks.code);
  }
  
  // Lists
  if (schema.nodes.bullet_list) {
    keys["Shift-Ctrl-8"] = wrapInList(schema.nodes.bullet_list);
  }
  if (schema.nodes.ordered_list) {
    keys["Shift-Ctrl-9"] = wrapInList(schema.nodes.ordered_list);
  }
  if (schema.nodes.list_item) {
    keys["Enter"] = splitListItem(schema.nodes.list_item);
    keys["Mod-["] = liftListItem(schema.nodes.list_item);
    keys["Mod-]"] = sinkListItem(schema.nodes.list_item);
  }
  
  // Headings
  if (schema.nodes.heading) {
    for (let i = 1; i <= 6; i++) {
      keys[`Shift-Ctrl-${i}`] = setBlockType(schema.nodes.heading, { level: i });
    }
  }
  
  // Navigation
  keys["Mod-Enter"] = (state: any, dispatch: any) => {
    if (dispatch) {
      const { $from } = state.selection;
      const type = state.schema.nodes.paragraph;
      if (type) {
        const tr = state.tr.replaceWith(
          $from.after(),
          $from.after(),
          type.createAndFill()
        );
        tr.setSelection(TextSelection.create(tr.doc, $from.after() + 1));
        dispatch(tr);
      }
    }
    return true;
  };
  
  keys["Alt-ArrowUp"] = joinUp;
  keys["Alt-ArrowDown"] = joinDown;
  keys["Mod-BracketLeft"] = lift;
  keys["Escape"] = selectParentNode;
  
  return keymap(keys);
}

export function createEditor(
  mount: HTMLDivElement,
  onChange: (text: string) => void,
  onStatsUpdate?: (words: number, chars: number) => void
) {
  const state = EditorState.create({
    schema: mySchema,
    plugins: [
      history(),
      buildKeymap(mySchema),
      keymap(baseKeymap),
      placeholderPlugin("Start typing or click 'Continue Writing' to let AI help..."),
      ...(onStatsUpdate ? [statsPlugin(onStatsUpdate)] : []),
    ],
  });

  let suppressChange = false;

  const view = new EditorView(mount, {
    state,
    dispatchTransaction(tr) {
      const newState = view.state.apply(tr);
      view.updateState(newState);
      if (!suppressChange && tr.docChanged) {
        onChange(newState.doc.textContent);
      }
    },
    attributes: {
      style: "outline: none; padding: 16px; line-height: 1.6;",
    },
  });

  function setText(text: string) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `<p>${escapeHtml(text)}</p>`;
    const doc = PMDOMParser.fromSchema(mySchema).parse(wrapper);

    const tr = view.state.tr.replaceWith(
      0,
      view.state.doc.content.size,
      doc.content as Fragment
    );

    suppressChange = true;
    view.dispatch(tr);
    suppressChange = false;
  }

  function runCommand(cmd: (state: any, dispatch?: any, view?: any) => boolean) {
    try {
      return cmd(view.state, view.dispatch, view);
    } catch (e) {
      return false;
    }
  }

  function getSchema() {
    return mySchema;
  }
  
  function getView() {
    return view;
  }

  return { view, setText, runCommand, getSchema, getView };
}