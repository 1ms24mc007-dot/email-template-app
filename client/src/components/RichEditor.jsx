
import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { api } from "../api";

// Keep this component outside RichEditor.
// This prevents toolbar buttons from being recreated on every editor update.
function ToolbarButton({ label, title, on, run }) {
  return (
    <button
      type="button"
      title={title || label}
      aria-label={title || label}
      aria-pressed={Boolean(on)}
      className={on ? "on" : ""}
      onMouseDown={(e) => e.preventDefault()}
      onClick={run}
    >
      {label}
    </button>
  );
}

export default function RichEditor({ initial, onChange }) {
  const touched = useRef(false);
  const onChangeRef = useRef(onChange);

  const [defs, setDefs] = useState([]);

  // Always use the latest onChange callback.
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Load available global placeholders.
  useEffect(() => {
    api("/global/placeholders")
      .then((r) => {
        setDefs(Array.isArray(r.data) ? r.data : []);
      })
      .catch(() => setDefs([]));
  }, []);

  const ed = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        protocols: ["mailto"],
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],

    content: initial || "",

    editable: true,

    editorProps: {
  attributes: {
    spellcheck: "true",
    autocorrect: "on",
    autocapitalize: "sentences",
    "aria-label": "Email content editor",
  },

  handleKeyDown: (view, event) => {
    if (event.key === "Tab") {
      event.preventDefault();

      // Insert four non-breaking spaces at the cursor.
      view.dispatch(
        view.state.tr.insertText("\u00A0\u00A0\u00A0\u00A0")
      );

      return true;
    }

    return false;
  },
},

    onUpdate: ({ editor }) => {
      touched.current = true;

      onChangeRef.current?.(
        editor.getHTML(),
        editor.getText({ blockSeparator: "\n" })
      );
    },
  });

  // Support templates loaded asynchronously when editing.
  // Do not overwrite content once the administrator starts typing.
  useEffect(() => {
    if (!ed || touched.current) return;

    const content = initial || "";

    if (content !== ed.getHTML()) {
      ed.commands.setContent(content, false);
    }
  }, [initial, ed]);

  if (!ed) return null;

  const c = () => ed.chain().focus();

  // Link insertion.
  const addLink = () => {
    const url = window.prompt(
      "Enter link URL (https://, http:// or mailto:)"
    );

    if (url === null) return;

    if (!url.trim()) {
      c().unsetLink().run();
      return;
    }

    if (!/^(https?:\/\/|mailto:)/i.test(url.trim())) {
      window.alert(
        "Links must start with https://, http:// or mailto:"
      );
      return;
    }

    c().extendMarkRange("link").setLink({
      href: url.trim(),
    }).run();
  };

  // Insert a placeholder at the current editor cursor.
  const insertPlaceholder = (e) => {
    let key = e.target.value;

    e.target.value = "";

    if (key === "__new") {
      key = window.prompt(
        "Enter recipient-specific placeholder name (letters, numbers and underscores)"
      );
    }

    if (!key) return;

    key = key.trim();

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      window.alert("Invalid placeholder name.");
      return;
    }

    c().insertContent(`{{${key}}}`).run();
  };

  const changeStyle = (e) => {
    const value = e.target.value;

    if (!value) return;

    if (value === "paragraph") {
      c().setParagraph().run();
    } else {
      c().setHeading({
        level: Number(value),
      }).run();
    }

    e.target.value = "";
  };

  return (
    <div className="ed">

      {/* Main formatting toolbar */}
      <div className="tb">

        <div className="tb-main-row">

          {/* Text formatting */}
          <div className="tb-group">
            <ToolbarButton
              label="B"
              title="Bold"
              on={ed.isActive("bold")}
              run={() => c().toggleBold().run()}
            />

            <ToolbarButton
              label="I"
              title="Italic"
              on={ed.isActive("italic")}
              run={() => c().toggleItalic().run()}
            />

            <ToolbarButton
              label="U"
              title="Underline"
              on={ed.isActive("underline")}
              run={() => c().toggleUnderline().run()}
            />
          </div>

          {/* Text style */}
          <div className="tb-group">
            <select
              className="tb-style"
              defaultValue=""
              aria-label="Text style"
              onChange={changeStyle}
            >
              <option value="">Paragraph style</option>
              <option value="paragraph">Paragraph</option>
              <option value="1">Heading 1</option>
              <option value="2">Heading 2</option>
              <option value="3">Heading 3</option>
            </select>
          </div>

          {/* Text alignment */}
          <div className="tb-group">
            <ToolbarButton
              label="Left"
              title="Align left"
              on={ed.isActive({ textAlign: "left" })}
              run={() => c().setTextAlign("left").run()}
            />

            <ToolbarButton
              label="Center"
              title="Align center"
              on={ed.isActive({ textAlign: "center" })}
              run={() => c().setTextAlign("center").run()}
            />

            <ToolbarButton
              label="Right"
              title="Align right"
              on={ed.isActive({ textAlign: "right" })}
              run={() => c().setTextAlign("right").run()}
            />
          </div>

          {/* Lists */}
          <div className="tb-group">
            <ToolbarButton
              label="• List"
              title="Bulleted list"
              on={ed.isActive("bulletList")}
              run={() => c().toggleBulletList().run()}
            />

            <ToolbarButton
              label="1. List"
              title="Numbered list"
              on={ed.isActive("orderedList")}
              run={() => c().toggleOrderedList().run()}
            />
          </div>

          {/* Links and clear formatting */}
          <div className="tb-group tb-group-last">
            <ToolbarButton
              label="Link"
              title="Insert or edit link"
              on={ed.isActive("link")}
              run={addLink}
            />

            <ToolbarButton
              label="Clear"
              title="Clear formatting"
              run={() => c().unsetAllMarks().clearNodes().run()}
            />
          </div>

        </div>

        {/* Placeholder insertion */}
        <div className="tb-placeholder-row">
          <span className="tb-placeholder-label">
            Dynamic values
          </span>

          <select
            className="tb-placeholder"
            defaultValue=""
            aria-label="Insert placeholder"
            onChange={insertPlaceholder}
          >
            <option value="">+ Insert placeholder...</option>

            <optgroup label="API-driven">
              {defs
                .filter((d) => d.source_type === "api")
                .map((d) => (
                  <option key={d.id} value={d.placeholder_key}>
                    {`{{${d.placeholder_key}}}`}
                  </option>
                ))}
            </optgroup>

            <optgroup label="Manual global">
              {defs
                .filter((d) => d.source_type === "manual")
                .map((d) => (
                  <option key={d.id} value={d.placeholder_key}>
                    {`{{${d.placeholder_key}}}`}
                  </option>
                ))}
            </optgroup>

            <optgroup label="Recipient-specific">
              <option value="__new">
                Create recipient placeholder...
              </option>
            </optgroup>

          </select>
        </div>

      </div>

      {/* Actual writing area */}
      <EditorContent
        editor={ed}
        className="ed-body"
      />

    </div>
  );
}
