import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useAppContext } from '../store';

export default function Arcade() {
  const { t } = useTranslation('arcade');
  const { setCurrentView } = useAppContext();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button
        onClick={() => setCurrentView(null)}
        className="flex items-center gap-2 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        {t('back_to_login', '返回登入頁面')}
      </button>

      <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-6">{t('title')}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Placeholder for Refining Race */}
        <div className="bg-white dark:bg-stone-800 p-6 rounded-xl shadow-md border border-stone-200 dark:border-stone-700">
          <h2 className="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-2">{t('refining_race')}</h2>
          <p className="text-stone-600 dark:text-stone-400">{t('refining_race_desc')}</p>
        </div>
      </div>
    </div>
  );
}
