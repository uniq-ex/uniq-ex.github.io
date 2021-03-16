import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from './i18n/en'
import zh from './i18n/zh'
import jp from './i18n/jp'

let defaultLanguage = localStorage.getItem('language') || 'en'
const resources = {
  en: {
    translation: en
  },
  zh: {
    translation: zh
  },
  jp: {
    translation: jp
  }
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: defaultLanguage,

    keySeparator: false, // we do not use keys in form messages.welcome

    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

  export default i18n;