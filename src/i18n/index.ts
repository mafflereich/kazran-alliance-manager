import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

// 開發環境直接用 import，生產環境建議用 http-backend 非同步載入
import zhTWCommon from './locales/zh-TW/common.json';
import enCommon from './locales/en/common.json';
const savedLng = localStorage.getItem('i18nextLng') || 'zh-TW';

i18n
    .use(initReactI18next)           // 綁定 react
    .use(LanguageDetector)           // 自動偵測語言
    .use(HttpBackend)                // 非同步載入 json（生產推薦）
    .init({
        fallbackLng: 'zh-TW',          // 預設語言
        supportedLngs: ['zh-TW', 'en'], // 支援的語言

        // 開發環境直接載入（熱重載方便）
        resources: {
            'zh-TW': {
                common: zhTWCommon,
            },
            en: {
                common: enCommon,
            },
        },

        // 生產環境改用 http-backend 從 public/locales 載入
        // backend: {
        //   loadPath: '/locales/{{lng}}/{{ns}}.json',
        // },

        ns: ['common'],                 // 命名空間（可多個）
        defaultNS: 'common',

        interpolation: {
            escapeValue: false,           // React 已自動 escape
        },

        debug: import.meta.env.DEV,     // 開發模式開 debug
    });

export default i18n;