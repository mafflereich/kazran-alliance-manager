import React from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ScoreCalculator from '../components/ScoreCalculator';
import { Wrench } from 'lucide-react';

const Toolbox: React.FC = () => {
  const { t } = useTranslation(['toolbox', 'translation']);

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-900 flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
            <Wrench className="w-8 h-8 text-amber-600 dark:text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-stone-800 dark:text-stone-100">
              {t('toolbox:title', '小工具')}
            </h1>
            <p className="text-stone-500 dark:text-stone-400 mt-1">
              {t('toolbox:subtitle', '各種實用的輔助工具')}
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-start justify-center">
          <div className="w-full max-w-md">
            <ScoreCalculator label="(舊)" enableDefenseScore={true} />
          </div>
          <div className="w-full max-w-md">
            <ScoreCalculator label="(新)" />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Toolbox;
