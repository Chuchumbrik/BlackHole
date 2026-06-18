import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import ru from "./locales/ru.json";

function savedLang(): string {
  try {
    const v = localStorage.getItem("cbh:lang");
    if (v === "ru" || v === "en") return v;
  } catch {
    /* ignore */
  }
  return "ru";
}

void i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: savedLang(),
  fallbackLng: "ru",
  interpolation: { escapeValue: false },
});

export default i18n;
