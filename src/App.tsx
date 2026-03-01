/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useAppContext } from './store';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import GuildDashboard from './pages/GuildDashboard';
import ToastContainer from './components/Toast';

const AppContent = () => {
  const { db, currentView, currentUser, setCurrentView } = useAppContext();

  if (!currentView) {
    return <Login />;
  }

  if (currentView.type === 'admin') {
    const userRole = currentUser ? db.users[currentUser]?.role : null;
    const canAccessAdmin = userRole === 'admin' || userRole === 'creator';
    
    if (!canAccessAdmin) {
      setCurrentView(null);
      return <Login />;
    }
    return <AdminDashboard />;
  }

  return <GuildDashboard guildId={currentView.guildId} />;
};

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-stone-100 text-stone-900 font-sans">
        <AppContent />
        <ToastContainer />
      </div>
    </AppProvider>
  );
}
