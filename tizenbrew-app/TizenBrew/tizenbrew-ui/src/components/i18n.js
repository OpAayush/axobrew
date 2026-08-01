import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import resources from './i18nResources.js';

function initLanguage(lng) {
  i18n
    .use(initReactI18next)
    .init({
      lng,
      fallbackLng: 'en',
      resources,
      debug: false,
      interpolation: {
        escapeValue: false,
      }
    });
}

try {
  const savedLanguage = localStorage.getItem('language');
  if (savedLanguage) {
    initLanguage(savedLanguage);
  } else {
    tizen.systeminfo.getPropertyValue("LOCALE", function (locale) {
      initLanguage(locale.language.replace(/(\_.*)/g, ''));
    }, function (_) {
      initLanguage(navigator.language.replace(/(\-.*)/g, ''));
    });
  }
} catch (e) {
  initLanguage(navigator.language.replace(/(\-.*)/g, '_'));
}

export default i18n;
