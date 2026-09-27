import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const SITE_NAME = "Club Excellence Madagascar";

function setMetaDescription(content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!tag) {
    tag = document.createElement("meta");
    tag.name = "description";
    document.head.appendChild(tag);
  }
  tag.content = content;
}

/**
 * Browser tab title and meta description of the current page (search engines that run JavaScript
 * read them; social-network previews are rendered server-side, see backend seo.py).
 * Pass `undefined` while data is loading: the previous values stay until it arrives.
 */
export function usePageMeta(title: string | undefined, description?: string | null) {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = i18n.language?.startsWith("en") ? "en" : "fr";
  }, [i18n.language]);

  useEffect(() => {
    if (title === undefined) return;
    document.title = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
    const text = (description ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    setMetaDescription((text || t("hero.subtitle")).slice(0, 200));
  }, [title, description, t]);
}
