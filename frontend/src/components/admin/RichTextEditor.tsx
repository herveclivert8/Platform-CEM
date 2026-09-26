import { useEffect, useRef } from "react";
import { Bold, Italic, List, Link2 } from "lucide-react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const TOOLBAR_ACTIONS = [
  { command: "bold", icon: Bold, labelKey: "admin.editor.bold" },
  { command: "italic", icon: Italic, labelKey: "admin.editor.italic" },
  { command: "insertUnorderedList", icon: List, labelKey: "admin.editor.bullets" },
];

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const { t } = useTranslation();
  const editorRef = useRef<HTMLDivElement>(null);

  // Only sync external -> DOM when the value actually diverges (e.g. loading an
  // existing post), never on every keystroke - that would reset the caret position.
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exec = (command: string) => {
    editorRef.current?.focus();
    document.execCommand(command);
    onChange(editorRef.current?.innerHTML ?? "");
  };

  const insertLink = () => {
    const url = window.prompt(t("admin.editor.link_prompt"));
    if (!url) return;
    exec("createLink");
    document.execCommand("createLink", false, url);
    onChange(editorRef.current?.innerHTML ?? "");
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-1 border-b border-slate-200 px-2 py-1.5 dark:border-slate-700">
        {TOOLBAR_ACTIONS.map((action) => (
          <button
            key={action.command}
            type="button"
            title={t(action.labelKey)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(action.command)}
            className={clsx(
              "inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white",
            )}
          >
            <action.icon className="h-3.5 w-3.5" aria-hidden />
          </button>
        ))}
        <button
          type="button"
          title={t("admin.editor.link")}
          onMouseDown={(e) => e.preventDefault()}
          onClick={insertLink}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
        >
          <Link2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className="prose-editor min-h-[160px] px-4 py-3 text-sm text-slate-700 outline-none dark:text-slate-100 [&_a]:text-emerald-600 dark:[&_a]:text-emerald-400 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 empty:before:text-slate-400 dark:empty:before:text-slate-500 empty:before:content-[attr(data-placeholder)]"
      />
    </div>
  );
}
