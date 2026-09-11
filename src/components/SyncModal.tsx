import React, { useState } from 'react';
import { 
  X, 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Laptop, 
  Smartphone, 
  Check, 
  Copy, 
  Share2, 
  Database,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertCircle
} from 'lucide-react';
import { getDeviceId } from '../services/syncService';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncedAt: Date | null;
  onForceSync: () => Promise<void>;
  onPullServerData: () => Promise<void>;
  totalClasses: number;
  totalStudents: number;
  totalScores: number;
  totalDisciplines: number;
  onRestoreMasterDefault?: () => Promise<boolean | void>;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  syncStatus,
  lastSyncedAt,
  onForceSync,
  onPullServerData,
  totalClasses,
  totalStudents,
  totalScores,
  totalDisciplines,
  onRestoreMasterDefault,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSyncingAction, setIsSyncingAction] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const deviceId = getDeviceId();
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleManualSync = async () => {
    setIsSyncingAction(true);
    setActionMessage(null);
    try {
      await onForceSync();
      setActionMessage('Đã đồng bộ thành công lên máy chủ đám mây!');
    } catch {
      setActionMessage('Đồng bộ thất bại. Vui lòng kiểm tra kết nối.');
    } finally {
      setIsSyncingAction(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleManualPull = async () => {
    setIsSyncingAction(true);
    setActionMessage(null);
    try {
      await onPullServerData();
      setActionMessage('Đã tải và làm mới dữ liệu mới nhất từ máy chủ!');
    } catch {
      setActionMessage('Không thể tải dữ liệu từ máy chủ.');
    } finally {
      setIsSyncingAction(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleRestoreMaster = async () => {
    if (!onRestoreMasterDefault) return;
    const confirm = window.confirm(
      'Bạn có chắc chắn muốn khôi phục dữ liệu gốc của Thầy Hoàng Duy Nhân (gồm 3 lớp 10A5, 10A6, 10A7 và toàn bộ điểm số)?'
    );
    if (!confirm) return;

    setIsSyncingAction(true);
    setActionMessage(null);
    try {
      await onRestoreMasterDefault();
      setActionMessage('Đã khôi phục thành công dữ liệu gốc Thầy Hoàng Duy Nhân (10A5, 10A6, 10A7)!');
    } catch {
      setActionMessage('Khôi phục thất bại. Vui lòng thử lại.');
    } finally {
      setIsSyncingAction(false);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Đồng Bộ Đa Thiết Bị (Cloud Sync)
              </h3>
              <p className="text-xs text-slate-500">
                Lưu trữ tập trung và đồng bộ dữ liệu giữa Máy tính & Điện thoại
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung chính */}
        <div className="space-y-5 py-4 text-xs sm:text-sm">
          {/* Trạng thái hiện tại */}
          <div className={`p-4 rounded-xl border flex items-start space-x-3 ${
            syncStatus === 'synced'
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : syncStatus === 'syncing'
              ? 'bg-blue-50/70 border-blue-200 text-blue-900'
              : 'bg-amber-50/70 border-amber-200 text-amber-900'
          }`}>
            <div className="mt-0.5 shrink-0">
              {syncStatus === 'synced' && <Cloud className="w-5 h-5 text-emerald-600" />}
              {syncStatus === 'syncing' && <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />}
              {syncStatus === 'offline' && <CloudOff className="w-5 h-5 text-amber-600" />}
              {syncStatus === 'error' && <AlertCircle className="w-5 h-5 text-rose-600" />}
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm">
                {syncStatus === 'synced' && 'Đang kết nối & Đã đồng bộ an toàn'}
                {syncStatus === 'syncing' && 'Đang đồng bộ dữ liệu với máy chủ...'}
                {syncStatus === 'offline' && 'Chế độ ngoại tuyến (lưu tạm cục bộ)'}
                {syncStatus === 'error' && 'Gặp sự cố khi đồng bộ'}
              </div>
              <div className="text-xs opacity-90 mt-1">
                {lastSyncedAt ? (
                  <>Đồng bộ lần cuối: <span className="font-semibold">{lastSyncedAt.toLocaleTimeString('vi-VN')} ngày {lastSyncedAt.toLocaleDateString('vi-VN')}</span></>
                ) : (
                  'Chưa có lượt đồng bộ nào trong phiên này'
                )}
              </div>
            </div>
          </div>

          {/* Thông tin thiết bị hiện tại */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center space-x-1.5">
                {isMobile ? <Smartphone className="w-4 h-4 text-slate-600" /> : <Laptop className="w-4 h-4 text-slate-600" />}
                <span>Thiết bị hiện tại:</span>
              </span>
              <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                {deviceId}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200/80 text-center text-xs">
              <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Lớp học</span>
                <span className="font-bold text-slate-800">{totalClasses}</span>
              </div>
              <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Học sinh</span>
                <span className="font-bold text-slate-800">{totalStudents}</span>
              </div>
              <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Bản ghi điểm</span>
                <span className="font-bold text-slate-800">{totalScores}</span>
              </div>
              <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Sổ nề nếp</span>
                <span className="font-bold text-slate-800">{totalDisciplines}</span>
              </div>
            </div>
          </div>

          {/* Hướng dẫn mở trên điện thoại / máy tính khác */}
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-2.5">
            <div className="flex items-center space-x-2 text-indigo-900 font-bold text-xs">
              <Share2 className="w-4 h-4 text-indigo-600" />
              <span>Cách mở trên Điện thoại hoặc Máy tính khác:</span>
            </div>
            <p className="text-xs text-indigo-800 leading-relaxed">
              Bạn chỉ cần sao chép liên kết này và mở trên trình duyệt điện thoại (Safari, Chrome...) hoặc laptop khác. Dữ liệu sẽ tự động đồng bộ hai chiều!
            </p>
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="text"
                readOnly
                value={window.location.href}
                className="flex-1 text-xs bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-mono outline-hidden select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0 cursor-pointer shadow-xs"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Đã chép!' : 'Sao chép link'}</span>
              </button>
            </div>
          </div>

          {/* Thông báo thao tác */}
          {actionMessage && (
            <div className="text-xs text-center font-medium p-2 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 animate-in fade-in">
              {actionMessage}
            </div>
          )}

          {/* Các nút thao tác thủ công */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncingAction}
              className="flex-1 flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
            >
              <ArrowUpCircle className={`w-4 h-4 ${isSyncingAction ? 'animate-spin' : ''}`} />
              <span>Đồng bộ ngay lên đám mây</span>
            </button>

            <button
              type="button"
              onClick={handleManualPull}
              disabled={isSyncingAction}
              className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 font-semibold rounded-xl text-xs border border-slate-200 transition-colors cursor-pointer"
            >
              <ArrowDownCircle className="w-4 h-4 text-slate-600" />
              <span>Tải lại từ máy chủ</span>
            </button>
          </div>

          {/* Nút khôi phục dữ liệu gốc Thầy Hoàng Duy Nhân (10A5, 10A6, 10A7) */}
          {onRestoreMasterDefault && (
            <div className="pt-2 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={handleRestoreMaster}
                disabled={isSyncingAction}
                className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 font-medium rounded-xl text-xs border border-amber-200 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                <span>Khôi phục dữ liệu gốc Thầy Hoàng Duy Nhân (10A5, 10A6, 10A7)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
