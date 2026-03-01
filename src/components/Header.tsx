import React, { useState } from 'react';
import { useAppContext } from '../store';
import { Shield, LogOut, Settings, List, User, Lock, AlertCircle, X } from 'lucide-react';
import { supabase } from '../supabase';
import i18n from '../i18n';
import LanguageSelector from './LanguageSelector';

const DOMAIN_SUFFIX = '@kazran.com';

function LoginModal({ onClose }: { onClose: () => void }) {
  const { db, setCurrentUser } = useAppContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formattedEmail = `${username}${DOMAIN_SUFFIX}`;

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formattedEmail,
        password: password,
      });

      if (authError) {
        throw new Error('帳號或密碼錯誤！');
      }

      setCurrentUser(username);
      onClose();
    } catch (error: any) {
      setError(error.message);
      console.error('登入失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="bg-stone-50 px-6 py-4 border-b border-stone-200 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2 text-stone-800">
            <Shield className="w-6 h-6 text-amber-600" /> 管理員登入
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        <div className="p-6">
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

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-stone-800 text-white hover:bg-stone-700 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {loading ? '登入中...' : '登入'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function Header() {
  const { db, currentUser, setCurrentUser, currentView, setCurrentView } = useAppContext();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setCurrentView(null);
  };

  const sortedGuilds = (Object.entries(db.guilds) as [string, any][]).sort((a, b) => {
    const tierA = a[1].tier || 99;
    const tierB = b[1].tier || 99;
    if (tierA !== tierB) return tierA - tierB;
    const orderA = a[1].orderNum || 99;
    const orderB = b[1].orderNum || 99;
    return orderA - orderB;
  });

  const userRole = currentUser ? db.users[currentUser]?.role : null;
  const canSeeAllGuilds = userRole === 'admin' || userRole === 'creator' || userRole === 'manager';
  const canAccessAdmin = userRole === 'admin' || userRole === 'creator';
  const userGuildId = !canSeeAllGuilds && currentUser ? Object.entries(db.guilds).find(([_, g]) => g.username === currentUser)?.[0] : null;

  const topGuildId = canSeeAllGuilds ? (sortedGuilds.length > 0 ? sortedGuilds[0][0] : null) : userGuildId;

  const isCostumeListActive = currentView?.type === 'guild';
  const isAdminActive = currentView?.type === 'admin';

  return (
    <>
      <header className="bg-stone-900 text-white p-4 shadow-md shrink-0">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1
            className="text-xl font-bold flex items-center gap-2 cursor-pointer hover:text-amber-400 transition-colors"
            onClick={() => setCurrentView(null)}
          >
            <Shield className="w-6 h-6 text-amber-500" />
            Kazran 聯盟系統
          </h1>
          <div className="flex items-center gap-4 text-sm font-medium">
            <button
              onClick={() => topGuildId && setCurrentView({ type: 'guild', guildId: topGuildId })}
              disabled={isCostumeListActive || !topGuildId}
              className={`flex items-center gap-2 transition-colors ${isCostumeListActive ? 'text-amber-500 cursor-default' : 'hover:text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed'}`}
            >
              <List className="w-4 h-4" /> 服裝列表
            </button>

            {currentUser ? (
              <>
                {canAccessAdmin && (
                  <button
                    onClick={() => setCurrentView({ type: 'admin' })}
                    disabled={isAdminActive}
                    className={`flex items-center gap-2 transition-colors ${isAdminActive ? 'text-amber-500 cursor-default' : 'hover:text-amber-400'}`}
                  >
                    <Settings className="w-4 h-4" /> 後台設定
                  </button>
                )}

                <LanguageSelector />

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 hover:text-amber-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> 登出({currentUser})
                </button>
              </>
            ) : (
              <>
                <LanguageSelector />
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="flex items-center gap-2 hover:text-amber-400 transition-colors"
                >
                  <User className="w-4 h-4" /> 登入
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {isLoginModalOpen && (
        <LoginModal onClose={() => setIsLoginModalOpen(false)} />
      )}
    </>
  );
}
