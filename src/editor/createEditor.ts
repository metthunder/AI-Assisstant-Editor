// ai-editor/src/editor/createEditor.ts

import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { schema } from "prosemirror-schema-basic";
import { history, undo, redo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { DOMParser as PMDOMParser, Fragment } from "prosemirror-model";

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function createEditor(
  mount: HTMLDivElement,
  onChange: (text: string) => void
) {
  const state = EditorState.create({
    schema,
    plugins: [
      history(),
      keymap({
        "Mod-z": undo,
        "Mod-y": redo,
        "Mod-Shift-z": redo,
      }),
      keymap(baseKeymap),
    ],
  });

  let suppressChange = false;

  const view = new EditorView(mount, {
    state,
    dispatchTransaction(tr) {
      const newState = view.state.apply(tr);
      view.updateState(newState);
      if (!suppressChange) {
        onChange(newState.doc.textContent);
      }
    },
    attributes: {
      style: "outline: none;",
    },
  });

  function setText(text: string) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `<p>${escapeHtml(text)}</p>`;
    const doc = PMDOMParser.fromSchema(schema).parse(wrapper);

    const tr = view.state.tr.replaceWith(
      0,
      view.state.doc.content.size,
      doc.content as Fragment
    );

    suppressChange = true;
    view.dispatch(tr);
    suppressChange = false;
  }

  function runCommand(cmd: (state: any, dispatch?: any, viewArg?: any) => boolean) {
    try {
      return cmd(view.state, view.dispatch, view);
    } catch (e) {
      // swallow; commands should return boolean
      return false;
    }
  }

  return { view, setText, runCommand };
}