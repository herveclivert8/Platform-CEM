import { ImageDropzone } from "./ImageDropzone";
import { TeamMembersEditor } from "./TeamMembersEditor";
import type { TeamMemberInput } from "../../hooks/useAdminBranches";

interface BranchProfileFieldsProps {
  contactEmail: string;
  onContactEmailChange: (value: string) => void;
  contactPhone: string;
  onContactPhoneChange: (value: string) => void;
  logoUrl: string;
  onLogoUrlChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  teamMembers: TeamMemberInput[];
  onTeamMembersChange: (members: TeamMemberInput[]) => void;
}

/**
 * The "profile" section of a branch (as opposed to its core identity: name,
 * country, coordinates). Shared between BranchDrawer (Super Admin, creation)
 * and BranchEditPage/MyBranchPage (Super Admin edit / Branch Admin edit) so
 * every place this data can be entered looks and behaves identically.
 */
export function BranchProfileFields({
  contactEmail,
  onContactEmailChange,
  contactPhone,
  onContactPhoneChange,
  logoUrl,
  onLogoUrlChange,
  description,
  onDescriptionChange,
  teamMembers,
  onTeamMembersChange,
}: BranchProfileFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Email de contact</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => onContactEmailChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Téléphone</label>
          <input
            value={contactPhone}
            onChange={(e) => onContactPhoneChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Photo de profil</label>
        <ImageDropzone
          images={logoUrl ? [logoUrl] : []}
          onChange={(images) => onLogoUrlChange(images[0] ?? "")}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Résumé de l'antenne</label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={4}
          placeholder="Quelques phrases présentant cette antenne, son historique, son action locale…"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Équipe</label>
        <TeamMembersEditor members={teamMembers} onChange={onTeamMembersChange} />
      </div>
    </>
  );
}
