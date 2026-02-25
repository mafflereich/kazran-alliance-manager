import React from 'react';
import { useAppContext } from '../store';
import { Shield, Users, ChevronRight } from 'lucide-react';
import { getTierColor, getTierBorderHoverClass, getTierTextHoverClass } from '../utils';

export default function Login() {
  const { db, setCurrentView } = useAppContext();

  const handleAdminLogin = () => {
    setCurrentView({ type: 'admin' });
  };

  const handleGuildSelect = (guildId: string) => {
    setCurrentView({ type: 'guild', guildId });
  };

  const sortedGuilds = (Object.entries(db.guilds) as [string, any][]).sort((a, b) => {
    const tierA = a[1].tier || 99;
    const tierB = b[1].tier || 99;
    if (tierA !== tierB) return tierA - tierB;
    const orderA = a[1].order || 99;
    const orderB = b[1].order || 99;
    return orderA - orderB;
  });

  return (
    <div className="flex items-center justify-center min-h-screen bg-stone-200 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-5xl">
        <h1 className="text-3xl font-bold text-center mb-8 text-stone-800">Karzan 聯盟系統</h1>
        
        <div className="space-y-8">
          <div className="p-6 border border-stone-200 rounded-xl bg-stone-50">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Users className="w-5 h-5" /> 選擇公會
            </h2>
            
            {Object.keys(db.guilds).length === 0 ? (
              <div className="text-center text-stone-500 py-8">
                目前沒有任何公會
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(tier => {
                  const tierGuilds = sortedGuilds.filter(g => (g[1].tier || 1) === tier);
                  if (tierGuilds.length === 0) return null;
                  return (
                    <div key={tier} className="space-y-3">
                      <h3 className={`font-bold text-center py-2 rounded-lg border ${getTierColor(tier)}`}>梯隊 {tier}</h3>
                      {tierGuilds.map(([id, guild]: [string, any]) => (
                        <button
                          key={id}
                          onClick={() => handleGuildSelect(id)}
                          className={`w-full flex items-center justify-between p-4 bg-white border border-stone-200 rounded-xl transition-all group ${getTierBorderHoverClass(tier)}`}
                        >
                          <span className={`font-medium text-stone-800 transition-colors ${getTierTextHoverClass(tier)}`}>{guild.name}</span>
                          <ChevronRight className={`w-5 h-5 text-stone-400 transition-colors ${getTierTextHoverClass(tier)}`} />
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="max-w-md mx-auto space-y-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-stone-200 text-stone-500">或</span>
              </div>
            </div>

            <button 
              onClick={handleAdminLogin}
              className="w-full py-3 border-2 border-stone-800 text-stone-800 hover:bg-stone-800 hover:text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Shield className="w-5 h-5" /> 管理員登入
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
