import React, { useState } from 'react';
import { X, Sparkles, Award, Check, Trash2, Edit3, Plus, AlertCircle, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Student, StudentScore } from '../types';

interface QuickBonusModalProps {
  student: Student;
  currentScore?: StudentScore;
  onAwardBonus: (bonusPoints: number, note: string, addAsRegularScore: boolean) => void;
  onUpdateBonus?: (newTotal: number, newCount: number, note?: string) => void;
  onDeleteBonus?: () => void;
  onClose: () => void;
}

export const QuickBonusModal: React.FC<QuickBonusModalProps> = ({
  student,
  currentScore,
  onAwardBonus,
  onUpdateBonus,
  onDeleteBonus,
  onClose,
}) => {
  const currentTotal = currentScore?.boardBonusTotal || 0;
  const currentCount = currentScore?.boardBonusCount || 0;

  // Chế độ: 'add' (cộng thêm) hoặc 'edit' (sửa / xóa)
  const [activeTab, setActiveTab] = useState<'add' | 'edit'>('add');

  // State cho chế độ cộng thêm
  const [points, setPoints] = useState<number>(0.5);
  const [note, setNote] = useState<string>('Lên bảng giải bài tập');
  const [addAsRegular, setAddAsRegular] = useState<boolean>(false);

  // State cho chế độ sửa / xóa
  const [editTotal, setEditTotal] = useState<number>(currentTotal);
  const [editCount, setEditCount] = useState<number>(currentCount);
  const [editNote, setEditNote] = useState<string>(currentScore?.teacherNote || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Xử lý cộng thêm điểm
  const handleConfirmAward = (e: React.FormEvent) => {
    e.preventDefault();
    onAwardBonus(points, note, addAsRegular);
    confetti({
      particleCount: 35,
      spread: 50,
      origin: { y: 0.6 },
    });
    onClose();
  };

  // Xử lý lưu sửa đổi
  const handleConfirmUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateBonus) {
      onUpdateBonus(editTotal, editCount, editNote);
    }
    onClose();
  };

  // Xử lý xóa toàn bộ điểm cộng
  const handleExecuteDelete = () => {
    if (onDeleteBonus) {
      onDeleteBonus();
    } else if (onUpdateBonus) {
      onUpdateBonus(0, 0);
    }
    onClose();
  };

  // Điều chỉnh nhanh ở chế độ sửa
  const adjustEditTotal = (delta: number) => {
    setEditTotal((prev) => {
      const next = Math.max(0, Math.round((prev + delta) * 100) / 100);
      return next;
    });
    if (delta < 0) {
      setEditCount((prev) => Math.max(0, prev - 1));
    } else if (delta > 0) {
      setEditCount((prev) => prev + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
        {/* Header Modal */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900">
              Quản Lý Điểm Cộng Lên Bảng
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thông tin học sinh tóm tắt */}
        <div className="mt-3 p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-amber-800 font-medium">Học sinh:</div>
            <div className="text-sm font-bold text-slate-900">
              #{student.stt} - {student.fullName}
            </div>
            <div className="text-xs text-slate-500 font-mono">{student.studentCode}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-slate-500">Tích lũy hiện tại</div>
            <div className="text-base font-extrabold text-amber-700">
              +{currentTotal} đ
            </div>
            <div className="text-[11px] text-slate-500">
              {currentCount} lần lên bảng
            </div>
          </div>
        </div>

        {/* Chuyển đổi Tab Chức Năng: Cộng thêm hoặc Sửa/Xóa */}
        <div className="flex rounded-lg bg-slate-100 p-1 mt-3.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-1.5 rounded-md flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              activeTab === 'add'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5 text-amber-600" />
            <span>Chấm Điểm Mới</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`flex-1 py-1.5 rounded-md flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              activeTab === 'edit'
                ? 'bg-white text-amber-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Sửa / Xóa Điểm Cộng</span>
          </button>
        </div>

        {/* TAB 1: CHẤM THÊM ĐIỂM */}
        {activeTab === 'add' && (
          <form onSubmit={handleConfirmAward} className="space-y-4 pt-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Chọn Mức Điểm Cộng Thêm
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[0.25, 0.5, 0.75, 1.0].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPoints(val)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      points === val
                        ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-2xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    +{val} đ
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nội Dung Bài Toán / Ghi Chú
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: Giải đúng bài phương trình lượng giác..."
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-amber-500 bg-slate-50 focus:bg-white"
              />
            </div>

            <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <input
                type="checkbox"
                checked={addAsRegular}
                onChange={(e) => setAddAsRegular(e.target.checked)}
                className="rounded-sm border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="font-medium">Đồng thời thêm một cột ĐTX 10 điểm</span>
            </label>

            <div className="flex justify-between items-center pt-2">
              {currentTotal > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className="text-xs text-indigo-600 hover:underline flex items-center space-x-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Sửa hoặc xóa điểm hiện có</span>
                </button>
              )}
              <div className="flex space-x-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs flex items-center space-x-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Cộng Điểm</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: SỬA HOẶC XÓA ĐIỂM CỘNG */}
        {activeTab === 'edit' && (
          <form onSubmit={handleConfirmUpdate} className="space-y-4 pt-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Chỉnh Sửa Trực Tiếp</span>
                <span className="text-[11px] font-normal text-slate-500">Đề phòng nhập nhầm học sinh</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Tổng điểm cộng (đ):
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="10"
                    value={editTotal}
                    onChange={(e) => setEditTotal(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full text-sm font-bold text-amber-800 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Số lần lên bảng:
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="50"
                    value={editCount}
                    onChange={(e) => setEditCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-sm font-bold text-slate-800 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>

              {/* Nút điều chỉnh nhanh */}
              <div>
                <div className="text-[10px] text-slate-500 mb-1 font-medium">Điều chỉnh nhanh:</div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => adjustEditTotal(-0.5)}
                    className="px-2 py-1 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md cursor-pointer"
                  >
                    -0.5 đ
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustEditTotal(-0.25)}
                    className="px-2 py-1 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md cursor-pointer"
                  >
                    -0.25 đ
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustEditTotal(0.25)}
                    className="px-2 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md cursor-pointer"
                  >
                    +0.25 đ
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustEditTotal(0.5)}
                    className="px-2 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md cursor-pointer"
                  >
                    +0.5 đ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditTotal(0);
                      setEditCount(0);
                    }}
                    className="px-2 py-1 text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md ml-auto cursor-pointer"
                  >
                    Đặt về 0
                  </button>
                </div>
              </div>
            </div>

            {/* Vùng Xóa Sạch Điểm Cộng */}
            <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-rose-900">Xóa Điểm Cộng Lên Bảng</div>
                  <div className="text-[11px] text-rose-700">
                    Đặt lại điểm cộng về 0đ nếu chấm nhầm cho học sinh này
                  </div>
                </div>

                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-xs cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa điểm</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md text-xs cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteDelete}
                      className="px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-md text-xs shadow-xs cursor-pointer"
                    >
                      Xác nhận xóa
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center space-x-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Lưu Điểm Sửa</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

