import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { Drawer } from "./Drawer";
import { ImageDropzone } from "./ImageDropzone";
import { DocumentDropzone } from "./DocumentDropzone";
import { Button } from "../ui/Button";
import { apiErrorMessage } from "../../lib/api";
import { useBranches } from "../../hooks/useBranches";
import { useCreatePublication, useUpdatePublication } from "../../hooks/useAdminPublications";
import { useAuthStore } from "../../store/authStore";
import type { AdminPublication } from "../../types/publication";
import { useSuccessToast } from "../../hooks/useSuccessToast";

interface PublicationDrawerProps {
  open: boolean;
  onClose: () => void;
  publication?: AdminPublication;
  /** Pre-selected branch for a new report (the back-office scope). */
  defaultBranchId?: number;
}

export function PublicationDrawer({ open, onClose, publication, defaultBranchId }: PublicationDrawerProps) {
  const { t } = useTranslation();
  return (
    <Drawer open={open} onClose={onClose} title={t(publication ? "admin.reports.edit" : "admin.reports.new")}>
      <PublicationForm key={publication?.id ?? "new"} publication={publication} defaultBranchId={defaultBranchId} onDone={onClose} />
    </Drawer>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white";
const labelClass = "mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400";

function PublicationForm({
  publication,
  defaultBranchId,
  onDone,
}: {
  publication?: AdminPublication;
  defaultBranchId?: number;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const showSuccess = useSuccessToast();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const { data: branches } = useBranches();

  const [branchId, setBranchId] = useState<number | undefined>(
    publication?.branchId ?? (isSuperAdmin ? defaultBranchId : (user?.branchId ?? undefined)),
  );
  const [title, setTitle] = useState(publication?.title ?? "");
  const [description, setDescription] = useState(publication?.description ?? "");
  const [fileUrl, setFileUrl] = useState(publication?.fileUrl ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(publication?.thumbnailUrl ?? "");

  const create = useCreatePublication();
  const update = useUpdatePublication(publication?.id);
  const mutation = publication ? update : create;
  const canSave = !!branchId && !!title.trim() && !!description.trim() && !!fileUrl;

  const save = async () => {
    const input = {
      title: title.trim(),
      description: description.trim(),
      file_url: fileUrl || null,
      thumbnail_url: thumbnailUrl || null,
      format: "pdf" as const,
    };
    try {
      if (publication) await update.mutateAsync(input);
      else if (branchId) await create.mutateAsync({ branchId, input });
      showSuccess(t(publication ? "admin.feedback.report_saved" : "admin.feedback.report_published"), input.title);
      onDone();
    } catch {
      // affiché sous le formulaire (mutation.isError)
    }
  };

  return (
    <div className="space-y-5">
      <p className="flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <Languages className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        {t("admin.reports.french_only")}
      </p>

      {isSuperAdmin && !publication && (
        <div>
          <label className={labelClass}>{t("admin.reports.field_branch")}</label>
          <select
            value={branchId ?? ""}
            onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : undefined)}
            className={inputClass}
          >
            <option value="">{t("admin.reports.choose_branch")}</option>
            {branches?.items.map((b) => (
              <option key={b.id} value={b.id}>
                {b.cityName}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className={labelClass}>{t("admin.reports.field_title")}</label>
        <input value={title} maxLength={255} onChange={(e) => setTitle(e.target.value)}
          placeholder={t("admin.reports.placeholder_title")} className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>{t("admin.reports.field_description")}</label>
        <textarea value={description} rows={3} onChange={(e) => setDescription(e.target.value)}
          placeholder={t("admin.reports.placeholder_description")} className={`${inputClass} resize-none`} />
      </div>

      <div>
        <label className={labelClass}>{t("admin.reports.field_file")}</label>
        <DocumentDropzone value={fileUrl} onChange={setFileUrl} />
      </div>

      <div>
        <label className={labelClass}>{t("admin.reports.field_cover")}</label>
        <ImageDropzone
          images={thumbnailUrl ? [thumbnailUrl] : []}
          // A single cover: a new upload replaces the current one
          onChange={(images) => setThumbnailUrl(images[images.length - 1] ?? "")}
        />
      </div>

      {mutation.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">{apiErrorMessage(mutation.error, t("admin.reports.save_error"))}</p>
      )}

      <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
        <Button variant="secondary" className="w-full justify-center" disabled={!canSave || mutation.isPending} onClick={save}>
          {mutation.isPending ? "…" : t(publication ? "admin.reports.save" : "admin.reports.publish")}
        </Button>
        {!fileUrl && <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">{t("admin.reports.file_required")}</p>}
      </div>
    </div>
  );
}
