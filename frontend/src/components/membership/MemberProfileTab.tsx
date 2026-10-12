import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { PasswordInput } from "../ui/PasswordInput";
import { Field } from "../donation/donationUi";
import { fieldClass } from "../donation/donationConstants";
import { Panel } from "./memberUi";
import { useChangePassword } from "../../hooks/useAuth";
import { useSetMyAvatar, useUpdateMyProfile } from "../../hooks/useMembership";
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
            className="rounded-full"
            icon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {t(user.avatarUrl ? "member.profile.photo_change" : "member.profile.photo_add")}
          </Button>
          {user.avatarUrl && (
            <Button type="button" variant="ghost" className="rounded-full" icon={<Trash2 className="h-4 w-4" />} disabled={busy} onClick={() => setAvatar.mutate(null)}>
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
            <Button type="submit" variant="primary" className="rounded-full" disabled={updateProfile.isPending}>
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
            <Button type="submit" variant="secondary" className="rounded-full" disabled={changePassword.isPending}>
              {t("member.profile.change_password")}
            </Button>
            <Feedback ok={passwordSaved ? t("member.profile.password_saved") : null} error={passwordError} />
          </div>
        </form>
      </Panel>
    </div>
  );
}
