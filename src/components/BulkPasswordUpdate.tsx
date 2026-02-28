import React, { useState, useRef } from 'react';
import { supabase } from '../supabase';
import Papa from 'papaparse';
import { Download, Upload, FileUp, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function BulkPasswordUpdate() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | null }>({
    message: '',
    type: null
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportCSV = async () => {
    setIsExporting(true);
    setStatus({ message: '', type: null });
    try {
      // 依照需求從 guilds 資料表中抓取 username，並依 tier 和 order_num 排序
      const { data, error } = await supabase
        .from('guilds')
        .select('username, tier, order_num')
        .order('tier', { ascending: true })
        .order('order_num', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        setStatus({ message: '目前沒有公會資料可供匯出', type: 'error' });
        return;
      }

      // 轉換成 CSV 格式，僅保留 username 並將 new_password 留空
      const csvData = data.map((row: any) => ({
        username: row.username,
        new_password: ''
      }));

      downloadCSV(csvData);
    } catch (error: any) {
      console.error('Export error:', error);
      setStatus({ message: '匯出失敗: ' + error.message, type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const downloadCSV = (data: any[]) => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `guild_members_passwords_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = async () => {
    // 🔽 加入這兩行來檢查你的「身分證」狀態
    const { data: { session } } = await supabase.auth.getSession();
    console.log("目前的登入狀態：", session);

    if (!session) {
      setStatus({ message: "系統偵測到你尚未登入，請重新登入！", type: 'error' });
      return;
    }

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setStatus({ message: '請先選擇 CSV 檔案', type: 'error' });
      return;
    }

    setIsImporting(true);
    try {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
complete: async (results) => {
          try {
            const rows = results.data as any[];
            
            // 🚨 修改重點 1：過濾條件加上 row.username，確保有帳號也有密碼
            const updatesArray = rows
              .filter(row => row.username && row.new_password && row.new_password.toString().trim() !== '')
              .map(row => ({
                // 🚨 修改重點 2：這次我們傳送 username 給後端，並且強制清除隱形空白 (.trim())
                username: row.username.toString().trim(),
                newPassword: row.new_password.toString().trim()
              }));

            if (updatesArray.length === 0) {
              setStatus({ message: 'CSV 檔案中沒有填寫新密碼的資料，或缺少 username 欄位', type: 'error' });
              setIsImporting(false);
              return;
            }

            console.log("準備送給 Edge Function 的陣列：", updatesArray);

            // 🚨 修改重點 3：把 data 也抓出來，用來讀取後端回傳的處理結果
            const { data, error } = await supabase.functions.invoke('update-password', {
              body: { updates: updatesArray }
            });

            if (error) {
              console.error('Edge Function Error:', error);
              throw error;
            }

            // 🚨 修改重點 4：分類統計成功與失敗的數量 (避免被伺服器騙說全部成功)
            const successes = data.results.filter((r: any) => r.status === 'success');
            const failures = data.results.filter((r: any) => r.status === 'failed');

            if (failures.length > 0) {
              // 如果有失敗的，印出統計數據與第一個失敗的原因
              setStatus({ 
                message: `批次處理完成！ ✅ 成功：${successes.length} 筆, ❌ 失敗：${failures.length} 筆 (錯誤範例: ${failures[0].reason})`, 
                type: 'error' 
              });
            } else {
              // 全數成功
              setStatus({ message: `✅ 完美！成功批次修改 ${successes.length} 筆密碼！`, type: 'success' });
            }

            if (fileInputRef.current) fileInputRef.current.value = '';
          } catch (err: any) {
            console.error('Import processing error:', err);
            setStatus({ message: '批次修改失敗: ' + (err.message || '發生未知錯誤'), type: 'error' });
          } finally {
            setIsImporting(false);
          }
        },
        error: (err) => {
          console.error('CSV Parse error:', err);
          setStatus({ message: '解析 CSV 失敗', type: 'error' });
          setIsImporting(false);
        }
      });
    } catch (error: any) {
      console.error('Import error:', error);
      setStatus({ message: '發生錯誤: ' + error.message, type: 'error' });
      setIsImporting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-2 border-b border-stone-100 pb-4">
        <FileUp className="w-6 h-6 text-amber-600" />
        <h2 className="text-xl font-bold text-stone-800">批次修改密碼 (CSV)</h2>
      </div>

      {/* Step 1: Export */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-stone-700 flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-stone-800 text-white text-xs">1</span>
          下載名單
        </h3>
        <p className="text-sm text-stone-500">
          點擊下方按鈕下載包含所有公會帳號的名單，並在 Excel 中填寫 <code className="bg-stone-100 px-1 rounded">new_password</code> 欄位。
        </p>
        <button
          onClick={handleExportCSV}
          disabled={isExporting}
          className="flex items-center gap-2 px-6 py-2.5 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-xl font-medium transition-all disabled:opacity-50"
        >
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          下載公會名單 (CSV)
        </button>
      </div>

      {/* Step 2: Import */}
      <div className="space-y-4 pt-4 border-t border-stone-100">
        <h3 className="text-lg font-semibold text-stone-700 flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-stone-800 text-white text-xs">2</span>
          上傳並修改
        </h3>
        <p className="text-sm text-stone-500">
          選擇填寫好新密碼的 CSV 檔案，系統將自動過濾空白密碼並進行批次更新。
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            className="flex-1 text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-stone-800 file:text-white hover:file:bg-stone-700 cursor-pointer"
          />
          <button
            onClick={handleImportCSV}
            disabled={isImporting || isExporting}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-amber-600 text-white hover:bg-amber-700 rounded-xl font-bold transition-all disabled:opacity-50 shadow-sm"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                處理中...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                開始批次修改密碼
              </>
            )}
          </button>
        </div>

        {status.message && (
          <div className={`p-4 rounded-xl flex items-center gap-3 text-sm border ${
            status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
          }`}>
            {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            {status.message}
          </div>
        )}

        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-bold">注意事項：</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>請確保 CSV 檔案中有 <code className="font-mono">username</code> 欄位，系統將以此作為修改依據。</li>
              <li>系統只會處理 <code className="font-mono">new_password</code> 欄位有內容的列。</li>
              <li>新密碼長度必須至少為 6 個字元。</li>
              <li>批次更新可能需要一些時間，請耐心等候結果通知。</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
