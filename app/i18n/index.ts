import { createContext, useCallback, useContext, useEffect, useState } from "react";
import zhTW, { type TranslationKey } from "./locales/zh-TW";
import en from "./locales/en";

export type Locale = "zh-TW" | "en";

const locales: Record<Locale, Record<TranslationKey, string>> = {
  "zh-TW": zhTW,
  en,
};

const STORAGE_KEY = "pitch-shifter-locale";

/** 從瀏覽器語言偏好推斷最佳 locale */
export function detectLocale(): Locale {
  if (typeof navigator === "undefined") {
    return "zh-TW";
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && saved in locales) {
    return saved as Locale;
  }

  const languages = navigator.languages ?? [navigator.language];
  for (const lang of languages) {
    const lower = lang.toLowerCase();
    if (lower.startsWith("zh")) {
      return "zh-TW";
    }
  }

  return "en";
}

export function getHtmlLang(locale: Locale): string {
  return locale === "zh-TW" ? "zh-Hant-TW" : "en";
}

type TranslateFunction = (key: TranslationKey, params?: Record<string, string>) => string;

function createTranslate(locale: Locale): TranslateFunction {
  const messages = locales[locale];
  return (key, params) => {
    let text = messages[key] ?? zhTW[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replaceAll(`{{${k}}}`, v);
      }
    }
    return text;
  };
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: TranslateFunction;
}

export const I18nContext = createContext<I18nContextValue>({
  locale: "zh-TW",
  setLocale: () => {},
  t: createTranslate("zh-TW"),
});

export function useI18n() {
  return useContext(I18nContext);
}

export function useTranslation() {
  const { t } = useContext(I18nContext);
  return t;
}

/** 給 root.tsx 的 Layout 使用 */
export function useI18nState() {
  const [locale, setLocaleState] = useState<Locale>("zh-TW");

  useEffect(() => {
    setLocaleState(detectLocale());
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = createTranslate(locale);

  return { locale, setLocale, t };
}

export { type TranslationKey };
