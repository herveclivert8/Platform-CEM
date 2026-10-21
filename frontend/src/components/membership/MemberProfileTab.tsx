import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Camera, Download, Loader2, Trash2 } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { PasswordInput } from "../ui/PasswordInput";
import { Field } from "../donation/donationUi";
import { fieldClass } from "../donation/donationConstants";
import { Panel } from "./memberUi";
import { useChangePassword } from "../../hooks/useAuth";
import { useDeleteMyAccount, useExportMyData, useSetMyAvatar, useUpdateMyProfile } from "../../hooks/useMembership";
import { api, apiErrorMessage } from "../../lib/api";
import type { CurrentUser } from "../../types/user";

function Feedback({ ok, error }: { ok?: string | null; error?: string | null }) {
  if (error) return <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>;
  if (ok) return <p role="status" className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{ok}</p>;
  return null;
}

/** Profile photo: pick an image (uploaded, then set as avatar), or remove the current one. */
function AvatarEditor({ user }: { user: CurrentUser }) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const setAvatar = useSetMyAvatar();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = uploading || setAvatar.isPending;

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      // Let the browser set the multipart boundary (the shared client defaults to JSON)
      const { data } = await api.post<{ url: string }>("/upload/image", formData, { headers: { "Content-Type": undefined } });
      await setAvatar.mutateAsync(data.url);
    } catch (err) {
      setError(apiErrorMessage(err, t("member.profile.photo_error")));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-6">
      <Avatar name={`${user.firstName} ${user.lastName}`} url={user.avatarUrl} size="lg" />
      <div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="primary"
            icon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {t(user.avatarUrl ? "member.profile.photo_change" : "member.profile.photo_add")}
          </Button>
          {user.avatarUrl && (
            <Button type="button" variant="ghost" icon={<Trash2 className="h-4 w-4" />} disabled={busy} onClick={() => setAvatar.mutate(null)}>
              {t("member.profile.photo_remove")}
            </Button>
          )}
        </div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("member.profile.photo_hint")}</p>
        {error && <p role="alert" className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      </div>
    </div>
  );
}

/** "Mon profil" tab: name and phone, then the password. Email and branch are shown, not editable. */
export function MemberProfileTab({ user, phone }: { user: CurrentUser; phone: string | null }) {
  const { t } = useTranslation();
  const updateProfile = useUpdateMyProfile();
  const changePassword = useChangePassword();
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [phoneValue, setPhoneValue] = useState(phone ?? "");
  const [profileSaved, setProfileSaved] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaved(false);
    updateProfile.mutate({ firstName, lastName, phone: phoneValue }, { onSuccess: () => setProfileSaved(true) });
  };

  const savePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaved(false);
    if (next !== confirm) {
      setPasswordError(t("auth.mismatch"));
      return;
    }
    setPasswordError(null);
    changePassword.mutate(
      { currentPassword: current, newPassword: next, confirmPassword: confirm },
      {
        onSuccess: () => {
          setPasswordSaved(true);
          setCurrent("");
          setNext("");
          setConfirm("");
        },
        onError: (err) => setPasswordError(apiErrorMessage(err, t("member.profile.password_error"))),
      },
    );
  };

  return (
    <div className="space-y-6">
      <Panel title={t("member.tabs.profile")}>
        <AvatarEditor user={user} />
        <form onSubmit={saveProfile} className="mt-8 grid gap-4 sm:grid-cols-2">
          <Field label={t("auth.last_name")} htmlFor="pf-last">
            <input id="pf-last" required maxLength={255} autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} className={fieldClass} />
          </Field>
          <Field label={t("auth.first_name")} htmlFor="pf-first">
            <input id="pf-first" required maxLength={255} autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={fieldClass} />
          </Field>
          <Field label={t("member.profile.phone")} htmlFor="pf-phone" optional>
            <input id="pf-phone" type="tel" maxLength={30} autoComplete="tel" value={phoneValue} onChange={(e) => setPhoneValue(e.target.value)} className={fieldClass} />
          </Field>
          <Field label={t("auth.email")} hint={t("member.profile.email_fixed")}>
            <p className="px-0.5 py-2.5 font-semibold text-slate-900 dark:text-white">{user.email}</p>
          </Field>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
            <Button type="submit" variant="primary" disabled={updateProfile.isPending}>
              {t("member.profile.save")}
            </Button>
            <Feedback
              ok={profileSaved ? t("member.profile.saved") : null}
              error={updateProfile.isError ? apiErrorMessage(updateProfile.error, t("member.profile.save_error")) : null}
            />
          </div>
        </form>
      </Panel>

      <Panel title={t("member.profile.password_title")}>
        <form onSubmit={savePassword} className="grid gap-4 sm:grid-cols-3">
          <Field label={t("member.profile.current_password")} htmlFor="pf-current">
            <PasswordInput id="pf-current" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={fieldClass} />
          </Field>
          <Field label={t("auth.new_password_min")} htmlFor="pf-new">
            <PasswordInput id="pf-new" required minLength={8} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={fieldClass} />
          </Field>
          <Field label={t("auth.confirm_password")} htmlFor="pf-confirm">
            <PasswordInput id="pf-confirm" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={fieldClass} />
          </Field>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-3">
            <Button type="submit" variant="secondary" disabled={changePassword.isPending}>
              {t("member.profile.change_password")}
            </Button>
            <Feedback ok={passwordSaved ? t("member.profile.password_saved") : null} error={passwordError} />
          </div>
        </form>
      </Panel>

      <MyDataPanel />
    </div>
  );
}

