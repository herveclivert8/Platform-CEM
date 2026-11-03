import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Lock } from "lucide-react";
import { Button } from "../ui/Button";
import { HoneypotField } from "../ui/HoneypotField";
import { useCreateSupporterContact } from "../../hooks/useSupporterContacts";
import type { SupporterKind } from "../../config/membershipTypes";
import { apiErrorMessage } from "../../lib/api";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white";
const labelClass = "mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400";

/**
 * Benefactors and sponsors leave their details instead of creating an account: the association
 * contacts them. Only the Super Admin sees these records (many want to stay anonymous).
 */
export function SupporterContactForm({ kind, onCancel }: { kind: SupporterKind; onCancel: () => void }) {
  const { t } = useTranslation();
  const create = useCreateSupporterContact();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");

  if (create.isSuccess) {
    return (
      <p role="status" className="flex items-start gap-2 text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        {t("supporter_contact.success")}
      </p>
    );
  }

  return (
    <form
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate({ kind, fullName: fullName.trim(), email: email.trim(), phone: phone.trim(), message: message.trim(), website });
      }}
    >
      <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t(`supporter_contact.title_${kind}`)}</h2>
      <p className="mt-2 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
        {t("supporter_contact.intro")}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="supporter-name" className={labelClass}>{t("supporter_contact.full_name")}</label>
          <input id="supporter-name" required minLength={2} maxLength={200} autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="supporter-email" className={labelClass}>{t("supporter_contact.email")}</label>
          <input id="supporter-email" type="email" required maxLength={255} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="supporter-phone" className={labelClass}>{t("supporter_contact.phone")}</label>
          <input id="supporter-phone" type="tel" maxLength={50} autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="supporter-message" className={labelClass}>{t("supporter_contact.message")}</label>
          <textarea
            id="supporter-message"
            rows={4}
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("supporter_contact.message_placeholder")}
            className={inputClass}
          />
        </div>
      </div>
      <HoneypotField value={website} onChange={setWebsite} />

      {create.isError && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {apiErrorMessage(create.error, t("supporter_contact.error"))}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? t("supporter_contact.sending") : t("supporter_contact.submit")}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("supporter_contact.cancel")}
        </Button>
      </div>
    </form>
  );
}
