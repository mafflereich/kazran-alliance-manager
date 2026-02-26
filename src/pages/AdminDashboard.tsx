import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../store';
import { LogOut, Users, Shield, Sword, Plus, Edit2, Trash2, ArrowUp, ArrowDown, Save, X, ChevronLeft, Lock, User as UserIcon, AlertCircle, Download, Upload, FileText, RefreshCw, Wand2 } from 'lucide-react';
import { Role, Guild, Member, Costume, User } from '../types';
import { getTierColor, getTierBorderHoverClass } from '../utils';
import ConfirmModal from '../components/ConfirmModal';
import Footer from '../components/Footer';

export default function AdminDashboard() {
  const { db, setDb, setCurrentView, currentUser, setCurrentUser, fetchAllMembers } = useAppContext();
  const [activeTab, setActiveTab] = useState<'guilds' | 'costumes' | 'settings' | 'backup' | 'tools'>('guilds');

  const userRole = currentUser ? db.users[currentUser]?.role : 'manager';

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView(null);
  };

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="bg-stone-900 text-white p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-500" />
            Kazran 聯盟管理後台
            <span className="text-xs font-normal bg-stone-800 px-2 py-0.5 rounded text-stone-400">
              Logged in as: {currentUser} ({userRole})
            </span>
          </h1>
          <button onClick={handleLogout} className="flex items-center gap-2 hover:text-amber-400 transition-colors">
            <LogOut className="w-5 h-5" /> 登出
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="mb-4 flex gap-4 text-[10px] text-stone-400 uppercase tracking-widest">
          <span>公會: {Object.keys(db.guilds).length}</span>
          <span>成員: {Object.keys(db.members).length}</span>
          <span>服裝: {db.costume_definitions.length}</span>
          <span>使用者: {Object.keys(db.users).length}</span>
        </div>
        <div className="flex gap-4 mb-6 border-b border-stone-300 pb-2 overflow-x-auto">
          <TabButton active={activeTab === 'guilds'} onClick={() => setActiveTab('guilds')} icon={<Shield />} label="公會管理" />
          <TabButton active={activeTab === 'costumes'} onClick={() => setActiveTab('costumes')} icon={<Sword />} label="服裝資料庫" />
          {userRole !== 'manager' && (
            <>
              <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Lock />} label="帳號設定" />
              <TabButton active={activeTab === 'backup'} onClick={() => setActiveTab('backup')} icon={<Save />} label="備份與還原" />
              <TabButton active={activeTab === 'tools'} onClick={() => setActiveTab('tools')} icon={<Wand2 />} label="便利小功能" />
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
          {activeTab === 'guilds' && <GuildsManager />}
          {activeTab === 'costumes' && <CostumesManager />}
          {activeTab === 'settings' && userRole !== 'manager' && <SettingsManager />}
          {activeTab === 'backup' && userRole !== 'manager' && <BackupManager />}
          {activeTab === 'tools' && userRole !== 'manager' && <ToolsManager />}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ToolsManager() {
  const { db, addMember, deleteMember, updateMember, fetchAllMembers } = useAppContext();

  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    isDanger: false
  });

  const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

  const handleAutoTransfer = () => {
    setConfirmModal({
      isOpen: true,
      title: '自動搬運',
      message: '確定要執行自動搬運嗎？',
      isDanger: false,
      onConfirm: async () => {

        await fetchAllMembers();

        const macroId = `AKfycbyy8z1gVgBVcOcwz5B_MLAa0J80pMMBjtC6MFL-CJ4qkOHjDTunCB4ikajcAHMN2u4BcA`;
        const { guildList, guildLeaderList } = (await (await fetch(`https://script.google.com/macros/s/${macroId}/exec`,
          {
            method: "GET",
            mode: "cors",
          })).json()).data;

        const dressList = Object.values(db.members);
        const guildNameList = Object.keys(guildList);
        const guildListInDB = Object.values(db.guilds);

        for (const guildName of guildNameList) {
          const memberNames = guildList[guildName];

          for (let memberName of memberNames) {
            memberName = memberName.replace(/@/, "");

            const member = dressList.find((member) => member.name == memberName);

            const guildId = guildListInDB.find((guild) => guild.name == guildName)?.id;
            const role = guildLeaderList[`@${memberName}`]?.replaceAll(/<|>/g, "") ?? "成員";

            if (!member && !memberName.match(/Vacancy/) && memberName) {
              console.log(`member ${memberName} not found, adding to DB`);
              await addMember(guildId, memberName, role, "");
              continue;
            }

            if (member && guildId != member?.guildId) {
              console.log(`moving ${member.name} from ${guildListInDB.find((guild) => guild.id == member.guildId)?.name} to ${guildListInDB.find((guild) => guild.id == guildId)?.name}`)
              await updateMember(member.id, { guildId, role });
            }

          };

        };

        closeConfirmModal();
      }
    });
  };

  const handleRemoveDuplicates = () => {
    setConfirmModal({
      isOpen: true,
      title: '移除重複成員',
      message: '確定要移除重複成員嗎？此動作將會刪除所有公會中同名且無服飾資料的成員。',
      isDanger: true,
      onConfirm: async () => {
        setIsProcessing(true);
        closeConfirmModal();
        const membersByGuild: Record<string, any[]> = {};
        for (const memberId in db.members) {
          const member = db.members[memberId];
          if (!membersByGuild[member.guildId]) {
            membersByGuild[member.guildId] = [];
          }
          membersByGuild[member.guildId].push({ id: memberId, ...member });
        }

        for (const guildId in membersByGuild) {
          const members = membersByGuild[guildId];
          const membersByName: Record<string, any[]> = {};
          for (const member of members) {
            if (!membersByName[member.name]) {
              membersByName[member.name] = [];
            }
            membersByName[member.name].push(member);
          }

          for (const name in membersByName) {
            const duplicateMembers = membersByName[name];
            if (duplicateMembers.length > 1) {
              const membersWithCostumes = duplicateMembers.filter(m => Object.keys(m.records || {}).length > 0);
              if (membersWithCostumes.length <= 1) {
                const membersToDelete = duplicateMembers.filter(m => Object.keys(m.records || {}).length === 0);
                if (membersWithCostumes.length === 1) {
                  for (const member of membersToDelete) {
                    await deleteMember(member.id);
                  }
                } else {
                  for (let i = 1; i < membersToDelete.length; i++) {
                    await deleteMember(membersToDelete[i].id);
                  }
                }
              } else {
                const membersByCostume: Record<string, any[]> = {};
                for (const member of membersWithCostumes) {
                  const costumeKey = JSON.stringify(member.records);
                  if (!membersByCostume[costumeKey]) {
                    membersByCostume[costumeKey] = [];
                  }
                  membersByCostume[costumeKey].push(member);
                }

                for (const costumeKey in membersByCostume) {
                  const sameCostumeMembers = membersByCostume[costumeKey];
                  for (let i = 1; i < sameCostumeMembers.length; i++) {
                    await deleteMember(sameCostumeMembers[i].id);
                  }
                }
              }
            }
          }
        }
        setIsProcessing(false);
      }
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6 text-stone-800 flex items-center gap-2">
        <Wand2 className="w-6 h-6 text-amber-600" />
        便利小功能
      </h2>

      <div className="bg-stone-50 p-8 rounded-2xl border border-stone-200 flex flex-col items-center justify-center text-center">
        <div className="p-4 bg-amber-100 rounded-full text-amber-600 mb-4">
          <RefreshCw className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-stone-800 mb-2">自動搬運</h3>
        <p className="text-stone-500 mb-6 max-w-md">
          此功能可用於自動處理成員資料搬運，目前僅供介面展示。
        </p>
        <button
          onClick={handleAutoTransfer}
          className="px-8 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-all active:scale-95 shadow-md"
        >
          開始自動搬運
        </button>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
        isDanger={confirmModal.isDanger}
      />
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors ${active ? 'text-amber-600 border-b-2 border-amber-600' : 'text-stone-500 hover:text-stone-800'
        }`}
    >
      {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-5 h-5' })}
      {label}
    </button>
  );
}

function GuildsManager() {
  const { db, addGuild, updateGuild, deleteGuild, fetchAllMembers } = useAppContext();
  const [newGuildName, setNewGuildName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
  const [editingGuildId, setEditingGuildId] = useState<string | null>(null);
  const [editGuildName, setEditGuildName] = useState('');
  const [editGuildTier, setEditGuildTier] = useState<number>(1);
  const [editGuildOrder, setEditGuildOrder] = useState<number>(1);

  useEffect(() => {
    fetchAllMembers();
  }, []);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    isDanger: false
  });

  const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

  const handleAddGuild = async () => {
    if (!newGuildName.trim()) return;
    setIsSaving(true);
    try {
      await addGuild(newGuildName.trim());
      setNewGuildName('');
    } catch (error: any) {
      console.error("Error adding guild:", error);
      alert(`新增公會失敗: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
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

  const saveEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editGuildName.trim() || !editingGuildId) return;
    try {
      await updateGuild(editingGuildId, {
        name: editGuildName.trim(),
        tier: editGuildTier,
        order: editGuildOrder
      });
      setEditingGuildId(null);
    } catch (error: any) {
      console.error("Error updating guild:", error);
      alert(`更新公會失敗: ${error.message}`);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: '刪除公會',
      message: '確定要刪除此公會嗎？此動作無法復原。',
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteGuild(id);
          closeConfirmModal();
        } catch (error: any) {
          console.error("Error deleting guild:", error);
          alert(`刪除公會失敗: ${error.message}`);
          closeConfirmModal();
        }
      }
    });
  };

  const sortedGuilds = (Object.entries(db.guilds) as [string, any][]).sort((a, b) => {
    const tierA = a[1].tier || 99;
    const tierB = b[1].tier || 99;
    if (tierA !== tierB) return tierA - tierB;
    const orderA = a[1].order || 99;
    const orderB = b[1].order || 99;
    return orderA - orderB;
  });

  const handleBackFromMembers = () => {
    setSelectedGuildId(null);
    fetchAllMembers();
  };

  if (selectedGuildId) {
    return <GuildMembersManager guildId={selectedGuildId} onBack={handleBackFromMembers} />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-stone-800">公會列表</h2>
        <button
          onClick={() => fetchAllMembers()}
          className="p-2 text-stone-500 hover:bg-stone-200 rounded-full transition-colors"
          title="重新整理"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="新公會名稱"
          className="flex-1 p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
          value={newGuildName}
          onChange={e => setNewGuildName(e.target.value)}
        />
        <button onClick={handleAddGuild} disabled={isSaving} className="px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700 flex items-center gap-2 disabled:opacity-50">
          {isSaving ? '儲存中...' : <><Plus className="w-5 h-5" /> 新增公會</>}
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
                        <button onClick={(e) => handleDelete(e, id)} className="p-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="刪除"><Trash2 className="w-5 h-5" /></button>
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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
        isDanger={confirmModal.isDanger}
        confirmText={confirmModal.isDanger ? "刪除" : "確認"}
      />
    </div>
  );
}