/** Personal data (privacy policy): download it, or delete the account. */
function MyDataPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const exportData = useExportMyData();
  const deleteAccount = useDeleteMyAccount();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [understood, setUnderstood] = useState(false);

  const submitDeletion = (e: React.FormEvent) => {
    e.preventDefault();
    deleteAccount.mutate(password, { onSuccess: () => navigate("/", { replace: true }) });
  };

  return (
    <Panel title={t("member.privacy.title")}>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {t("member.privacy.intro")}{" "}
        <Link to="/confidentialite" className="font-semibold underline underline-offset-2">
          {t("member.privacy.policy_link")}
        </Link>
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Button
          type="button"
          variant="secondary"
          icon={exportData.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          disabled={exportData.isPending}
          onClick={() => exportData.mutate()}
        >
          {t("member.privacy.export")}
        </Button>
        <Feedback error={exportData.isError ? apiErrorMessage(exportData.error, t("member.privacy.export_error")) : null} />
      </div>

      <div className="mt-8 border-t border-slate-200 pt-6 dark:border-white/10">
        <h3 className="font-semibold text-red-700 dark:text-red-300">{t("member.privacy.delete_title")}</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t("member.privacy.delete_text")}</p>
        {!confirming ? (
          <Button type="button" variant="ghost" className="mt-4 text-red-700 dark:text-red-300" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirming(true)}>
            {t("member.privacy.delete")}
          </Button>
        ) : (
          <form onSubmit={submitDeletion} className="mt-4 grid max-w-md gap-4">
            <Field label={t("member.profile.current_password")} htmlFor="pf-delete-password">
              <PasswordInput
                id="pf-delete-password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={fieldClass}
              />
            </Field>
            <label className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200">
              <input type="checkbox" required checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="mt-0.5 h-4 w-4" />
              {t("member.privacy.delete_confirm")}
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={deleteAccount.isPending || !understood}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteAccount.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("member.privacy.delete_final")}
              </button>
              <Button type="button" variant="ghost" onClick={() => { setConfirming(false); setPassword(""); setUnderstood(false); deleteAccount.reset(); }}>
                {t("common.cancel")}
              </Button>
            </div>
            <Feedback error={deleteAccount.isError ? apiErrorMessage(deleteAccount.error, t("member.privacy.delete_error")) : null} />
          </form>
        )}
      </div>
    </Panel>
  );
}
