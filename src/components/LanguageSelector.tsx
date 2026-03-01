// src/components/LanguageSelector.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { languages, Language } from '../i18n/languages';
import { Globe, Check } from 'lucide-react';

const LanguageSelector: React.FC = () => {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    // 目前選中的語言
    const currentCode = i18n.language || i18n.options.fallbackLng?.[0] || 'zh-TW';
    const selected = languages.find(l => l.code === currentCode) || languages[0];

    const handleChange = (lang: Language) => {
        i18n.changeLanguage(lang.code);
        localStorage.setItem('i18nextLng', lang.code);
        setIsOpen(false);
    };

    return (
        <div 
            className="relative"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            {/* 觸發按鈕 */}
            <button
                className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg
                    text-stone-300 hover:text-amber-400 transition-colors
                    font-medium text-sm
                `}
            >
                <Globe className="w-4 h-4" />
                <span>{selected.nativeName}</span>
            </button>

            {/* 展開選單 */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className={`
                            absolute right-0 mt-1 w-40 overflow-hidden
                            rounded-xl bg-stone-800 border border-stone-700
                            py-1 shadow-2xl z-50
                        `}
                    >
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => handleChange(lang)}
                                className={`
                                    w-full flex items-center justify-between px-4 py-2 text-sm
                                    transition-colors duration-150
                                    ${lang.code === selected.code 
                                        ? 'text-amber-400 bg-stone-700/50' 
                                        : 'text-stone-300 hover:bg-stone-700 hover:text-white'}
                                `}
                            >
                                <span>{lang.nativeName}</span>
                                {lang.code === selected.code && (
                                    <Check className="w-4 h-4" />
                                )}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LanguageSelector;
