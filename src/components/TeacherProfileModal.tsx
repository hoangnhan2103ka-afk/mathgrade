import React, { useState } from 'react';
import { 
  X, 
  UserCheck, 
  Save, 
  Trash2, 
  RotateCcw, 
  School, 
  BookOpen, 
  Phone, 
  Mail, 
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { TeacherProfile } from '../types';
import { INITIAL_TEACHER } from '../data/mockData';

interface TeacherProfileModalProps {
  teacher: TeacherProfile;
  onSaveTeacher?: (profile: TeacherProfile) => void;
  onSave?: (profile: TeacherProfile) => void;
  onClearTeacher?: () => void;
  onClear?: () => void;
  onResetTeacher?: () => void;
  onReset?: () => void;
  onClose: () => void;
}

export const TeacherProfileModal: React.FC<TeacherProfileModalProps> = ({
  teacher,
  onSaveTeacher,
  onSave,
  onClearTeacher,
  onClear,
  onResetTeacher,
  onReset,
  onClose,
}) => {
  const [formData, setFormData] = useState<TeacherProfile>({ ...teacher });
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);

  const saveAction = onSaveTeacher || onSave;
  const clearAction = onClearTeacher || onClear;
  const resetAction = onResetTeacher || onReset;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (saveAction) {
      saveAction(formData);
    }
    setSaveSuccessMessage(true);
    setTimeout(() => {
      setSaveSuccessMessage(false);
      onClose();
    }, 800);
  };

  const handleExecuteClear = () => {
    if (clearAction) {
      clearAction();
    }
    setFormData({
      fullName: '',
      subject: 'Toán học',
      department: '',
      schoolName: '',
      phone: '',
      email: '',
      academicYear: '',
      notes: '',
    });
    setShowConfirmClear(false);
  };

  const handleExecuteReset = () => {
    if (resetAction) {
      resetAction();
    }
    setFormData({ ...INITIAL_TEACHER });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in duration-150">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Thông Tin Giáo Viên Bộ Môn</h3>
              <p className="text-xs text-slate-500">Quản lý hồ sơ giáo viên, xuất hiện trên báo cáo và bảng điểm</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Họ tên và Môn giảng dạy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Họ và Tên Giáo Viên <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Thầy Nguyễn Văn Hoàng"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bộ Môn Giảng Dạy <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <BookOpen className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Toán học"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Trường và Tổ bộ môn */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Trường Học / Đơn Vị Công Tác
              </label>
              <div className="relative">
                <School className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Ví dụ: Trường THPT Chuyên"
                  value={formData.schoolName || ''}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tổ Chuyên Môn
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Tổ Toán - Tin"
                value={formData.department || ''}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>
          </div>

          {/* Liên hệ: Điện thoại, Email & Năm học */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số Điện Thoại
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  placeholder="0912 345 678"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Liên Hệ
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  placeholder="gvtoan@edu.vn"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Năm Học
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="2024 - 2025"
                  value={formData.academicYear || ''}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Ghi chú giáo viên */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi Chú Phụ Trách / Lời Nhắn
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Giáo viên bộ môn Toán khối 10, 11, 12"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>

          {/* Khu vực Xóa / Đặt lại dữ liệu giáo viên */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Quản Lý Dữ Liệu Hồ Sơ
              </span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleExecuteReset}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors cursor-pointer"
                  title="Điền lại thông tin giáo viên mẫu ban đầu"
                >
                  <RotateCcw className="w-3 h-3 text-slate-500" />
                  <span>Dữ liệu mẫu</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmClear(true)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors cursor-pointer"
                  title="Xóa trống toàn bộ thông tin giáo viên"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Xóa thông tin GV</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Thông tin giáo viên sẽ được in tự động trên tiêu đề bìa sổ điểm, phiếu báo điểm học sinh và xuất file Excel.
            </p>
          </div>

          {/* Xác nhận xóa thông tin */}
          {showConfirmClear && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-rose-800 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Bạn có chắc chắn muốn xóa trống dữ liệu giáo viên?</span>
              </div>
              <p className="text-[11px] text-rose-700">
                Thao tác này sẽ xóa họ tên, trường, số điện thoại của giáo viên khỏi hệ thống.
              </p>
              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfirmClear(false)}
                  className="px-2.5 py-1 text-xs text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-md"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleExecuteClear}
                  className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-xs"
                >
                  Xác Nhận Xóa
                </button>
              </div>
            </div>
          )}

          {/* Nút hành động */}
          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            {saveSuccessMessage ? (
              <span className="text-xs text-emerald-600 font-bold">
                ✓ Đã lưu thông tin giáo viên!
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">
                Nhấn Lưu để áp dụng trên toàn hệ thống
              </span>
            )}

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="submit"
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu Thông Tin</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
