import React, { useState } from 'react';
import { useAppContext } from '../store';
import { ChevronLeft, Edit2, Menu, X, Shield } from 'lucide-react';
import MemberEditModal from '../components/MemberEditModal';
import { Role } from '../types';
import { getTierTextColorDark, getTierHighlightClass, getTierHoverClass } from '../utils';

export default function GuildDashboard({ guildId }: { guildId: string }) {
  const { db, setCurrentView } = useAppContext();
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const guild = db.guilds[guildId];
  const members = Object.entries(db.members)
    .filter(([_, m]: [string, any]) => m.guildId === guildId)
    .sort((a: [string, any], b: [string, any]) => {
      const roleOrder: Record<string, number> = { 
        '會長': 1, 'Master': 1,
        '副會長': 2, 'Deputy': 2,
        '成員': 3, 'Member': 3 
      };
      const orderA = roleOrder[a[1].role] || 99;
      const orderB = roleOrder[b[1].role] || 99;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a[1].name.localeCompare(b[1].name);
    });
  const costumes = db.costume_definitions;

  if (!guild) return <div>Guild not found</div>;

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}/${mm}/${dd}`;
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
    <div className="min-h-screen bg-stone-100 pb-10 flex">
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-stone-900/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen w-64 bg-stone-900 text-stone-300 z-50
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        <div className="p-4 flex items-center justify-between border-b border-stone-800">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            公會列表
          </h2>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 hover:bg-stone-800 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-6 px-2">
            {[1, 2, 3, 4].map(tier => {
              const tierGuilds = sortedGuilds.filter(g => (g[1].tier || 1) === tier);
              if (tierGuilds.length === 0) return null;
              return (
                <div key={tier}>
                  <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 px-4 ${getTierTextColorDark(tier)}`}>梯隊 {tier}</h3>
                  <ul className="space-y-1">
                    {tierGuilds.map(([id, g]) => (
                      <li key={id}>
                        <button
                          onClick={() => {
                            setCurrentView({ type: 'guild', guildId: id });
                            setIsSidebarOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 rounded-lg transition-colors flex justify-between items-center ${
                            id === guildId 
                              ? `${getTierHighlightClass(tier)} font-medium` 
                              : `${getTierHoverClass(tier)} text-stone-300`
                          }`}
                        >
                          <span>{g.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
        <div className="p-4 border-t border-stone-800">
          <button 
            onClick={() => setCurrentView(null)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> 返回首頁
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <header className="bg-white p-4 shadow-sm sticky top-0 z-20 flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="lg:hidden p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6 text-stone-600" />
          </button>
          <div>
            <h1 className="font-bold text-xl text-stone-800">{guild.name}</h1>
            <p className={`text-xs font-medium ${members.length > 30 ? 'text-red-500 bg-red-50 px-1.5 py-0.5 rounded inline-block mt-1' : 'text-stone-500 mt-1'}`}>
              成員數: {members.length} / 30
            </p>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4">
          <div className="max-w-full mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-stone-50 border-b-2 border-stone-200 text-stone-600">
                      <th className="p-3 font-semibold sticky left-0 bg-stone-50 z-10 border-r border-stone-200 shadow-[1px_0_0_0_#e7e5e4]">成員</th>
                      {costumes.map(c => (
                        <th key={c.id} className="p-3 font-semibold text-center text-xs w-24 border-r border-stone-100 last:border-r-0">
                          {c.imageName && (
                            <div className="w-[50px] h-[50px] mx-auto mb-2 bg-stone-100 rounded-lg overflow-hidden border border-stone-200">
                              <img 
                                src={`https://www.souseihaku.com/characters/${c.imageName}.webp`} 
                                alt={c.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          <div className="truncate w-20 mx-auto" title={c.name}>{c.name}</div>
                          <div className="text-[10px] text-stone-400 mt-1 truncate w-20 mx-auto" title={c.character}>{c.character}</div>
                        </th>
                      ))}
                      <th className="p-3 font-semibold text-center sticky right-0 bg-stone-50 z-10 border-l border-stone-200 shadow-[-1px_0_0_0_#e7e5e4]">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(([id, member]: [string, any]) => (
                      <tr key={id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors group">
                        <td className="p-3 font-medium text-stone-800 sticky left-0 bg-white group-hover:bg-stone-50 border-r border-stone-200 shadow-[1px_0_0_0_#e7e5e4] transition-colors">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span>{member.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                member.role === '會長' ? 'bg-red-100 text-red-800' :
                                member.role === '副會長' ? 'bg-amber-100 text-amber-800' :
                                'bg-stone-200 text-stone-700'
                              }`}>{member.role}</span>
                            </div>
                            {member.updatedAt && (
                              <span className="text-[10px] text-stone-400 mt-0.5">
                                {formatDate(member.updatedAt)}
                              </span>
                            )}
                          </div>
                        </td>
                        {costumes.map(c => {
                          const record = member.records[c.id];
                          const hasCostume = record && record.level >= 0;
                          
                          let levelColorClass = "text-amber-600 bg-amber-50"; // default for +5
                          if (hasCostume) {
                            if (record.level <= 0) levelColorClass = "text-stone-600 bg-stone-100";
                            else if (record.level <= 2) levelColorClass = "text-blue-600 bg-blue-50";
                            else if (record.level <= 4) levelColorClass = "text-purple-600 bg-purple-50";
                          }

                          return (
                            <td key={c.id} className="p-3 text-center border-r border-stone-100 last:border-r-0">
                              {hasCostume ? (
                                <div className="flex flex-col items-center justify-center gap-1">
                                  <span className={`font-bold px-2 py-0.5 rounded text-sm ${levelColorClass}`}>+{record.level}</span>
                                  {record.weapon && <span className="text-[10px] bg-stone-800 text-white px-1.5 py-0.5 rounded-sm">專武</span>}
                                </div>
                              ) : (
                                <span className="text-stone-300 text-sm">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="p-3 text-center sticky right-0 bg-white group-hover:bg-stone-50 border-l border-stone-200 shadow-[-1px_0_0_0_#e7e5e4] transition-colors">
                          <button 
                            onClick={() => setEditingMemberId(id)}
                            className="flex items-center justify-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg text-sm font-medium transition-colors mx-auto"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            編輯
                          </button>
                        </td>
                      </tr>
                    ))}
                    {members.length === 0 && (
                      <tr>
                        <td colSpan={costumes.length + 2} className="p-8 text-center text-stone-500">
                          該公會目前沒有成員
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      {editingMemberId && (
        <MemberEditModal 
          memberId={editingMemberId} 
          onClose={() => setEditingMemberId(null)} 
        />
      )}
    </div>
  );
}
