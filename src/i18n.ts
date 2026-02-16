import i18n from 'i18next';
import enTranslations from './locales/en.json';
import zhTranslations from './locales/zh.json';

// 检测浏览器语言或使用默认英语
const getDefaultLanguage = (): string => {
  const savedLanguage = localStorage.getItem('worldmonitor-language');
  if (savedLanguage && ['en', 'zh'].includes(savedLanguage)) {
    return savedLanguage;
  }

  const browserLanguage = navigator.language.toLowerCase();
  if (browserLanguage.startsWith('zh')) {
    return 'zh';
  }

  return 'en'; // 默认英语
};

i18n.init({
    resources: {
      en: {
        translation: enTranslations,
      },
      zh: {
        translation: zhTranslations,
      },
    },
    lng: getDefaultLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// 语言切换函数
export const changeLanguage = (lng: 'en' | 'zh'): void => {
  i18n.changeLanguage(lng);
  localStorage.setItem('worldmonitor-language', lng);
};

// 获取当前语言
export const getCurrentLanguage = (): string => {
  return i18n.language;
};

export default i18n;
