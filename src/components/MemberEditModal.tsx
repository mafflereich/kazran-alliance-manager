import React, { useState, useEffect } from 'react';
import { useAppContext } from '../store';
import { X, Save, CheckCircle2, Swords } from 'lucide-react';
import { getImageUrl } from '../utils';

export default function MemberEditModal({ memberId, onClose }: { memberId: string, onClose: () => void }) {
  const { db, updateMember } = useAppContext();
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const member = db.members[memberId];

  if (!member) return null;

  const [records, setRecords] = useState(member.records ?? {});
  const [exclusiveWeapons, setExclusiveWeapons] = useState(member.exclusiveWeapons ?? {});

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // The context now handles updates directly, so we just need to close.
      setShowSuccess(true);

      await updateMember(memberId, { records, exclusiveWeapons });

      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 1000);
    } catch (error) {
      console.error("Error updating member:", error);
      alert("儲存失敗，請稍後再試");
    } finally {
      setIsSaving(false);
    }
  };

  const characters = Object.values(db.characters).sort((a, b) => {
    const aHasNew = Object.values(db.costumes).some(c => c.characterId === a.id && c.new);
    const bHasNew = Object.values(db.costumes).some(c => c.characterId === b.id && c.new);

    if (aHasNew && !bHasNew) return -1;
    if (!aHasNew && bHasNew) return 1;

    return a.order - b.order;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
      <div className="bg-stone-100 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-white px-6 py-4 border-b border-stone-200 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-stone-800">編輯成員: {member.name}</h2>
            <p className="text-stone-500 text-sm">服裝練度與專武登記</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-stone-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {characters.map(character => {
            const hasExclusiveWeapon = exclusiveWeapons[character.id] ?? false;

            const characterCostumes = Object.values(db.costumes).filter(c => c.characterId === character.id).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
            return (
              <div key={character.id} className={`bg-white rounded-xl shadow-sm border ${hasExclusiveWeapon ? 'border-orange-400' : 'border-stone-200'} overflow-hidden`}>
                <div className="bg-stone-50 px-5 py-3 border-b border-stone-200 flex justify-between items-center">
                  <h3 className="font-bold text-stone-800">{character.name}</h3>
                  <label className="flex items-center gap-2 cursor-pointer group bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200 active:bg-stone-100 transition-colors shrink-0">
                    <Swords className={`w-4 h-4 transition-colors ${hasExclusiveWeapon ? 'text-amber-600' : 'text-stone-400'}`} />
                    <span className={`text-sm font-bold ${hasExclusiveWeapon ? 'text-amber-700' : 'text-stone-500'}`}>專武</span>
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={hasExclusiveWeapon}
                        onChange={(e) => setExclusiveWeapons({ ...exclusiveWeapons, [character.id]: e.target.checked })}
                      />
                      <div className="w-10 h-6 bg-stone-200 rounded-full peer peer-checked:bg-amber-500 transition-colors shadow-inner"></div>
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-md"></div>
                    </div>
                  </label>
                </div>
                <div className="divide-y divide-stone-100">
                  {characterCostumes.map(costume => {
                    const record = records[costume.id] || { level: -1 };

                    return (
                      <div key={costume.id} className="p-4 flex flex-col gap-3 hover:bg-stone-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          {costume.imageName && (
                            <div className="w-[40px] h-[40px] bg-stone-100 rounded-lg overflow-hidden border border-stone-200 flex-shrink-0">
                              <img
                                src={getImageUrl(costume.imageName)}
                                alt={costume.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          <div className="font-medium text-stone-800">
                            {costume.name}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 flex-1 flex-wrap">
                            <label className="text-sm font-bold text-stone-500 whitespace-nowrap mr-2">等級</label>
                            <div className="flex flex-wrap gap-1">
                              {[
                                { val: -1, label: '未持有' },
                                { val: 0, label: '+0' },
                                { val: 1, label: '+1' },
                                { val: 2, label: '+2' },
                                { val: 3, label: '+3' },
                                { val: 4, label: '+4' },
                                { val: 5, label: '+5' }
                              ].map(opt => {
                                let activeColorClass = "bg-orange-400 text-white shadow-sm scale-105";
                                if (opt.val <= 0) activeColorClass = "bg-stone-600 text-white shadow-sm scale-105";
                                else if (opt.val <= 2) activeColorClass = "bg-blue-400 text-white shadow-sm scale-105";
                                else if (opt.val <= 4) activeColorClass = "bg-purple-400 text-white shadow-sm scale-105";

                                return (
                                  <button
                                    key={opt.val}
                                    onClick={() => setRecords({ ...records, [costume.id]: { level: opt.val } })}
                                    className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-all ${record.level == opt.val
                                      ? activeColorClass
                                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                      }`}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          })
          }
        </div>

        <div className="bg-white px-6 py-4 border-t border-stone-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="p-2 text-stone-500 hover:bg-stone-100 rounded-xl transition-colors"
            title="取消"
          >
            <X className="w-6 h-6" />
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center justify-center p-2 rounded-xl font-medium shadow-sm transition-all active:scale-95 disabled:opacity-70 ${showSuccess ? 'bg-green-600 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            title={showSuccess ? '已儲存' : isSaving ? '儲存中...' : '儲存變更'}
          >
            {showSuccess ? <CheckCircle2 className="w-6 h-6" /> : <Save className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </div>
  );
}
