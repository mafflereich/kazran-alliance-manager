import React, { useState } from 'react';
import { useAppContext } from '../store';
import { Shield, Users, ChevronRight, Lock, User, AlertCircle } from 'lucide-react';
import { getTierColor, getTierBorderHoverClass, getTierTextHoverClass } from '../utils';

export default function Login() {
  const { db, setCurrentView, setCurrentUser } = useAppContext();
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = db.users[username];
    if (user && user.password === password) {
      setCurrentUser(username);
      setCurrentView({ type: 'admin' });
    } else {
      setError('帳號或密碼錯誤');
    }
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
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-5xl transition-all duration-300">
        <h1 className="text-3xl font-bold text-center mb-8 text-stone-800">Kazran 聯盟系統</h1>
        
        <div className="space-y-8">
          {!isAdminMode ? (
            <>
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
                    <span className="px-2 bg-white text-stone-500">或</span>
                  </div>
                </div>

                <button 
                  onClick={() => setIsAdminMode(true)}
                  className="w-full py-3 border-2 border-stone-800 text-stone-800 hover:bg-stone-800 hover:text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Shield className="w-5 h-5" /> 管理員登入
                </button>
              </div>
            </>
          ) : (
            <div className="max-w-md mx-auto p-6 border border-stone-200 rounded-xl bg-stone-50">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-stone-800">
                <Shield className="w-6 h-6 text-amber-600" /> 管理員登入
              </h2>
              
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">帳號</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input 
                      type="text" 
                      required
                      className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="請輸入帳號"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">密碼</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input 
                      type="password" 
                      required
                      className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="請輸入密碼"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded border border-red-100">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => { setIsAdminMode(false); setError(''); }}
                    className="flex-1 py-2 border border-stone-300 text-stone-600 hover:bg-stone-100 rounded-lg font-medium transition-colors"
                  >
                    返回
                  </button>
                  <button 
                    type="submit"
                    className="flex-2 py-2 bg-stone-800 text-white hover:bg-stone-700 rounded-lg font-medium transition-colors"
                  >
                    登入
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
