import React, { useState, useEffect } from 'react';
import { useAppContext } from '../store';
import { X, Save, CheckCircle2 } from 'lucide-react';
import { CostumeRecord } from '../types';

export default function MemberEditModal({ memberId, onClose }: { memberId: string, onClose: () => void }) {
  const { db, setDb } = useAppContext();
  const [localRecords, setLocalRecords] = useState<Record<string, CostumeRecord>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const member = db.members[memberId];

  useEffect(() => {
    if (member) {
      setLocalRecords(member.records || {});
    }
  }, [member]);

  if (!member) return null;

  const handleRecordChange = (costumeId: string, field: keyof CostumeRecord, value: any) => {
    setLocalRecords(prev => {
      const current = prev[costumeId] || { level: -1, weapon: false };
      return {
        ...prev,
        [costumeId]: { ...current, [field]: value }
      };
    });
  };

  const handleSave = () => {
    setIsSaving(true);
    setDb(prev => ({
      ...prev,
      members: {
        ...prev.members,
        [memberId]: {
          ...prev.members[memberId],
          records: localRecords,
          updatedAt: Date.now()
        }
      }
    }));
    
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 1000);
    }, 500);
  };

  const groupedCostumes = db.costume_definitions.reduce((acc, costume) => {
    if (!acc[costume.character]) acc[costume.character] = [];
    acc[costume.character].push(costume);
    return acc;
  }, {} as Record<string, typeof db.costume_definitions>);

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
          {Object.entries(groupedCostumes).map(([character, costumes]) => (
            <div key={character} className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="bg-stone-50 px-5 py-3 border-b border-stone-200">
                <h3 className="font-bold text-stone-800">{character}</h3>
              </div>
              <div className="divide-y divide-stone-100">
                {(costumes as any[]).map(costume => {
                  const record = localRecords[costume.id] || { level: -1, weapon: false };
                  return (
                    <div key={costume.id} className="p-4 flex flex-col gap-3 hover:bg-stone-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {costume.imageName && (
                          <div className="w-[40px] h-[40px] bg-stone-100 rounded-lg overflow-hidden border border-stone-200 flex-shrink-0">
                            <img 
                              src={`https://www.souseihaku.com/characters/${costume.imageName}.webp`} 
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
                              let activeColorClass = "bg-amber-500 text-white shadow-sm scale-105";
                              if (opt.val <= 0) activeColorClass = "bg-stone-600 text-white shadow-sm scale-105";
                              else if (opt.val <= 2) activeColorClass = "bg-blue-500 text-white shadow-sm scale-105";
                              else if (opt.val <= 4) activeColorClass = "bg-purple-500 text-white shadow-sm scale-105";

                              return (
                                <button
                                  key={opt.val}
                                  onClick={() => handleRecordChange(costume.id, 'level', opt.val)}
                                  className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-all ${
                                    record.level === opt.val 
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
                        
                        <label className="flex items-center gap-2 cursor-pointer group bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200 active:bg-stone-100 transition-colors shrink-0">
                          <span className={`text-sm font-bold transition-colors ${record.weapon ? 'text-amber-600' : 'text-stone-400'}`}>專武</span>
                          <div className="relative flex items-center">
                            <input 
                              type="checkbox" 
                              className="peer sr-only"
                              checked={record.weapon}
                              onChange={(e) => handleRecordChange(costume.id, 'weapon', e.target.checked)}
                            />
                            <div className="w-10 h-6 bg-stone-200 rounded-full peer peer-checked:bg-amber-500 transition-colors shadow-inner"></div>
                            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-md"></div>
                          </div>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white px-6 py-4 border-t border-stone-200 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2 text-stone-600 font-medium hover:bg-stone-100 rounded-xl transition-colors"
          >
            取消
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium shadow-sm transition-all active:scale-95 disabled:opacity-70"
          >
            {showSuccess ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            {showSuccess ? '已儲存' : isSaving ? '儲存中...' : '儲存變更'}
          </button>
        </div>
      </div>
    </div>
  );
}
