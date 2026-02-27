import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppContext } from '../store';
import { LogOut, Users, Shield, Sword, Plus, Edit2, Trash2, ArrowUp, ArrowDown, Save, X, ChevronLeft, Lock, User as UserIcon, AlertCircle, Download, Upload, FileText, RefreshCw, Wand2, GripVertical, Check } from 'lucide-react';
import { Role, Guild, Member, Costume, User, Character } from '../types';
import { getTierColor, getTierBorderHoverClass, getImageUrl } from '../utils';
import ConfirmModal from '../components/ConfirmModal';
import InputModal from '../components/InputModal';
import Footer from '../components/Footer';
import Header from '../components/Header';
import { Reorder } from "motion/react";

export default function AdminDashboard() {
  const { db, setDb, setCurrentView, currentUser, setCurrentUser, fetchAllMembers } = useAppContext();
  const [activeTab, setActiveTab] = useState<'guilds' | 'costumes' | 'backup' | 'tools'>('guilds');

  const userRole = currentUser ? db.users[currentUser]?.role : 'manager';

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView(null);
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      <Header />

      <main className="max-w-6xl mx-auto p-6 flex-1 w-full">
        <div className="mb-4 flex gap-4 text-[10px] text-stone-400 uppercase tracking-widest">
          <span>公會: {Object.keys(db.guilds).length}</span>
          <span>成員: {Object.keys(db.members).length}</span>
          <span>角色: {Object.keys(db.characters).length}</span>
          <span>服裝: {Object.keys(db.costumes).length}</span>
          <span>使用者: {Object.keys(db.users).length}</span>
        </div>
        <div className="flex gap-4 mb-6 border-b border-stone-300 pb-2 overflow-x-auto">
          <TabButton active={activeTab === 'guilds'} onClick={() => setActiveTab('guilds')} icon={<Shield />} label="公會管理" />
          <TabButton active={activeTab === 'costumes'} onClick={() => setActiveTab('costumes')} icon={<Sword />} label="服裝資料庫" />
          {userRole !== 'manager' && (
            <>
              <TabButton active={activeTab === 'backup'} onClick={() => setActiveTab('backup')} icon={<Save />} label="備份與還原" />
              <TabButton active={activeTab === 'tools'} onClick={() => setActiveTab('tools')} icon={<Wand2 />} label="便利小功能" />
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
          {activeTab === 'guilds' && <GuildsManager />}
          {activeTab === 'costumes' && <CostumesManager />}
          {activeTab === 'backup' && userRole !== 'manager' && <BackupManager />}
          {activeTab === 'tools' && userRole !== 'manager' && <ToolsManager />}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ToolsManager() {
  const { db, addMember, deleteMember, updateMember, fetchAllMembers, restoreData } = useAppContext();

  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    isDanger: boolean;
  }>({
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
        setIsProcessing(true);
        closeConfirmModal();

        await fetchAllMembers();

        const macroId = `AKfycbyy8z1gVgBVcOcwz5B_MLAa0J80pMMBjtC6MFL-CJ4qkOHjDTunCB4ikajcAHMN2u4BcA`;
        const { guildList, guildLeaderList } = (await (await fetch(`https://script.google.com/macros/s/${macroId}/exec`,
          {
            method: "GET",
            mode: "cors",
          })).json()).data;

        const guildNameList = Object.keys(guildList);

        const costumeList = Object.values(db.members);
        const guildListInDB = Object.values(db.guilds);

        for (const guildName of guildNameList) {
          const memberNames = guildList[guildName];

          for (let memberName of memberNames) {
            memberName = memberName.replace(/@/, "");

            const member = costumeList.find((member) => member.name == memberName);

            const guildId = guildListInDB.find((guild) => guild.name == guildName)?.id;
            const role = guildLeaderList[`@${memberName}`]?.replaceAll(/<|>/g, "") ?? "成員";

            if (!member && !memberName.match(/Vacancy/) && memberName) {
              await addMember(guildId, memberName, role, "");
            }
            else if (member && guildId != member?.guildId) {
              await updateMember(member.id, { guildId, role });
            }

          };

        };

        setIsProcessing(false);
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

  const handleImportCostume = () => {
    setConfirmModal({
      isOpen: true,
      title: '匯入服裝表',
      message: '確定要匯入服裝表嗎？',
      isDanger: false,
      onConfirm: async () => {
        setIsProcessing(true);
        closeConfirmModal();

        const macroId = `AKfycbyw_0lj4mZjMB9lFE9vwCFiE2S9B84baJj3r4nPqWaYXkHAFHMWyGQtiecuk7eqaShy_w`;


        const costumeList = (await (await fetch(`https://script.google.com/macros/s/${macroId}/exec`,
          {
            method: "GET",
            mode: "cors",
          })).json()).data;

        const costumes = Object.values(db.costumes);
        const characters = Object.values(db.characters);

        const costumeDefineList = costumes.map((costume) => [
          characters.find((character) => character.id == costume.characterId).name,
          costume.name
        ]);

        const result = {};
        for (let name of Object.keys(costumeList)) {

          let costume = costumeList[name].slice(0, costumeDefineList.length);
          let pName = name.replaceAll(/(<.+>)/g, "").match(/^@(.+)/)?.[1].trim();

          costume.forEach((costumeEnhanced: string, i: number) => {
            costumeEnhanced = costumeEnhanced.toString();
            const [charName, costumeName] = costumeDefineList[i];
            const charId = characters.find((character) => character.name === charName)?.id;
            const costumeId = costumes.find((costume) => costume.characterId === charId && costume.name === costumeName)?.id;

            if (charId && costumeId) {
              if (!result[pName]) result[pName] = { records: {}, exclusiveWeapons: {} };
              result[pName]["records"][costumeId] = { level: costumeEnhanced.split("")[0] ?? -1, };
              result[pName]["exclusiveWeapons"][charId] = Boolean(costumeEnhanced.match(/E/));
            }
          });
        }

        const memberList = Object.values(db.members);

        for (let member of memberList) {

          if (!result[member.name]) {
            continue;
          }

          await updateMember(member.id, result[member.name]);
        }

        setIsProcessing(false);
      }
    });

  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6 text-stone-800 flex items-center gap-2">
        <Wand2 className="w-6 h-6 text-amber-600" />
        便利小功能
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-stone-50 p-8 rounded-2xl border border-stone-200 flex flex-col items-center justify-center text-center">
          <div className="p-4 bg-amber-100 rounded-full text-amber-600 mb-4">
            <RefreshCw className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-stone-800 mb-2">自動搬運</h3>
          <p className="text-stone-500 mb-6 max-w-md">
            此功能可用於自動處理成員資料搬運。
          </p>
          <button
            onClick={handleAutoTransfer}
            disabled={isProcessing}
            className="px-8 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-all active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? '處理中...' : '開始自動搬運'}
          </button>
        </div>

        <div className="bg-stone-50 p-8 rounded-2xl border border-stone-200 flex flex-col items-center justify-center text-center">
          <div className="p-4 bg-red-100 rounded-full text-red-600 mb-4">
            <Trash2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-stone-800 mb-2">移除重複成員</h3>
          <p className="text-stone-500 mb-6 max-w-md">
            移除所有公會中同名且無服飾資料的成員，或同名且服飾資料完全相同的成員。
          </p>
          <button
            onClick={handleRemoveDuplicates}
            disabled={isProcessing}
            className="px-8 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? '處理中...' : '開始移除'}
          </button>
        </div>

        <div className="bg-stone-50 p-8 rounded-2xl border border-stone-200 flex flex-col items-center justify-center text-center">
          <div className="p-4 bg-amber-100 rounded-full text-amber-600 mb-4">
            <ArrowUp className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-stone-800 mb-2">匯入服裝表</h3>
          <p className="text-stone-500 mb-6 max-w-md">
            從現有試算表中匯入服裝表。
          </p>
          <button
            onClick={handleImportCostume}
            disabled={isProcessing}
            className="px-8 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-all active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? '處理中...' : '開始匯入'}
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

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    isDanger: boolean;
  }>({
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
    setEditGuildOrder(guild.orderNum || 1);
  };

  const saveEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editGuildName.trim() || !editingGuildId) return;
    try {
      await updateGuild(editingGuildId, {
        name: editGuildName.trim(),
        tier: editGuildTier,
        orderNum: editGuildOrder
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
    const orderA = a[1].orderNum || 99;
    const orderB = b[1].orderNum || 99;
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
                          <span className="px-2 py-0.5 bg-stone-200 text-stone-600 text-xs font-bold rounded">順序 {guild.orderNum || 1}</span>
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

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    isDanger: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    isDanger: false
  });

  const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

  useEffect(() => {
    fetchMembers(guildId, true);
  }, [guildId]);

  const [isBatchAdding, setIsBatchAdding] = useState(false);
  const [batchInput, setBatchInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({ name: '', role: '成員' as Role, note: '', targetGuildId: guildId });

  const sortedGuilds = (Object.entries(db.guilds) as [string, any][]).sort((a, b) => {
    const tierA = a[1].tier || 99;
    const tierB = b[1].tier || 99;
    if (tierA !== tierB) return tierA - tierB;
    const orderA = a[1].orderNum || 99;
    const orderB = b[1].orderNum || 99;
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
              <th className="p-3 font-semibold text-right">編輯</th>
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
                  <td className="p-3 text-stone-500 text-sm">{member.note}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => startEdit(id)}
                        className="p-2 text-stone-500 hover:bg-stone-100 rounded-lg transition-colors"
                        title="編輯"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMember(id)}
                        className="p-2 text-stone-500 hover:bg-stone-100 rounded-lg transition-colors"
                        title="刪除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {members.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-stone-500">
                  此公會目前沒有成員
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
  const { db, addCharacter, updateCharacter, deleteCharacter, addCostume, updateCostume, deleteCostume, updateCharactersOrder, updateCostumesOrder } = useAppContext();
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedCostumeId, setSelectedCostumeId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    isDanger: false
  });

  const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

  const characters = useMemo(() =>
    Object.values(db.characters).sort((a, b) => a.orderNum - b.orderNum),
    [db.characters]);

  const costumes = useMemo(() =>
    Object.values(db.costumes)
      .filter(c => c.characterId === selectedCharacterId)
      .sort((a, b) => (a.orderNum ?? 999) - (b.orderNum ?? 999)),
    [db.costumes, selectedCharacterId]);

  const selectedCharacter = selectedCharacterId ? db.characters[selectedCharacterId] : null;
  const selectedCostume = selectedCostumeId ? db.costumes[selectedCostumeId] : null;

  // Edit states
  const [editCharacterName, setEditCharacterName] = useState('');
  const [editCharacterOrder, setEditCharacterOrder] = useState(0);
  const [editCostumeName, setEditCostumeName] = useState('');
  const [editCostumeOrder, setEditCostumeOrder] = useState(0);
  const [editCostumeImageName, setEditCostumeImageName] = useState('');
  const [editCostumeIsNew, setEditCostumeIsNew] = useState(false);

  // Reorder & Input Modal State
  const [isReorderingCharacters, setIsReorderingCharacters] = useState(false);
  const [orderedCharacters, setOrderedCharacters] = useState<Character[]>([]);
  const [isReorderingCostumes, setIsReorderingCostumes] = useState(false);
  const [orderedCostumes, setOrderedCostumes] = useState<Costume[]>([]);
  const [saveSuccess, setSaveSuccess] = useState<'character' | 'costume' | null>(null);

  const [inputModal, setInputModal] = useState<{
    isOpen: boolean;
    title: string;
    message?: string;
    onConfirm: (value: string) => void;
  }>({ isOpen: false, title: '', onConfirm: () => { } });

  const closeInputModal = () => setInputModal(prev => ({ ...prev, isOpen: false }));

  useEffect(() => {
    if (!isReorderingCharacters) {
      setOrderedCharacters(characters);
    }
  }, [characters, isReorderingCharacters]);

  useEffect(() => {
    if (!isReorderingCostumes) {
      setOrderedCostumes(costumes);
    }
  }, [costumes, isReorderingCostumes]);

  const handleSaveCharacterOrder = async () => {
    setIsReorderingCharacters(false);
    setSaveSuccess('character');
    setTimeout(() => setSaveSuccess(null), 2000);
    try {
      await updateCharactersOrder(orderedCharacters);
    } catch (error: any) {
      alert(`更新排序失敗: ${error.message}`);
    }
  };

  const handleSaveCostumeOrder = async () => {
    setIsReorderingCostumes(false);
    setSaveSuccess('costume');
    setTimeout(() => setSaveSuccess(null), 2000);
    try {
      await updateCostumesOrder(orderedCostumes);
    } catch (error: any) {
      alert(`更新排序失敗: ${error.message}`);
    }
  };

  useEffect(() => {
    if (selectedCharacter) {
      setEditCharacterName(selectedCharacter.name);
      setEditCharacterOrder(selectedCharacter.orderNum);
    } else {
      setSelectedCharacterId(null);
    }
  }, [selectedCharacter]);

  useEffect(() => {
    if (selectedCostume) {
      setEditCostumeName(selectedCostume.name);
      setEditCostumeOrder(selectedCostume.orderNum ?? 0);
      setEditCostumeImageName(selectedCostume.imageName ?? '');
      setEditCostumeIsNew(selectedCostume.isNew ?? false);
    } else {
      setSelectedCostumeId(null);
    }
  }, [selectedCostume]);

  const handleSelectCharacter = (id: string) => {
    setSelectedCharacterId(id);
    setSelectedCostumeId(null);
  };

  const handleAddCharacter = () => {
    setInputModal({
      isOpen: true,
      title: '新增角色',
      message: '請輸入新角色名稱：',
      onConfirm: async (name) => {
        try {
          await addCharacter(name, characters.length + 1);
          closeInputModal();
        } catch (error: any) {
          alert(`新增角色失敗: ${error.message}`);
        }
      }
    });
  };

  const handleDeleteCharacter = async () => {
    if (!selectedCharacterId) return;

    setConfirmModal({
      isOpen: true,
      title: '刪除角色',
      message: '確定要刪除此角色嗎？注意：這將會連同刪除該角色底下的所有服裝資料！此動作無法復原。',
      isDanger: true,
      onConfirm: async () => {
        try {
          // Cascade delete costumes
          const characterCostumes = Object.values(db.costumes).filter(c => c.characterId === selectedCharacterId);
          for (const costume of characterCostumes) {
            await deleteCostume(costume.id);
          }

          await deleteCharacter(selectedCharacterId);
          setSelectedCharacterId(null);
          setSelectedCostumeId(null);
          closeConfirmModal();
        } catch (error: any) {
          console.error("Error deleting character:", error);
          alert(`刪除角色失敗: ${error.message}`);
          closeConfirmModal();
        }
      }
    });
  };

  const handleUpdateCharacter = async () => {
    if (!selectedCharacterId) return;
    await updateCharacter(selectedCharacterId, { name: editCharacterName, orderNum: editCharacterOrder });
    alert('角色更新成功');
  };

  const handleAddCostume = () => {
    if (!selectedCharacterId) return;
    setInputModal({
      isOpen: true,
      title: '新增服裝',
      message: '請輸入新服裝名稱：',
      onConfirm: async (name) => {
        try {
          await addCostume(selectedCharacterId, name, costumes.length + 1);
          closeInputModal();
        } catch (error: any) {
          alert(`新增服裝失敗: ${error.message}`);
        }
      }
    });
  };

  const handleDeleteCostume = async () => {
    if (!selectedCostumeId) return;

    setConfirmModal({
      isOpen: true,
      title: '刪除服裝',
      message: '確定要刪除此服裝嗎？此動作無法復原。',
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteCostume(selectedCostumeId);
          setSelectedCostumeId(null);
          closeConfirmModal();
        } catch (error: any) {
          alert(`刪除服裝失敗: ${error.message}`);
          closeConfirmModal();
        }
      }
    });
  };

  const [isCostumeSaved, setIsCostumeSaved] = useState(false);

  const handleUpdateCostume = async () => {
    if (!selectedCostumeId) return;
    await updateCostume(selectedCostumeId, {
      name: editCostumeName,
      orderNum: editCostumeOrder,
      imageName: editCostumeImageName,
      isNew: editCostumeIsNew
    });
    setIsCostumeSaved(true);
    setTimeout(() => setIsCostumeSaved(false), 2000);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-stone-800">服裝資料庫管理</h2>
      <div className="grid grid-cols-12 gap-6 h-[600px]">
        {/* Characters Column */}
        <div className="col-span-3 bg-stone-50 rounded-xl border border-stone-200 p-4 overflow-y-auto flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">角色</h3>
            <div className="flex gap-1">
              {saveSuccess === 'character' && (
                <div className="p-1.5 text-emerald-600 flex items-center justify-center" title="儲存成功">
                  <Check className="w-4 h-4" />
                </div>
              )}
              <button
                onClick={() => isReorderingCharacters ? handleSaveCharacterOrder() : setIsReorderingCharacters(true)}
                className={`p-1.5 rounded-lg transition-colors ${isReorderingCharacters ? 'bg-amber-200 text-amber-800' : 'bg-stone-200 hover:bg-stone-300 text-stone-700'}`}
                title={isReorderingCharacters ? "儲存排序" : "排序角色"}
              >
                {isReorderingCharacters ? <Save className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
              </button>
              <button onClick={handleAddCharacter} className="p-1.5 bg-stone-200 hover:bg-stone-300 rounded-lg transition-colors" title="新增角色">
                <Plus className="w-4 h-4 text-stone-700" />
              </button>
            </div>
          </div>

          {isReorderingCharacters ? (
            <div className="flex-1 overflow-y-auto flex flex-col">
              <Reorder.Group axis="y" values={orderedCharacters} onReorder={setOrderedCharacters} className="space-y-2 flex-1">
                {orderedCharacters.map(char => (
                  <Reorder.Item key={char.id} value={char} className="bg-white p-2 rounded-lg shadow-sm border border-stone-200 flex items-center gap-3 cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-4 h-4 text-stone-400" />
                    <img src={getImageUrl(Object.values(db.costumes).find(c => c.characterId === char.id)?.imageName)} alt={char.name} className="w-8 h-8 rounded-md object-cover" />
                    <span>{char.name}</span>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
              <div className="mt-4 flex gap-2 sticky bottom-0 bg-stone-50 pt-2">
                <button onClick={handleSaveCharacterOrder} className="flex-1 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700">儲存</button>
                <button onClick={() => setIsReorderingCharacters(false)} className="flex-1 py-2 bg-stone-200 text-stone-600 rounded-lg text-sm hover:bg-stone-300">取消</button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 flex-1 overflow-y-auto">
              {characters.map(char => (
                <button
                  key={char.id}
                  onClick={() => handleSelectCharacter(char.id)}
                  className={`w-full text-left p-2 rounded-lg flex items-center gap-3 ${selectedCharacterId === char.id ? 'bg-amber-100 text-amber-800' : 'hover:bg-stone-200'}`}>
                  <img src={getImageUrl(Object.values(db.costumes).find(c => c.characterId === char.id)?.imageName)} alt={char.name} className="w-10 h-10 rounded-md object-cover" />
                  <span>{char.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Costumes Column */}
        <div className="col-span-4 bg-stone-50 rounded-xl border border-stone-200 p-4 overflow-y-auto flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{selectedCharacter?.name || '服裝'}</h3>
            {selectedCharacterId && (
              <div className="flex gap-1">
                {saveSuccess === 'costume' && (
                  <div className="p-1.5 text-emerald-600 flex items-center justify-center" title="儲存成功">
                    <Check className="w-4 h-4" />
                  </div>
                )}
                <button
                  onClick={() => isReorderingCostumes ? handleSaveCostumeOrder() : setIsReorderingCostumes(true)}
                  className={`p-1.5 rounded-lg transition-colors ${isReorderingCostumes ? 'bg-amber-200 text-amber-800' : 'bg-stone-200 hover:bg-stone-300 text-stone-700'}`}
                  title={isReorderingCostumes ? "儲存排序" : "排序服裝"}
                >
                  {isReorderingCostumes ? <Save className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                </button>
                <button onClick={handleAddCostume} className="p-1.5 bg-stone-200 hover:bg-stone-300 rounded-lg transition-colors" title="新增服裝">
                  <Plus className="w-4 h-4 text-stone-700" />
                </button>
              </div>
            )}
          </div>
          {selectedCharacterId && (
            isReorderingCostumes ? (
              <div className="flex-1 overflow-y-auto flex flex-col">
                <Reorder.Group axis="y" values={orderedCostumes} onReorder={setOrderedCostumes} className="space-y-2 flex-1">
                  {orderedCostumes.map(costume => (
                    <Reorder.Item key={costume.id} value={costume} className="bg-white p-2 rounded-lg shadow-sm border border-stone-200 flex items-center gap-3 cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-4 h-4 text-stone-400" />
                      <img src={getImageUrl(costume.imageName)} alt={costume.name} className="w-8 h-8 rounded-md object-cover" />
                      <span>{costume.name}</span>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
                <div className="mt-4 flex gap-2 sticky bottom-0 bg-stone-50 pt-2">
                  <button onClick={handleSaveCostumeOrder} className="flex-1 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700">儲存</button>
                  <button onClick={() => setIsReorderingCostumes(false)} className="flex-1 py-2 bg-stone-200 text-stone-600 rounded-lg text-sm hover:bg-stone-300">取消</button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 flex-1 overflow-y-auto">
                {costumes.map(costume => (
                  <button
                    key={costume.id}
                    onClick={() => setSelectedCostumeId(costume.id)}
                    className={`w-full text-left p-2 rounded-lg flex items-center gap-3 ${selectedCostumeId === costume.id ? 'bg-amber-100 text-amber-800' : 'hover:bg-stone-200'}`}>
                    <img src={getImageUrl(costume.imageName)} alt={costume.name} className="w-10 h-10 rounded-md object-cover" />
                    <span>{costume.name}</span>
                    {costume.isNew && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">NEW</span>}
                  </button>
                ))}
              </div>
            )
          )}
        </div>

        {/* Edit Column */}
        <div className="col-span-5 bg-stone-50 rounded-xl border border-stone-200 p-4 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">編輯</h3>
          {selectedCostume && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">服裝名稱</label>
                <input type="text" value={editCostumeName} onChange={e => setEditCostumeName(e.target.value)} className="w-full p-2 border border-stone-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">排序</label>
                <input type="number" value={editCostumeOrder} onChange={e => setEditCostumeOrder(Number(e.target.value))} className="w-full p-2 border border-stone-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">圖片名稱</label>
                <input type="text" value={editCostumeImageName} onChange={e => setEditCostumeImageName(e.target.value)} className="w-full p-2 border border-stone-300 rounded-lg" />
              </div>
              <div className="flex items-center">
                <input type="checkbox" id="isNew" checked={editCostumeIsNew} onChange={e => setEditCostumeIsNew(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
                <label htmlFor="isNew" className="ml-2 block text-sm text-stone-900">標示為NEW</label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateCostume}
                  className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors flex items-center justify-center gap-2 ${isCostumeSaved ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                >
                  {isCostumeSaved ? <><Check className="w-4 h-4" /> 已儲存</> : '儲存服裝'}
                </button>
                <button onClick={handleDeleteCostume} className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200" title="刪除服裝">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
          {selectedCharacter && !selectedCostume && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">角色名稱</label>
                <input type="text" value={editCharacterName} onChange={e => setEditCharacterName(e.target.value)} className="w-full p-2 border border-stone-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">排序</label>
                <input type="number" value={editCharacterOrder} onChange={e => setEditCharacterOrder(Number(e.target.value))} className="w-full p-2 border border-stone-300 rounded-lg" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleUpdateCharacter} className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">儲存角色</button>
                <button onClick={handleDeleteCharacter} className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200" title="刪除角色">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
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
      <InputModal
        isOpen={inputModal.isOpen}
        title={inputModal.title}
        message={inputModal.message}
        onConfirm={inputModal.onConfirm}
        onCancel={closeInputModal}
      />
    </div>
  );
}

function BackupManager() {
  const { db, restoreData } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = () => {
    try {
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(db, null, 2)
      )}`;
      const link = document.createElement("a");
      link.href = jsonString;
      link.download = `kazran_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
    } catch (error) {
      console.error("Backup failed:", error);
      alert("備份失敗，請檢查 console log 獲取更多資訊。");
    }
  };

  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text === 'string') {
          const restoredDb = JSON.parse(text);
          // Basic validation
          if (restoredDb.guilds && restoredDb.members && restoredDb.costumes) {
            await restoreData(restoredDb);
            alert("資料已成功還原！");
          } else {
            alert("無效的備份檔案格式。");
          }
        }
      } catch (error) {
        console.error("Restore failed:", error);
        alert("還原失敗，請確保檔案格式正確。");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6 text-stone-800 flex items-center gap-2">
        <Save className="w-6 h-6 text-amber-600" />
        備份與還原
      </h2>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-stone-50 p-8 rounded-2xl border border-stone-200 flex flex-col items-center justify-center text-center">
          <div className="p-4 bg-blue-100 rounded-full text-blue-600 mb-4">
            <Download className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-stone-800 mb-2">下載備份</h3>
          <p className="text-stone-500 mb-6 max-w-md">
            將目前的完整資料庫下載為 JSON 檔案。請妥善保管此檔案。
          </p>
          <button
            onClick={handleBackup}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-md"
          >
            下載備份檔
          </button>
        </div>

        <div className="bg-stone-50 p-8 rounded-2xl border border-stone-200 flex flex-col items-center justify-center text-center">
          <div className="p-4 bg-green-100 rounded-full text-green-600 mb-4">
            <Upload className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-stone-800 mb-2">從檔案還原</h3>
          <p className="text-stone-500 mb-6 max-w-md">
            從之前下載的 JSON 備份檔還原資料。注意：此操作將會覆寫所有現有資料。
          </p>
          <input type="file" accept=".json" onChange={handleRestore} ref={fileInputRef} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all active:scale-95 shadow-md"
          >
            選擇檔案並還原
          </button>
        </div>
      </div>
      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
        <div className="flex">
          <div className="py-1"><AlertCircle className="h-5 w-5 text-amber-500 mr-3" /></div>
          <div>
            <p className="font-bold text-amber-800">重要提示</p>
            <p className="text-sm text-amber-700">
              還原操作是不可逆的。在還原之前，強烈建議您先下載目前的資料作為備份。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
