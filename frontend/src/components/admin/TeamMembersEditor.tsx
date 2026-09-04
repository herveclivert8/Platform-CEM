import { Plus, Trash2, User } from "lucide-react";
import type { TeamMemberInput } from "../../hooks/useAdminBranches";
import { ImageDropzone } from "./ImageDropzone";

interface TeamMembersEditorProps {
  members: TeamMemberInput[];
  onChange: (members: TeamMemberInput[]) => void;
}

export function TeamMembersEditor({ members, onChange }: TeamMembersEditorProps) {
  const update = (index: number, patch: Partial<TeamMemberInput>) => {
    onChange(members.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  const remove = (index: number) => {
    onChange(members.filter((_, i) => i !== index));
  };

  const add = () => {
    onChange([...members, { name: "", role: "" }]);
  };

  return (
    <div className="space-y-4">
      {members.map((member, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex items-start gap-3">
            <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
              <User className="h-4 w-4" aria-hidden />
            </span>
            <div className="grid flex-1 grid-cols-2 gap-2.5">
              <input
                value={member.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="Nom"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <input
                value={member.role}
                onChange={(e) => update(i, { role: e.target.value })}
                placeholder="Rôle"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Retirer ce membre"
              className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200 hover:text-red-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 pl-11">
            <ImageDropzone
              images={member.photo_url ? [member.photo_url] : []}
              onChange={(images) => update(i, { photo_url: images[0] })}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Ajouter un membre
      </button>
    </div>
  );
}
