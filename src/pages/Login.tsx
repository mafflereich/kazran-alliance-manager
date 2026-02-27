import React, { useState } from 'react';
import { useAppContext } from '../store';
import { Shield, Users, ChevronRight, Lock, X, AlertCircle } from 'lucide-react';
import { getTierColor, getTierBorderHoverClass, getTierTextHoverClass } from '../utils';
import Footer from '../components/Footer';
import Header from '../components/Header';
import { supabase } from '../supabase';

const DOMAIN_SUFFIX = '@kazran.com';

export default function Login() {
  const { db, setCurrentView, setCurrentUser, currentUser } = useAppContext();
  const [selectedGuildForLogin, setSelectedGuildForLogin] = useState<{ id: string, name: string } | null>(null);
  const [guildPassword, setGuildPassword] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const userRole = currentUser ? db.users[currentUser]?.role : null;
  const canSeeAllGuilds = userRole === 'admin' || userRole === 'creator' || userRole === 'manager';
  const userGuildId = !canSeeAllGuilds && currentUser ? Object.entries(db.guilds).find(([_, g]) => g.username === currentUser)?.[0] : null;

  const handleGuildSelect = async (guildId: string, guildName: string) => {
    if (currentUser) {
      if (!canSeeAllGuilds && guildId !== userGuildId) return;
      setCurrentView({ type: 'guild', guildId });
      return;
    }

    setSelectedGuildForLogin({ id: guildId, name: guildName });
    setGuildPassword('');
    setError('');
  };

  const handleGuildLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuildForLogin) return;

    const guild = db.guilds[selectedGuildForLogin.id];
    const username = guild?.username;

    if (!username) {
      setError('此公會尚未設定登入帳號');
      return;
    }

    setIsVerifying(true);
    setError('');
    
    try {
      const formattedEmail = `${username}${DOMAIN_SUFFIX}`;

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: formattedEmail,
        password: guildPassword,
      });

      if (authError) {
        throw new Error('密碼錯誤');
      }

      setCurrentUser(username);
      setCurrentView({ type: 'guild', guildId: selectedGuildForLogin.id });
    } catch (error: any) {
      setError(error.message);
      console.error('公會登入失敗:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  const sortedGuilds = (Object.entries(db.guilds) as [string, any][]).sort((a, b) => {
    const tierA = a[1].tier || 99;
    const tierB = b[1].tier || 99;
    if (tierA !== tierB) return tierA - tierB;
    const orderA = a[1].orderNum || 99;
    const orderB = b[1].orderNum || 99;
    return orderA - orderB;
  });

  return (
    <div className="flex flex-col min-h-screen bg-stone-200">
      <Header />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-5xl transition-all duration-300">
          <h1 className="text-3xl font-bold text-center mb-8 text-stone-800">Kazran 聯盟系統</h1>

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
                        {tierGuilds.map(([id, guild]: [string, any]) => {
                          const isDisabled = currentUser && !canSeeAllGuilds && id !== userGuildId;
                          return (
                            <button
                              key={id}
                              onClick={() => handleGuildSelect(id, guild.name)}
                              disabled={isVerifying || isDisabled}
                              className={`w-full flex items-center justify-between p-4 bg-white border border-stone-200 rounded-xl transition-all group ${isDisabled ? 'opacity-30 grayscale cursor-not-allowed' : getTierBorderHoverClass(tier)} disabled:opacity-50`}
                            >
                              <span className={`font-medium text-stone-800 transition-colors ${isDisabled ? '' : getTierTextHoverClass(tier)}`}>{guild.name}</span>
                              <ChevronRight className={`w-5 h-5 text-stone-400 transition-colors ${isDisabled ? '' : getTierTextHoverClass(tier)}`} />
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />

      {selectedGuildForLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
            <div className="bg-stone-50 px-6 py-4 border-b border-stone-200 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2 text-stone-800">
                <Shield className="w-6 h-6 text-amber-600" /> 進入 {selectedGuildForLogin.name}
              </h2>
              <button onClick={() => setSelectedGuildForLogin(null)} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-stone-500" />
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleGuildLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">公會密碼</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input
                      type="password"
                      className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                      value={guildPassword}
                      onChange={e => setGuildPassword(e.target.value)}
                      placeholder="請輸入公會密碼"
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded border border-red-100">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="w-full py-2 bg-stone-800 text-white hover:bg-stone-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {isVerifying ? '驗證中...' : '進入'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
