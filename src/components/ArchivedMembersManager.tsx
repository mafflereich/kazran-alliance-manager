import React, { useState, useEffect } from 'react';
import { supabase, toCamel } from '../supabase';
import { useAppContext } from '../store';
import { Archive, History, RotateCcw, ChevronDown, ChevronUp, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate } from '../utils';
import { ArchivedMember, ArchiveHistory } from '../types';



export default function ArchivedMembersManager() {
  const { db, unarchiveMember, showToast } = useAppContext();
  const [archivedMembers, setArchivedMembers] = useState<ArchivedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [unarchiveModal, setUnarchiveModal] = useState<{
    isOpen: boolean;
    member: ArchivedMember | null;
    targetGuildId: string;
  }>({
    isOpen: false,
    member: null,
    targetGuildId: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchArchivedMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('members')
        .select(`
          id,
          name,
          status,
          archive_remark,
          members_archive_history (
            id,
            member_id,
            from_guild_id,
            archive_reason,
            archived_at,
            guilds (
              name
            )
          )
        `)
        .eq('status', 'archived')
        .order('archived_at', { referencedTable: 'members_archive_history', ascending: false });

      if (error) throw error;

      // Sort history arrays manually just in case Supabase order isn't perfect for nested arrays
      const members = (data as any[]).map(member => ({
        ...member,
        membersArchiveHistory: (toCamel(member.members_archive_history) as ArchiveHistory[]).sort((a, b) =>
          new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime()
        )
      })).sort((a, b) => {
        // Sort members by their latest archive date (descending)
        const dateA = a.membersArchiveHistory[0]?.archivedAt ? new Date(a.membersArchiveHistory[0].archivedAt).getTime() : 0;
        const dateB = b.membersArchiveHistory[0]?.archivedAt ? new Date(b.membersArchiveHistory[0].archivedAt).getTime() : 0;
        return dateB - dateA;
      });

      setArchivedMembers(members);
    } catch (error) {
      console.error('Error fetching archived members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedMembers();
  }, []);

  const toggleExpand = (memberId: string) => {
    setExpandedMemberId(expandedMemberId === memberId ? null : memberId);
  };

  const openUnarchiveModal = (member: ArchivedMember) => {
    // Default to the last guild if available, otherwise first available guild
    const lastGuildId = member.membersArchiveHistory[0]?.fromGuildId;
    const defaultGuildId = (lastGuildId && db.guilds[lastGuildId]) ? lastGuildId : (Object.keys(db.guilds)[0] || '');

    setUnarchiveModal({
      isOpen: true,
      member,
      targetGuildId: defaultGuildId,
    });
  };

  const closeUnarchiveModal = () => {
    setUnarchiveModal({
      isOpen: false,
      member: null,
      targetGuildId: '',
    });
  };



  const handleUnarchive = async () => {
    if (!unarchiveModal.member || !unarchiveModal.targetGuildId) return;

    setIsProcessing(true);
    try {

      await unarchiveMember(unarchiveModal.member.id, unarchiveModal.targetGuildId);

      // Update local state
      setArchivedMembers(prev => prev.filter(m => m.id !== unarchiveModal.member?.id));

      // Adjust page if current page becomes empty
      const remainingMembers = archivedMembers.length - 1;
      const maxPage = Math.ceil(remainingMembers / itemsPerPage);
      if (currentPage > maxPage && maxPage > 0) {
        setCurrentPage(maxPage);
      }

      showToast(`已成功將成員 ${unarchiveModal.member.name} 移動至 ${db.guilds[unarchiveModal.targetGuildId]?.name}`, 'success');
      closeUnarchiveModal();
    } catch (error: any) {
      console.error('Unarchive failed:', error);
      showToast(`解除封存失敗: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(archivedMembers.length / itemsPerPage);
  const paginatedMembers = archivedMembers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return <div className="p-8 text-center text-stone-500">載入中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Archive className="w-6 h-6 text-stone-600" />
        <h2 className="text-2xl font-bold text-stone-800">封存成員管理</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-600">
            <tr>
              <th className="p-4 font-semibold">成員名稱</th>
              <th className="p-4 font-semibold">最後所屬公會</th>
              <th className="p-4 font-semibold">最後封存時間</th>
              <th className="p-4 font-semibold text-center">總封存次數</th>
              <th className="p-4 font-semibold text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {paginatedMembers.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-stone-500">
                  目前沒有已封存的成員
                </td>
              </tr>
            ) : (
              paginatedMembers.map((member) => {
                const latestHistory = member.membersArchiveHistory[0];
                const isExpanded = expandedMemberId === member.id;

                return (
                  <React.Fragment key={member.id}>
                    <tr className={`hover:bg-stone-50 transition-colors ${isExpanded ? 'bg-stone-50' : ''}`}>
                      <td className="p-4 font-medium text-stone-800">{member.name}</td>
                      <td className="p-4 text-stone-600">
                        {latestHistory?.guilds?.name || '未知'}
                      </td>
                      <td className="p-4 text-stone-500 text-sm">
                        {latestHistory ? formatDate(latestHistory.archivedAt) : '-'}
                      </td>
                      <td className="p-4 text-center text-stone-600">
                        <span className="bg-stone-100 px-2 py-1 rounded-full text-xs font-medium">
                          {member.membersArchiveHistory.length}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => toggleExpand(member.id)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${isExpanded
                              ? 'bg-amber-100 text-amber-700'
                              : 'text-stone-500 hover:bg-stone-100'
                              }`}
                          >
                            <History className="w-4 h-4" />
                            {isExpanded ? '隱藏歷史' : '查看歷史'}
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={() => openUnarchiveModal(member)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-sm transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                            解除封存
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded History Row */}
                    <AnimatePresence>
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="p-0 border-b border-stone-100">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="bg-stone-50/50 overflow-hidden"
                            >
                              <div className="p-4 pl-12 pr-12">
                                <h4 className="text-sm font-semibold text-stone-500 mb-3 flex items-center gap-2">
                                  <History className="w-4 h-4" /> 封存歷史紀錄
                                </h4>
                                <div className="space-y-3 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
                                  {member.membersArchiveHistory.map((history, index) => (
                                    <div key={history.id} className="relative pl-6">
                                      <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-stone-200 border-2 border-white"></div>
                                      <div className="bg-white p-3 rounded-lg border border-stone-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                                        <div className="flex items-center gap-4">
                                          <span className="text-xs font-bold text-stone-400 w-6">#{member.membersArchiveHistory.length - index}</span>
                                          <div className="flex flex-col">
                                            <span className="text-sm font-medium text-stone-800">
                                              離開公會: {history.guilds?.name || '未知'}
                                            </span>
                                            <span className="text-xs text-stone-500">
                                              {formatDate(history.archivedAt)}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="text-sm text-stone-600 bg-stone-50 px-3 py-1 rounded border border-stone-100 max-w-md truncate">
                                          原因: {history.archiveReason || '無'}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            上一頁
          </button>
          <span className="text-stone-600 font-medium">
            第 {currentPage} 頁 / 共 {totalPages} 頁
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-white border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            下一頁
          </button>
        </div>
      )}

      {/* Unarchive Modal */}
      {unarchiveModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-stone-50 px-6 py-4 border-b border-stone-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-green-600" />
                解除封存確認
              </h3>
              <button onClick={closeUnarchiveModal} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-stone-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-bold mb-1">即將恢復成員資料</p>
                  <p>您正在解除封存成員 <strong>{unarchiveModal.member?.name}</strong>。</p>
                  <p>這將會恢復該成員的所有服裝練度資料。</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  請選擇要移動到的公會
                </label>
                <select
                  className="w-full p-2.5 border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 outline-none"
                  value={unarchiveModal.targetGuildId}
                  onChange={(e) => setUnarchiveModal(prev => ({ ...prev, targetGuildId: e.target.value }))}
                >
                  {Object.values(db.guilds)
                    .sort((a, b) => {
                      const tierA = a.tier || 0;
                      const tierB = b.tier || 0;
                      if (tierA !== tierB) return tierA - tierB;
                      const orderA = a.orderNum || 0;
                      const orderB = b.orderNum || 0;
                      return orderA - orderB;
                    })
                    .map((guild) => (
                      <option key={guild.id} value={guild.id}>
                        {guild.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={handleUnarchive}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? '處理中...' : '確認移動'}
                </button>
                <button
                  onClick={closeUnarchiveModal}
                  className="flex-1 py-2.5 bg-stone-200 text-stone-700 rounded-xl font-bold hover:bg-stone-300 transition-all active:scale-95"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
