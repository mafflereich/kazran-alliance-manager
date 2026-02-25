import React, { useState } from 'react';
import { useAppContext } from '../store';
import { LogOut, Users, Shield, Sword, Plus, Edit2, Trash2, ArrowUp, ArrowDown, Save, X, ChevronLeft } from 'lucide-react';
import { Role } from '../types';
import { getTierColor, getTierBorderHoverClass } from '../utils';

export default function AdminDashboard() {
  const { db, setDb, setCurrentView } = useAppContext();
  const [activeTab, setActiveTab] = useState<'guilds' | 'costumes'>('guilds');

  const handleLogout = () => setCurrentView(null);

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="bg-stone-900 text-white p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-500" />
            Karzan 聯盟管理後台
          </h1>
          <button onClick={handleLogout} className="flex items-center gap-2 hover:text-amber-400 transition-colors">
            <LogOut className="w-5 h-5" /> 登出
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="flex gap-4 mb-6 border-b border-stone-300 pb-2">
          <TabButton active={activeTab === 'guilds'} onClick={() => setActiveTab('guilds')} icon={<Shield />} label="公會管理" />
          <TabButton active={activeTab === 'costumes'} onClick={() => setActiveTab('costumes')} icon={<Sword />} label="服裝資料庫" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
          {activeTab === 'guilds' && <GuildsManager />}
          {activeTab === 'costumes' && <CostumesManager />}
        </div>
      </main>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors ${
        active ? 'text-amber-600 border-b-2 border-amber-600' : 'text-stone-500 hover:text-stone-800'
      }`}
    >
      {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}
      {label}
    </button>
  );
}

function GuildsManager() {
  const { db, setDb } = useAppContext();
  const [newGuildName, setNewGuildName] = useState('');
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
  const [editingGuildId, setEditingGuildId] = useState<string | null>(null);
  const [editGuildName, setEditGuildName] = useState('');
  const [editGuildTier, setEditGuildTier] = useState<number>(1);
  const [editGuildOrder, setEditGuildOrder] = useState<number>(1);

  const handleAddGuild = () => {
    if (!newGuildName.trim()) return;
    const newId = `g${Date.now()}`;
    setDb(prev => ({
      ...prev,
      guilds: { ...prev.guilds, [newId]: { name: newGuildName.trim(), tier: 1, order: 99 } }
    }));
    setNewGuildName('');
  };

  const getMemberCount = (guildId: string) => {
    return Object.values(db.members).filter((m: any) => m.guildId === guildId).length;
  };

  const startEdit = (e: React.MouseEvent, id: string, guild: any) => {
    e.stopPropagation();
    setEditingGuildId(id);
    setEditGuildName(guild.name);
    setEditGuildTier(guild.tier || 1);
    setEditGuildOrder(guild.order || 1);
  };

  const saveEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editGuildName.trim() || !editingGuildId) return;
    setDb(prev => ({
      ...prev,
      guilds: {
        ...prev.guilds,
        [editingGuildId]: { 
          ...prev.guilds[editingGuildId], 
          name: editGuildName.trim(),
          tier: editGuildTier,
          order: editGuildOrder
        }
      }
    }));
    setEditingGuildId(null);
  };

  const sortedGuilds = (Object.entries(db.guilds) as [string, any][]).sort((a, b) => {
    const tierA = a[1].tier || 99;
    const tierB = b[1].tier || 99;
    if (tierA !== tierB) return tierA - tierB;
    const orderA = a[1].order || 99;
    const orderB = b[1].order || 99;
    return orderA - orderB;
  });

  if (selectedGuildId) {
    return <GuildMembersManager guildId={selectedGuildId} onBack={() => setSelectedGuildId(null)} />;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-stone-800">公會列表</h2>
      
      <div className="flex gap-2 mb-6">
        <input 
          type="text" 
          placeholder="新公會名稱" 
          className="flex-1 p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
          value={newGuildName}
          onChange={e => setNewGuildName(e.target.value)}
        />
        <button onClick={handleAddGuild} className="px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700 flex items-center gap-2">
          <Plus className="w-5 h-5" /> 新增公會
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(tier => {
          const tierGuilds = sortedGuilds.filter(g => (g[1].tier || 1) === tier);
          if (tierGuilds.length === 0) return null;
          return (
            <div key={tier} className="flex flex-col gap-3">
              <h3 className={`font-bold text-center py-2 rounded-lg border ${getTierColor(tier)}`}>梯隊 {tier}</h3>
              {tierGuilds.map(([id, guild]) => (
                <div 
                  key={id} 
                  onClick={() => { if (!editingGuildId) setSelectedGuildId(id); }}
                  className={`p-4 border border-stone-200 rounded-xl bg-stone-50 flex flex-col gap-3 transition-colors group ${!editingGuildId ? `cursor-pointer ${getTierBorderHoverClass(tier)}` : ''}`}
                >
                  {editingGuildId === id ? (
                    <div className="flex flex-col gap-2">
                      <input 
                        type="text" 
                        className="w-full p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                        value={editGuildName}
                        onChange={e => setEditGuildName(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        placeholder="公會名稱"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <select
                          className="flex-1 p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                          value={editGuildTier}
                          onChange={e => setEditGuildTier(Number(e.target.value))}
                          onClick={e => e.stopPropagation()}
                        >
                          <option value={1}>梯隊 1</option>
                          <option value={2}>梯隊 2</option>
                          <option value={3}>梯隊 3</option>
                          <option value={4}>梯隊 4</option>
                        </select>
                        <input 
                          type="number" 
                          className="w-20 p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                          value={editGuildOrder}
                          onChange={e => setEditGuildOrder(Number(e.target.value))}
                          onClick={e => e.stopPropagation()}
                          placeholder="順序"
                          min={1}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="flex-1 p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1"><Save className="w-4 h-4" /> 儲存</button>
                        <button onClick={(e) => { e.stopPropagation(); setEditingGuildId(null); }} className="flex-1 p-2 bg-stone-200 text-stone-600 rounded-lg hover:bg-stone-300 transition-colors flex items-center justify-center gap-1"><X className="w-4 h-4" /> 取消</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-stone-200 text-stone-600 text-xs font-bold rounded">順序 {guild.order || 1}</span>
                        </div>
                        <h3 className="font-bold text-lg text-stone-800 group-hover:text-amber-700 transition-colors">{guild.name}</h3>
                        <p className={`text-sm font-medium ${getMemberCount(id) > 30 ? 'text-red-500 bg-red-50 px-1 py-0.5 rounded inline-block' : 'text-stone-500'}`}>
                          成員數: {getMemberCount(id)} / 30
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => startEdit(e, id, guild)} className="p-2 text-stone-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="編輯"><Edit2 className="w-5 h-5" /></button>
                        <Users className="w-5 h-5 ml-1 text-stone-400 group-hover:text-amber-500 transition-colors" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GuildMembersManager({ guildId, onBack }: { guildId: string, onBack: () => void }) {
  const { db, setDb } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [isBatchAdding, setIsBatchAdding] = useState(false);
  const [batchInput, setBatchInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ name: '', role: '成員' as Role, note: '', targetGuildId: guildId });

  const sortedGuilds = (Object.entries(db.guilds) as [string, any][]).sort((a, b) => {
    const tierA = a[1].tier || 99;
    const tierB = b[1].tier || 99;
    if (tierA !== tierB) return tierA - tierB;
    const orderA = a[1].order || 99;
    const orderB = b[1].order || 99;
    return orderA - orderB;
  });

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

  const getMemberCount = (gId: string) => Object.values(db.members).filter((m: any) => m.guildId === gId).length;
  const getGuildMaster = (gId: string) => Object.entries(db.members).find(([_, m]: [string, any]) => m.guildId === gId && m.role === '會長');
  const getGuildDeputy = (gId: string) => Object.entries(db.members).find(([_, m]: [string, any]) => m.guildId === gId && m.role === '副會長');

  const validateMoveOrAdd = (targetGId: string, role: Role, excludeMemberId?: string) => {
    if (!targetGId) return "請選擇公會";
    if (!formData.name.trim()) return "請輸入名稱";

    const currentCount = getMemberCount(targetGId);
    const isSameGuild = excludeMemberId && db.members[excludeMemberId]?.guildId === targetGId;
    
    // Allow exceeding 30 members
    // if (!isSameGuild && currentCount >= 30) return "該公會人數已達 30 人上限";

    if (role === '會長') {
      const master = getGuildMaster(targetGId);
      if (master && master[0] !== excludeMemberId) return "該公會已有會長";
    }
    if (role === '副會長') {
      const deputy = getGuildDeputy(targetGId);
      if (deputy && deputy[0] !== excludeMemberId) return "該公會已有副會長";
    }
    return null;
  };

  const handleSave = () => {
    const error = validateMoveOrAdd(formData.targetGuildId, formData.role, editingId || undefined);
    if (error) {
      alert(error);
      return;
    }

    if (editingId) {
      setDb(prev => ({
        ...prev,
        members: {
          ...prev.members,
          [editingId]: { 
            ...prev.members[editingId], 
            name: formData.name,
            role: formData.role,
            note: formData.note,
            guildId: formData.targetGuildId
          }
        }
      }));
      setEditingId(null);
    } else {
      const newId = `u${Date.now()}`;
      setDb(prev => ({
        ...prev,
        members: {
          ...prev.members,
          [newId]: { 
            name: formData.name,
            role: formData.role,
            note: formData.note,
            guildId: formData.targetGuildId,
            records: {} 
          }
        }
      }));
      setIsAdding(false);
    }
    setFormData({ name: '', role: '成員', note: '', targetGuildId: guildId });
  };

  const handleDeleteMember = (id: string) => {
    if (window.confirm('確定要刪除此成員嗎？')) {
      setDb(prev => {
        const { [id]: _, ...nextMembers } = prev.members;
        return { ...prev, members: nextMembers };
      });
    }
  };

  const startEdit = (id: string) => {
    setEditingId(id);
    setFormData({
      name: db.members[id].name,
      role: db.members[id].role,
      note: db.members[id].note || '',
      targetGuildId: db.members[id].guildId
    });
  };

  const cancelEdit = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', role: '成員', note: '', targetGuildId: guildId });
  };

  const handleBatchAdd = () => {
    if (!batchInput.trim()) return;
    const lines = batchInput.split('\n').map(l => l.trim()).filter(l => l);
    
    const currentCount = getMemberCount(guildId);
    // Allow exceeding 30 members
    // if (currentCount + lines.length > 30) {
    //   alert(`批量新增後將超過 30 人上限 (目前 ${currentCount} 人，欲新增 ${lines.length} 人)`);
    //   return;
    // }

    const newMembers: Record<string, any> = {};
    lines.forEach((line, index) => {
      const parts = line.split(/[,，\t]/).map(s => s.trim());
      const name = parts[0];
      const roleStr = parts[1] || '';
      const note = parts.slice(2).join(',').trim();
      
      let role: Role = '成員';
      if (roleStr === 'Master' || roleStr === '會長') role = '會長';
      else if (roleStr === 'Deputy' || roleStr === '副會長') role = '副會長';

      newMembers[`u${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`] = {
        name: name || '未命名',
        role,
        note: note || '',
        guildId,
        records: {}
      };
    });

    setDb(prev => ({
      ...prev,
      members: {
        ...prev.members,
        ...newMembers
      }
    }));
    setBatchInput('');
    setIsBatchAdding(false);
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
          <ChevronLeft className="w-6 h-6 text-stone-600" />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-stone-800">{guild.name} - 成員管理</h2>
          <p className={`text-sm font-medium ${members.length > 30 ? 'text-red-500 bg-red-50 px-2 py-0.5 rounded inline-block' : 'text-stone-500'}`}>
            成員數: {members.length} / 30
          </p>
        </div>
        {!isAdding && !editingId && !isBatchAdding && (
          <div className="flex gap-2">
            <button onClick={() => setIsAdding(true)} className="px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700 flex items-center gap-2">
              <Plus className="w-5 h-5" /> 新增成員
            </button>
            <button onClick={() => setIsBatchAdding(true)} className="px-4 py-2 bg-stone-200 text-stone-800 rounded-lg hover:bg-stone-300 flex items-center gap-2">
              批量新增
            </button>
          </div>
        )}
      </div>

      {isBatchAdding && (
        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 mb-6 flex flex-col gap-4">
          <label className="block text-sm font-medium text-stone-600">批量新增成員 (每行一筆，格式: 名稱, 職位, 備註) <br/>職位可填: 會長, 副會長, 成員 (預設)</label>
          <textarea 
            className="w-full p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none min-h-[100px]"
            placeholder="玩家阿明, 會長, 這是備註&#10;玩家阿華, 成員&#10;玩家小美"
            value={batchInput}
            onChange={e => setBatchInput(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={handleBatchAdd} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">確認新增</button>
            <button onClick={() => { setIsBatchAdding(false); setBatchInput(''); }} className="px-4 py-2 bg-stone-300 text-stone-800 rounded-lg hover:bg-stone-400">取消</button>
          </div>
        </div>
      )}

      {isAdding && (
        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 mb-6 flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-stone-600 mb-1">名稱</label>
            <input 
              type="text" 
              className="w-full p-2 border border-stone-300 rounded-lg"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-stone-600 mb-1">職位</label>
            <select 
              className="w-full p-2 border border-stone-300 rounded-lg"
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value as Role})}
            >
              <option value="成員">成員</option>
              <option value="副會長">副會長</option>
              <option value="會長">會長</option>
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-stone-600 mb-1">所屬公會</label>
            <select 
              className="w-full p-2 border border-stone-300 rounded-lg"
              value={formData.targetGuildId}
              onChange={e => setFormData({...formData, targetGuildId: e.target.value})}
            >
              {(sortedGuilds as [string, any][]).map(([id, g]) => {
                return <option key={id} value={id}>{g.name}</option>;
              })}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-stone-600 mb-1">備註</label>
            <input 
              type="text" 
              className="w-full p-2 border border-stone-300 rounded-lg"
              value={formData.note}
              onChange={e => setFormData({...formData, note: e.target.value})}
              placeholder="例如: 請假中"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">儲存</button>
            <button onClick={cancelEdit} className="px-4 py-2 bg-stone-300 text-stone-800 rounded-lg hover:bg-stone-400">取消</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-stone-200 text-stone-600">
              <th className="p-3 font-semibold">名稱</th>
              <th className="p-3 font-semibold">職位</th>
              <th className="p-3 font-semibold">備註</th>
              <th className="p-3 font-semibold text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {members.map(([id, member]: [string, any]) => {
              const isEditing = editingId === id;
              if (isEditing) {
                return (
                  <tr key={id} className="bg-amber-50/50 border-b border-stone-100">
                    <td className="p-2">
                      <input 
                        type="text" 
                        className="w-full p-1.5 border border-stone-300 rounded bg-white text-sm"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        autoFocus
                      />
                    </td>
                    <td className="p-2">
                      <select 
                        className="w-full p-1.5 border border-stone-300 rounded bg-white text-sm"
                        value={formData.role}
                        onChange={e => setFormData({...formData, role: e.target.value as Role})}
                      >
                        <option value="成員">成員</option>
                        <option value="副會長">副會長</option>
                        <option value="會長">會長</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <div className="flex flex-col gap-1">
                        <select 
                          className="w-full p-1.5 border border-stone-300 rounded bg-white text-xs mb-1"
                          value={formData.targetGuildId}
                          onChange={e => setFormData({...formData, targetGuildId: e.target.value})}
                        >
                          {(sortedGuilds as [string, any][]).map(([gId, g]) => (
                            <option key={gId} value={gId}>{g.name}</option>
                          ))}
                        </select>
                        <input 
                          type="text" 
                          className="w-full p-1.5 border border-stone-300 rounded bg-white text-sm"
                          value={formData.note}
                          onChange={e => setFormData({...formData, note: e.target.value})}
                          placeholder="備註"
                        />
                      </div>
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={handleSave}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="儲存"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={cancelEdit}
                          className="p-2 text-stone-400 hover:bg-stone-100 rounded-lg transition-colors"
                          title="取消"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={id} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="p-3 font-medium text-stone-800">{member.name}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      member.role === '會長' ? 'bg-red-100 text-red-800' :
                      member.role === '副會長' ? 'bg-amber-100 text-amber-800' :
                      'bg-stone-200 text-stone-700'
                    }`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="p-3 text-stone-600 text-sm">{member.note || '-'}</td>
                  <td className="p-3 flex justify-end gap-2">
                    <button 
                      onClick={() => startEdit(id)} 
                      className="p-2 text-stone-500 hover:text-amber-600 transition-colors"
                      title="編輯"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteMember(id)} 
                      className="p-2 text-stone-500 hover:text-red-600 transition-colors"
                      title="刪除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {members.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-stone-500">
                  該公會目前沒有成員
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CostumesManager() {
  const { db, setDb } = useAppContext();
  const [newChar, setNewChar] = useState('');
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editChar, setEditChar] = useState('');
  const [editName, setEditName] = useState('');
  const [isBatchAdding, setIsBatchAdding] = useState(false);
  const [batchInput, setBatchInput] = useState('');

  const handleAdd = () => {
    if (!newChar.trim() || !newName.trim()) return;
    const newId = `costume_${Date.now()}`;
    setDb(prev => ({
      ...prev,
      costume_definitions: [
        ...prev.costume_definitions,
        { id: newId, character: newChar.trim(), name: newName.trim() }
      ]
    }));
    setNewChar('');
    setNewName('');
  };

  const handleBatchAdd = () => {
    if (!batchInput.trim()) return;
    const lines = batchInput.split('\n').map(l => l.trim()).filter(l => l);
    const newCostumes = lines.map((line, index) => {
      const parts = line.split(/[,，\t]/).map(s => s.trim());
      const char = parts[0];
      const name = parts.slice(1).join(',').trim() || char;
      return {
        id: `costume_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`,
        character: char,
        name: name
      };
    });

    setDb(prev => ({
      ...prev,
      costume_definitions: [
        ...prev.costume_definitions,
        ...newCostumes
      ]
    }));
    setBatchInput('');
    setIsBatchAdding(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('確定要刪除此服裝嗎？這可能會影響已登記的成員資料。')) {
      setDb(prev => ({
        ...prev,
        costume_definitions: prev.costume_definitions.filter(c => c.id !== id)
      }));
    }
  };

  const startEdit = (costume: any) => {
    setEditingId(costume.id);
    setEditChar(costume.character);
    setEditName(costume.name);
  };

  const saveEdit = () => {
    if (!editChar.trim() || !editName.trim() || !editingId) return;
    setDb(prev => ({
      ...prev,
      costume_definitions: prev.costume_definitions.map(c => 
        c.id === editingId ? { ...c, character: editChar.trim(), name: editName.trim() } : c
      )
    }));
    setEditingId(null);
  };

  const moveCostume = (index: number, direction: -1 | 1) => {
    setDb(prev => {
      const newDefs = [...prev.costume_definitions];
      if (index + direction < 0 || index + direction >= newDefs.length) return prev;
      
      const temp = newDefs[index];
      newDefs[index] = newDefs[index + direction];
      newDefs[index + direction] = temp;
      
      return { ...prev, costume_definitions: newDefs };
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-stone-800">服裝資料庫</h2>
      
      <div className="flex gap-2 mb-6 bg-stone-50 p-4 rounded-xl border border-stone-200 items-end flex-wrap">
        {!isBatchAdding ? (
          <>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-stone-600 mb-1">角色名稱</label>
              <input 
                type="text" 
                placeholder="例如: 悠絲緹亞" 
                className="w-full p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                value={newChar}
                onChange={e => setNewChar(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-stone-600 mb-1">服裝名稱</label>
              <input 
                type="text" 
                placeholder="例如: 劍道社" 
                className="w-full p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} className="px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700 flex items-center gap-2 h-[42px]">
                <Plus className="w-5 h-5" /> 新增
              </button>
              <button onClick={() => setIsBatchAdding(true)} className="px-4 py-2 bg-stone-200 text-stone-800 rounded-lg hover:bg-stone-300 flex items-center gap-2 h-[42px]">
                批量新增
              </button>
            </div>
          </>
        ) : (
          <div className="w-full flex flex-col gap-2">
            <label className="block text-sm font-medium text-stone-600">批量新增服裝 (每行一筆，格式: 角色名稱, 服裝名稱)</label>
            <textarea 
              className="w-full p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none min-h-[100px]"
              placeholder="悠絲緹亞, 劍道社&#10;莎赫拉查德, 代號S"
              value={batchInput}
              onChange={e => setBatchInput(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={handleBatchAdd} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">確認新增</button>
              <button onClick={() => { setIsBatchAdding(false); setBatchInput(''); }} className="px-4 py-2 bg-stone-300 text-stone-800 rounded-lg hover:bg-stone-400">取消</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {db.costume_definitions.map((costume, index) => (
          <div key={costume.id} className="p-4 border border-stone-200 rounded-xl bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {editingId === costume.id ? (
              <div className="flex-1 flex gap-2 flex-wrap">
                <input 
                  type="text" 
                  className="flex-1 min-w-[150px] p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  value={editChar}
                  onChange={e => setEditChar(e.target.value)}
                  placeholder="角色名稱"
                />
                <input 
                  type="text" 
                  className="flex-1 min-w-[150px] p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="服裝名稱"
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">{costume.character}</span>
                <span className="font-medium text-stone-800">{costume.name}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              {editingId === costume.id ? (
                <>
                  <button onClick={saveEdit} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="儲存"><Save className="w-5 h-5" /></button>
                  <button onClick={() => setEditingId(null)} className="p-2 text-stone-500 hover:bg-stone-100 rounded-lg transition-colors" title="取消"><X className="w-5 h-5" /></button>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1 mr-2">
                    <button 
                      onClick={() => moveCostume(index, -1)} 
                      disabled={index === 0}
                      className="p-1 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => moveCostume(index, 1)} 
                      disabled={index === db.costume_definitions.length - 1}
                      className="p-1 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                  <button onClick={() => startEdit(costume)} className="p-2 text-stone-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="編輯"><Edit2 className="w-5 h-5" /></button>
                  <button onClick={() => handleDelete(costume.id)} className="p-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="刪除"><Trash2 className="w-5 h-5" /></button>
                </>
              )}
            </div>
          </div>
        ))}
        {db.costume_definitions.length === 0 && (
          <div className="p-8 text-center text-stone-500 border border-stone-200 rounded-xl bg-stone-50">
            目前沒有任何服裝資料
          </div>
        )}
      </div>
    </div>
  );
}