function GuildMembersManager({ guildId, onBack }: { guildId: string, onBack: () => void }) {
  const { db, fetchMembers, addMember, updateMember, deleteMember } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    isDanger: false
  });

  const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

  useEffect(() => {
    fetchMembers(guildId);
  }, [guildId]);

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

    // Check role limits only if role is changing or new member
    // This logic is simplified for now
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

  const handleSave = async () => {
    const error = validateMoveOrAdd(formData.targetGuildId, formData.role, editingId || undefined);
    if (error) {
      alert(error);
      return;
    }
    setIsSaving(true);
    try {
      if (editingId) {
        await updateMember(editingId, {
          name: formData.name,
          role: formData.role,
          note: formData.note,
          guildId: formData.targetGuildId
        });
        setEditingId(null);
      } else {
        await addMember(formData.targetGuildId, formData.name, formData.role, formData.note);
        setIsAdding(false);
      }
      setFormData({ name: '', role: '成員', note: '', targetGuildId: guildId });
    } catch (error: any) {
      console.error("Error saving member:", error);
      alert(`儲存成員失敗: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMember = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: '刪除成員',
      message: '確定要刪除此成員嗎？此動作無法復原。',
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteMember(id);
          closeConfirmModal();
        } catch (error: any) {
          console.error("Error deleting member:", error);
          alert(`刪除成員失敗: ${error.message}`);
          closeConfirmModal();
        }
      }
    });
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

  const handleBatchAdd = async () => {
    if (!batchInput.trim()) return;
    const lines = batchInput.split('\n').map(l => l.trim()).filter(l => l);
    setIsSaving(true);
    try {
      // Batch add logic
      for (const line of lines) {
        const parts = line.split(/[,，\t]/).map(s => s.trim());
        const name = parts[0];
        const roleStr = parts[1] || '';
        const note = parts.slice(2).join(',').trim();

        let role: Role = '成員';
        if (roleStr === 'Master' || roleStr === '會長') role = '會長';
        else if (roleStr === 'Deputy' || roleStr === '副會長') role = '副會長';

        if (name) {
          await addMember(guildId, name, role, note);
        }
      }

      setBatchInput('');
      setIsBatchAdding(false);
    } catch (error: any) {
      console.error("Error batch adding members:", error);
      alert(`批量新增失敗: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
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
          <label className="block text-sm font-medium text-stone-600">批量新增成員 (每行一筆，格式: 名稱, 職位, 備註) <br />職位可填: 會長, 副會長, 成員 (預設)</label>
          <textarea
            className="w-full p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none min-h-[100px]"
            placeholder="玩家阿明, 會長, 這是備註&#10;玩家阿華, 成員&#10;玩家小美"
            value={batchInput}
            onChange={e => setBatchInput(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={handleBatchAdd} disabled={isSaving} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">
              {isSaving ? '儲存中...' : '確認新增'}
            </button>
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
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-stone-600 mb-1">職位</label>
            <select
              className="w-full p-2 border border-stone-300 rounded-lg"
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value as Role })}
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
              onChange={e => setFormData({ ...formData, targetGuildId: e.target.value })}
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
              onChange={e => setFormData({ ...formData, note: e.target.value })}
              placeholder="例如: 請假中"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">
              {isSaving ? '儲存中...' : '儲存'}
            </button>
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
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        autoFocus
                      />
                    </td>
                    <td className="p-2">
                      <select
                        className="w-full p-1.5 border border-stone-300 rounded bg-white text-sm"
                        value={formData.role}
                        onChange={e => setFormData({ ...formData, role: e.target.value as Role })}
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
                          onChange={e => setFormData({ ...formData, targetGuildId: e.target.value })}
                        >
                          {(sortedGuilds as [string, any][]).map(([gId, g]) => (
                            <option key={gId} value={gId}>{g.name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          className="w-full p-1.5 border border-stone-300 rounded bg-white text-sm"
                          value={formData.note}
                          onChange={e => setFormData({ ...formData, note: e.target.value })}
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
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${member.role === '會長' ? 'bg-red-100 text-red-800' :
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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
        isDanger={confirmModal.isDanger}
        confirmText={confirmModal.isDanger ? "刪除" : "確認"}
      />
    </div>
  );
}

function CostumesManager() {
  const { db, addCostume, updateCostume, deleteCostume, swapCostumeOrder, resetCostumeOrders } = useAppContext();
  const [newChar, setNewChar] = useState('');
  const [newName, setNewName] = useState('');
  const [newImageName, setNewImageName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editChar, setEditChar] = useState('');
  const [editName, setEditName] = useState('');
  const [editImageName, setEditImageName] = useState('');
  const [isBatchAdding, setIsBatchAdding] = useState(false);
  const [batchInput, setBatchInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    isDanger: false
  });

  const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

  const handleAdd = async () => {
    if (!newChar.trim() || !newName.trim()) return;
    try {
      await addCostume(newChar.trim(), newName.trim(), newImageName.trim());
      setNewChar('');
      setNewName('');
      setNewImageName('');
    } catch (error: any) {
      console.error("Error adding costume:", error);
      alert(`新增服裝失敗: ${error.message}`);
    }
  };

  const handleBatchAdd = async () => {
    if (!batchInput.trim()) return;
    const lines = batchInput.split('\n').map(l => l.trim()).filter(l => l);
    setIsSaving(true);
    try {
      // Get current max order
      let currentMaxOrder = db.costume_definitions.reduce((max, c) => Math.max(max, c.order ?? 0), 0);

      for (const line of lines) {
        const parts = line.split(/[,，\t]/).map(s => s.trim());
        const char = parts[0];
        const name = parts[1] || char;
        const imageName = parts[2] || '';

        if (char && name) {
          currentMaxOrder++;
          await addCostume(char, name, imageName);
        }
      }
      setBatchInput('');
      setIsBatchAdding(false);
    } catch (error: any) {
      console.error("Error batch adding costumes:", error);
      alert(`批量新增服裝失敗: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const [isResetting, setIsResetting] = useState(false);

  const handleResetOrders = async () => {
    setConfirmModal({
      isOpen: true,
      title: '重置排序',
      message: '確定要重置所有服裝的排序嗎？這將會根據目前的顯示順序重新編號，修復排序錯誤。',
      isDanger: false,
      onConfirm: async () => {
        setIsResetting(true);
        try {
          await resetCostumeOrders();
          alert('排序已重置完成');
          closeConfirmModal();
        } catch (error: any) {
          console.error("Error resetting orders:", error);
          alert(`重置排序失敗: ${error.message}`);
          closeConfirmModal();
        } finally {
          setIsResetting(false);
        }
      }
    });
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: '刪除服裝',
      message: '確定要刪除此服裝嗎？這可能會影響已登記的成員資料。',
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteCostume(id);
          closeConfirmModal();
        } catch (error: any) {
          console.error("Error deleting costume:", error);
          alert(`刪除服裝失敗: ${error.message}`);
          closeConfirmModal();
        }
      }
    });
  };

  const startEdit = (costume: any) => {
    setEditingId(costume.id);
    setEditChar(costume.character);
    setEditName(costume.name);
    setEditImageName(costume.imageName || '');
  };

  const saveEdit = async () => {
    if (!editChar.trim() || !editName.trim() || !editingId) return;
    try {
      await updateCostume(editingId, {
        character: editChar.trim(),
        name: editName.trim(),
        imageName: editImageName.trim()
      });
      setEditingId(null);
    } catch (error: any) {
      console.error("Error updating costume:", error);
      alert(`更新服裝失敗: ${error.message}`);
    }
  };

  const moveCostume = async (index: number, direction: -1 | 1) => {
    const newDefs = [...db.costume_definitions];
    if (index + direction < 0 || index + direction >= newDefs.length) return;

    const costume1 = newDefs[index];
    const costume2 = newDefs[index + direction];

    try {
      await swapCostumeOrder(costume1.id, costume2.id);
    } catch (error: any) {
      console.error("Error moving costume:", error);
      alert(`移動失敗: ${error.message}`);
    }
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
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-stone-600 mb-1">圖片名稱 (選填)</label>
              <input
                type="text"
                placeholder="例如: Lathel_1"
                className="w-full p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                value={newImageName}
                onChange={e => setNewImageName(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} className="px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700 flex items-center gap-2 h-[42px]">
                <Plus className="w-5 h-5" /> 新增
              </button>
              <button onClick={() => setIsBatchAdding(true)} className="px-4 py-2 bg-stone-200 text-stone-800 rounded-lg hover:bg-stone-300 flex items-center gap-2 h-[42px]">
                批量新增
              </button>
              <button
                onClick={handleResetOrders}
                className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 flex items-center gap-2 h-[42px] disabled:opacity-50"
                title="修復排序問題"
                disabled={isResetting}
              >
                {isResetting ? '重置中...' : '重置排序'}
              </button>
            </div>
          </>
        ) : (
          <div className="w-full flex flex-col gap-2">
            <label className="block text-sm font-medium text-stone-600">批量新增服裝 (每行一筆，格式: 角色名稱, 服裝名稱, 圖片名稱)</label>
            <textarea
              className="w-full p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none min-h-[100px]"
              placeholder="悠絲緹亞, 劍道社, Lathel_1&#10;莎赫拉查德, 代號S, Scheherazade_1"
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
                  className="flex-1 min-w-[120px] p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  value={editChar}
                  onChange={e => setEditChar(e.target.value)}
                  placeholder="角色名稱"
                />
                <input
                  type="text"
                  className="flex-1 min-w-[120px] p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="服裝名稱"
                />
                <input
                  type="text"
                  className="flex-1 min-w-[120px] p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  value={editImageName}
                  onChange={e => setEditImageName(e.target.value)}
                  placeholder="圖片名稱"
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center gap-4">
                {costume.imageName && (
                  <div className="w-[50px] h-[50px] bg-stone-100 rounded-lg overflow-hidden border border-stone-200 flex-shrink-0">
                    <img
                      src={`https://www.souseihaku.com/characters/${costume.imageName}.webp`}
                      alt={costume.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">{costume.character}</span>
                  <span className="font-medium text-stone-800">{costume.name}</span>
                </div>
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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
        isDanger={confirmModal.isDanger}
        confirmText={confirmModal.isDanger ? "刪除" : "確認"}
      />
    </div>
  );
}

function SettingsManager() {
  const { db, currentUser, updateUserPassword, updateUserRole, addUser, deleteUser, updateSettings } = useAppContext();
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  // New User state
  const [showAddUser, setShowAddUser] = useState(false);
  const [addUsername, setAddUsername] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState<User['role']>('manager');

  // Site settings state
  const [sitePassword, setSitePassword] = useState(db.settings.sitePassword || '');
  const [redirectUrl, setRedirectUrl] = useState(db.settings.redirectUrl || '');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    isDanger: false
  });

  const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

  const currentUserRole = currentUser ? db.users[currentUser]?.role : 'manager';

  const handleSaveSiteSettings = async () => {
    setIsSavingSettings(true);
    try {
      await updateSettings({ sitePassword, redirectUrl });
      alert('系統設定已更新');
    } catch (error: any) {
      alert(`更新失敗: ${error.message}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAddUser = async () => {
    if (!addUsername.trim() || !addPassword.trim()) {
      alert('帳號和密碼不能為空');
      return;
    }
    if (db.users[addUsername.trim()]) {
      alert('帳號已存在');
      return;
    }

    try {
      await addUser({
        username: addUsername.trim(),
        password: addPassword.trim(),
        role: addRole
      });
      setShowAddUser(false);
      setAddUsername('');
      setAddPassword('');
      setAddRole('manager');
      alert('帳號已新增');
    } catch (error: any) {
      alert(`新增失敗: ${error.message}`);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (username === currentUser) {
      alert('不能刪除自己');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: '刪除帳號',
      message: `確定要刪除帳號 ${username} 嗎？此動作無法復原。`,
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteUser(username);
          closeConfirmModal();
        } catch (error: any) {
          alert(`刪除失敗: ${error.message}`);
          closeConfirmModal();
        }
      }
    });
  };

  const handleUpdatePassword = async (username: string) => {
    if (!newPassword.trim()) {
      setError('密碼不能為空');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('兩次輸入的密碼不一致');
      return;
    }

    try {
      await updateUserPassword(username, newPassword.trim());
      setEditingUser(null);
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      alert(`帳號 ${username} 的密碼已更新`);
    } catch (error: any) {
      console.error("Error updating password:", error);
      setError(`更新失敗: ${error.message}`);
    }
  };

  const handleUpdateRole = async (username: string, role: User['role']) => {
    try {
      await updateUserRole(username, role);
      alert(`帳號 ${username} 的權限已更新為 ${role}`);
    } catch (error: any) {
      alert(`更新失敗: ${error.message}`);
    }
  };

  const startEdit = (username: string, currentPass: string) => {
    setEditingUser(username);
    setNewPassword(currentPass);
    setConfirmPassword(currentPass);
    setError('');
  };

  // Filter users based on role
  const visibleUsers = Object.entries(db.users).filter(([username, user]) => {
    if (currentUserRole === 'creator') return true;
    if (currentUserRole === 'admin') {
      // Admin can see everyone except creator
      return user.role !== 'creator';
    }
    return false;
  });

  return (
    <div className="space-y-10">
      {/* Site Settings */}
      <div>
        <h2 className="text-2xl font-bold mb-6 text-stone-800 flex items-center gap-2">
          <Lock className="w-6 h-6 text-amber-600" />
          進入系統設定
        </h2>
        <div className="bg-stone-50 p-6 rounded-xl border border-stone-200 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">進入系統密碼</label>
              <input
                type="text"
                className="w-full p-2.5 border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                value={sitePassword}
                onChange={e => setSitePassword(e.target.value)}
                placeholder="預設為 abc"
              />
              <p className="mt-1.5 text-xs text-stone-400">進入網頁時需要輸入的第一層密碼</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">密碼錯誤跳轉網址</label>
              <input
                type="text"
                className="w-full p-2.5 border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                value={redirectUrl}
                onChange={e => setRedirectUrl(e.target.value)}
                placeholder="例如: https://www.browndust2.com/"
              />
              <p className="mt-1.5 text-xs text-stone-400">當使用者輸入錯誤密碼時，會被傳送到的網址</p>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSaveSiteSettings}
              disabled={isSavingSettings}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {isSavingSettings ? '儲存中...' : '儲存系統設定'}
            </button>
          </div>
        </div>
      </div>

      {/* User Management */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
            <UserIcon className="w-6 h-6 text-stone-600" />
            帳號權限管理
          </h2>
          <button
            onClick={() => setShowAddUser(!showAddUser)}
            className="flex items-center gap-2 px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
          >
            {showAddUser ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            {showAddUser ? '取消新增' : '新增帳號'}
          </button>
        </div>

        {showAddUser && (
          <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-xl space-y-4">
            <h3 className="font-bold text-amber-900">新增後台帳號</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-amber-700 mb-1">帳號</label>
                <input
                  type="text"
                  className="w-full p-2 border border-amber-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  value={addUsername}
                  onChange={e => setAddUsername(e.target.value)}
                  placeholder="帳號名稱"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-amber-700 mb-1">密碼</label>
                <input
                  type="password"
                  className="w-full p-2 border border-amber-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  value={addPassword}
                  onChange={e => setAddPassword(e.target.value)}
                  placeholder="登入密碼"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-amber-700 mb-1">權限身份</label>
                <select
                  className="w-full p-2 border border-amber-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  value={addRole}
                  onChange={e => setAddRole(e.target.value as User['role'])}
                >
                  {currentUserRole === 'creator' && <option value="creator">Creator (最高)</option>}
                  <option value="admin">Admin (管理)</option>
                  <option value="manager">Manager (執行)</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAddUser}
                  className="w-full py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
                >
                  確認新增
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleUsers.map(([username, user]) => (
            <div key={username} className="p-6 border border-stone-200 rounded-xl bg-stone-50 flex flex-col gap-4 relative">
              {username !== currentUser && (
                <button
                  onClick={() => handleDeleteUser(username)}
                  className="absolute top-4 right-4 p-1 text-stone-400 hover:text-red-500 transition-colors"
                  title="刪除帳號"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}

              <div className="flex justify-between items-start pr-8">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-stone-500" />
                  <span className="font-bold text-stone-800">{username}</span>
                  {username === currentUser && <span className="text-[10px] bg-stone-200 px-1.5 py-0.5 rounded text-stone-600">YOU</span>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${user.role === 'creator' ? 'bg-purple-100 text-purple-700' : user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                    {user.role.toUpperCase()}
                  </span>
                  {editingUser !== username && (
                    <select
                      className="text-[10px] bg-transparent border-none text-stone-500 outline-none cursor-pointer hover:text-stone-800"
                      value={user.role}
                      onChange={(e) => handleUpdateRole(username, e.target.value as User['role'])}
                      disabled={user.role === 'creator' && currentUserRole !== 'creator'}
                    >
                      {currentUserRole === 'creator' && <option value="creator">變更為 Creator</option>}
                      <option value="admin">變更為 Admin</option>
                      <option value="manager">變更為 Manager</option>
                    </select>
                  )}
                </div>
              </div>

              {editingUser === username ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1">新密碼</label>
                    <input
                      type="password"
                      className="w-full p-2 border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                      value={newPassword}
                      onChange={e => { setNewPassword(e.target.value); setError(''); }}
                      placeholder="輸入新密碼"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1">確認新密碼</label>
                    <input
                      type="password"
                      className="w-full p-2 border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                      placeholder="再次輸入新密碼"
                    />
                  </div>

                  {error && (
                    <div className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {error}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleUpdatePassword(username)}
                      className="flex-1 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors text-sm font-medium"
                    >
                      儲存
                    </button>
                    <button
                      onClick={() => { setEditingUser(null); setNewPassword(''); setConfirmPassword(''); setError(''); }}
                      className="flex-1 py-2 bg-stone-200 text-stone-600 rounded-lg hover:bg-stone-300 transition-colors text-sm font-medium"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center mt-auto">
                  <div className="flex items-center gap-2 text-stone-500">
                    <Lock className="w-4 h-4" />
                    <span className="text-sm">密碼: ••••••••</span>
                  </div>
                  <button
                    onClick={() => startEdit(username, user.password)}
                    className="text-amber-600 hover:text-amber-700 text-sm font-medium"
                  >
                    修改密碼
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
        isDanger={confirmModal.isDanger}
      />
    </div>
  );
}

function BackupManager() {
  const { db, restoreData, fetchAllMembers } = useAppContext();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');

  const guildsFileRef = useRef<HTMLInputElement>(null);
  const membersFileRef = useRef<HTMLInputElement>(null);
  const costumesFileRef = useRef<HTMLInputElement>(null);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    isDanger: false
  });

  const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

  const downloadCSV = (filename: string, content: string) => {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Ensure all members are loaded before exporting
      await fetchAllMembers();

      // 1. Export Guilds
      const guildsHeader = 'id,name,tier,order\n';
      const guildsRows = Object.values(db.guilds).map((g: any) =>
        `${g.id},${g.name},${g.tier || 1},${g.order || 99}`
      ).join('\n');
      downloadCSV(`guilds_${new Date().toISOString().slice(0, 10)}.csv`, guildsHeader + guildsRows);

      // 2. Export Costumes
      const costumesHeader = 'id,character,name,imageName,order\n';
      const costumesRows = db.costume_definitions.map(c =>
        `${c.id},${c.character},${c.name},${c.imageName || ''},${c.order || ''}`
      ).join('\n');
      downloadCSV(`costumes_${new Date().toISOString().slice(0, 10)}.csv`, costumesHeader + costumesRows);

      // 3. Export Members
      // Note: records are complex objects. We'll JSON stringify them, but escape quotes.
      const membersHeader = 'id,guildId,name,role,note,records\n';
      const membersRows = Object.values(db.members).map((m: any) => {
        // Escape double quotes in JSON string by doubling them for CSV standard
        const recordsJson = JSON.stringify(m.records).replace(/"/g, '""');
        return `${m.id},${m.guildId},${m.name},${m.role},${m.note || ''},"${recordsJson}"`;
      }).join('\n');
      downloadCSV(`members_${new Date().toISOString().slice(0, 10)}.csv`, membersHeader + membersRows);

      alert('已開始下載 3 個 CSV 檔案 (公會, 成員, 服裝)');
    } catch (error: any) {
      console.error("Export error:", error);
      alert(`匯出失敗: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const result = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Handle quoted values (like our JSON records)
      const values: string[] = [];
      let inQuote = false;
      let currentValue = '';

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          if (inQuote && line[j + 1] === '"') {
            currentValue += '"'; // Escaped quote
            j++;
          } else {
            inQuote = !inQuote;
          }
        } else if (char === ',' && !inQuote) {
          values.push(currentValue);
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue);

      const obj: any = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx];
      });
      result.push(obj);
    }
    return result;
  };

  const handleImport = async () => {
    const guildsFile = guildsFileRef.current?.files?.[0];
    const membersFile = membersFileRef.current?.files?.[0];
    const costumesFile = costumesFileRef.current?.files?.[0];

    if (!guildsFile && !membersFile && !costumesFile) {
      alert('請至少選擇一個檔案進行匯入');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: '確認還原資料',
      message: '確定要匯入選定的 CSV 檔案嗎？這將會更新或新增資料。現有的資料若ID相同將被覆蓋。',
      isDanger: true,
      onConfirm: async () => {
        closeConfirmModal();
        setIsImporting(true);
        setImportStatus('讀取檔案中...');

        try {
          const guilds: Guild[] = [];
          const members: Member[] = [];
          const costumes: Costume[] = [];

          if (guildsFile) {
            const text = await guildsFile.text();
            const data = parseCSV(text);
            data.forEach(row => {
              if (row.id && row.name) {
                guilds.push({
                  id: row.id,
                  name: row.name,
                  tier: row.tier ? Number(row.tier) : 1,
                  order: row.order ? Number(row.order) : 99
                });
              }
            });
          }

          if (costumesFile) {
            const text = await costumesFile.text();
            const data = parseCSV(text);
            data.forEach(row => {
              if (row.id && row.character && row.name) {
                costumes.push({
                  id: row.id,
                  character: row.character,
                  name: row.name,
                  imageName: row.imageName,
                  order: row.order ? Number(row.order) : undefined
                });
              }
            });
          }

          if (membersFile) {
            const text = await membersFile.text();
            const data = parseCSV(text);
            data.forEach(row => {
              if (row.id && row.guildId && row.name) {
                let records = {};
                try {
                  if (row.records) {
                    records = JSON.parse(row.records);
                  }
                } catch (e) {
                  console.warn(`Failed to parse records for member ${row.id}`, e);
                }

                members.push({
                  id: row.id,
                  guildId: row.guildId,
                  name: row.name,
                  role: row.role as Role,
                  note: row.note,
                  records: records,
                  updatedAt: Date.now()
                });
              }
            });
          }

          setImportStatus(`準備匯入: ${guilds.length} 公會, ${costumes.length} 服裝, ${members.length} 成員...`);
          await restoreData(guilds, members, costumes);

          alert('匯入成功！資料已更新。');
          setImportStatus('');
          // Clear inputs
          if (guildsFileRef.current) guildsFileRef.current.value = '';
          if (membersFileRef.current) membersFileRef.current.value = '';
          if (costumesFileRef.current) costumesFileRef.current.value = '';

        } catch (error: any) {
          console.error("Import error:", error);
          alert(`匯入失敗: ${error.message}`);
          setImportStatus('匯入失敗');
        } finally {
          setIsImporting(false);
        }
      }
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-stone-800">備份與還原</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Export Section */}
        <div className="bg-stone-50 p-6 rounded-xl border border-stone-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 rounded-full text-green-600">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-stone-800">匯出備份</h3>
          </div>
          <div className="text-stone-600 mb-6">
            將目前的資料庫匯出為 CSV 檔案。系統將會產生 3 個檔案：
            <ul className="list-disc list-inside mt-2 ml-2 text-sm">
              <li>guilds_date.csv (公會資料)</li>
              <li>costumes_date.csv (服裝列表)</li>
              <li>members_date.csv (成員及裝備紀錄)</li>
            </ul>
          </div>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-3 bg-stone-800 text-white rounded-lg hover:bg-stone-700 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isExporting ? '匯出中...' : '匯出所有資料 (CSV)'}
          </button>
        </div>

        {/* Import Section */}
        <div className="bg-stone-50 p-6 rounded-xl border border-stone-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-stone-800">還原資料</h3>
          </div>
          <div className="text-stone-600 mb-6">
            選擇對應的 CSV 檔案進行匯入。您可以只選擇其中一個檔案進行部分更新。
            <br />
            <span className="text-amber-600 text-sm font-bold flex items-center gap-1 mt-1">
              <AlertCircle className="w-4 h-4" /> 注意：ID 相同的資料將被覆蓋
            </span>
          </div>

          <div className="flex flex-col gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">公會資料 (guilds.csv)</label>
              <input ref={guildsFileRef} type="file" accept=".csv" className="w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-stone-200 file:text-stone-700 hover:file:bg-stone-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">服裝列表 (costumes.csv)</label>
              <input ref={costumesFileRef} type="file" accept=".csv" className="w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-stone-200 file:text-stone-700 hover:file:bg-stone-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">成員資料 (members.csv)</label>
              <input ref={membersFileRef} type="file" accept=".csv" className="w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-stone-200 file:text-stone-700 hover:file:bg-stone-300" />
            </div>
          </div>

          {importStatus && <p className="text-sm text-blue-600 mb-2 text-center">{importStatus}</p>}

          <button
            onClick={handleImport}
            disabled={isImporting}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isImporting ? '匯入中...' : '開始還原'}
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
        isDanger={confirmModal.isDanger}
        confirmText={confirmModal.isDanger ? "確認還原" : "確認"}
      />
    </div>
  );
}