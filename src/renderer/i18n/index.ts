import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../../../shared/i18n/en.json';
import zh from '../../../shared/i18n/zh.json';

const savedLocale = localStorage.getItem('locale');
const browserLang = navigator.language.startsWith('zh') ? 'zh' : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: savedLocale || browserLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
