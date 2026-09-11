import React, { useState } from 'react';
import { 
  BookOpen, 
  Settings, 
  Download, 
  Plus, 
  Calendar, 
  Layers, 
  Database,
  CheckCircle2,
  FileSpreadsheet,
  UserCheck,
  Cloud,
  RefreshCw,
  CloudOff
} from 'lucide-react';
import { ClassRoom, TeacherProfile } from '../types';

interface NavbarProps {
  classes: ClassRoom[];
  currentClassId: string;
  teacher: TeacherProfile;
  onSelectClass: (id: string) => void;
  onAddClass: (newClass: Omit<ClassRoom, 'id'>) => void;
  semester: 'HK1' | 'HK2';
  onChangeSemester: (sem: 'HK1' | 'HK2') => void;
  activeTab: string;
  onChangeTab: (tab: string) => void;
  onOpenSettings: () => void;
  onOpenTeacherProfile: () => void;
  onOpenClassManager: () => void;
  onQuickExportExcel: () => void;
  syncStatus?: 'synced' | 'syncing' | 'offline' | 'error';
  onOpenSyncModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  classes,
  currentClassId,
  teacher,
  onSelectClass,
  onAddClass,
  semester,
  onChangeSemester,
  activeTab,
  onChangeTab,
  onOpenSettings,
  onOpenTeacherProfile,
  onOpenClassManager,
  onQuickExportExcel,
  syncStatus = 'synced',
  onOpenSyncModal,
}) => {
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState<'10' | '11' | '12' | '9' | '8' | '7' | '6'>('10');
  const [newSchoolYear, setNewSchoolYear] = useState('2024 - 2025');
  const [newRoomNumber, setNewRoomNumber] = useState('');

  const currentClass = classes.find((c) => c.id === currentClassId) || classes[0];

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    onAddClass({
      name: newClassName.trim(),
      grade: newClassGrade,
      schoolYear: newSchoolYear.trim() || '2024 - 2025',
      semester,
      roomNumber: newRoomNumber.trim() || undefined,
    });
    setNewClassName('');
    setShowAddClassModal(false);
  };

  const navItems = [
    { id: 'gradebook', label: 'Sổ Điểm Môn Toán', icon: BookOpen },
    { id: 'bonus', label: 'Điểm Cộng & Lên Bảng', icon: Layers },
    { id: 'discipline', label: 'Sổ Nề Nếp Giờ Học', icon: CheckCircle2 },
    { id: 'students', label: 'Danh Sách Lớp', icon: Calendar },
    { id: 'reports', label: 'Thống Kê & Báo Cáo', icon: FileSpreadsheet },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand & Teacher Profile Button */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-sm font-bold text-xl tracking-tight">
              ∑
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">MathGrade</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                  GV Toán
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Quản lý điểm số, nề nếp & báo cáo định kỳ theo hệ số TT22
              </p>
            </div>

            {/* Nút Hồ sơ giáo viên */}
            <button
              type="button"
              onClick={onOpenTeacherProfile}
              className="hidden lg:flex items-center space-x-1.5 ml-2 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Nhập / Sửa / Xóa thông tin giáo viên bộ môn"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span className="max-w-[130px] truncate">
                {teacher.fullName ? teacher.fullName : 'Hồ sơ GV'}
              </span>
            </button>
          </div>

          {/* Selector: Lớp học & Học kỳ */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Lựa chọn Lớp */}
            <div className="flex items-center bg-slate-50 border border-slate-300 rounded-lg p-1">
              <select
                id="select-classroom"
                value={currentClassId}
                onChange={(e) => onSelectClass(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-800 pr-2 pl-2 py-1 outline-hidden cursor-pointer"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.schoolYear})
                  </option>
                ))}
              </select>
              <button
                id="btn-add-class"
                type="button"
                onClick={() => setShowAddClassModal(true)}
                title="Thêm lớp giảng dạy mới"
                className="p-1 hover:bg-slate-200 text-slate-600 hover:text-indigo-600 rounded-md transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onOpenClassManager}
                title="Quản lý danh sách lớp (Thêm, Sửa, Xóa lớp)"
                className="p-1 hover:bg-slate-200 text-slate-600 hover:text-indigo-600 rounded-md transition-colors cursor-pointer"
              >
                <Layers className="w-4 h-4" />
              </button>
            </div>

            {/* Học kỳ Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium">
              <button
                id="btn-semester-hk1"
                type="button"
                onClick={() => onChangeSemester('HK1')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  semester === 'HK1'
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Học kỳ 1
              </button>
              <button
                id="btn-semester-hk2"
                type="button"
                onClick={() => onChangeSemester('HK2')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  semester === 'HK2'
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Học kỳ 2
              </button>
            </div>

            {/* Xuất Excel Nhanh */}
            <button
              id="btn-quick-export"
              type="button"
              onClick={onQuickExportExcel}
              title="Xuất bảng điểm ra file Excel (.xlsx)"
              className="hidden md:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Excel</span>
            </button>

            {/* Nút Đồng bộ Đa Thiết Bị */}
            <button
              id="btn-open-sync"
              type="button"
              onClick={onOpenSyncModal}
              title="Đồng bộ dữ liệu đa thiết bị (Máy tính & Điện thoại)"
              className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                syncStatus === 'synced'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : syncStatus === 'syncing'
                  ? 'bg-blue-50 text-blue-800 border-blue-200 animate-pulse'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              {syncStatus === 'synced' && <Cloud className="w-3.5 h-3.5 text-emerald-600" />}
              {syncStatus === 'syncing' && <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />}
              {syncStatus === 'offline' && <CloudOff className="w-3.5 h-3.5 text-amber-600" />}
              {syncStatus === 'error' && <CloudOff className="w-3.5 h-3.5 text-rose-600" />}
              <span className="hidden sm:inline">
                {syncStatus === 'synced' ? 'Đã đồng bộ' : syncStatus === 'syncing' ? 'Đang lưu...' : 'Đồng bộ'}
              </span>
            </button>

            {/* Nút Cài đặt & Quản lý dữ liệu */}
            <button
              id="btn-open-settings"
              type="button"
              onClick={onOpenSettings}
              title="Quản lý dữ liệu & cài đặt hệ số"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 sm:space-x-4 border-t border-slate-100 overflow-x-auto py-1 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                type="button"
                onClick={() => onChangeTab(item.id)}
                className={`flex items-center space-x-2 py-2.5 px-3 border-b-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-indigo-600 text-indigo-700 font-semibold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Modal Thêm Lớp Mới */}
      {showAddClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Thêm Lớp Giảng Dạy Mới</h3>
            <p className="text-xs text-slate-500 mb-4">Nhập thông tin lớp học Toán bạn phụ trách</p>

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tên Lớp *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 10A2, 11 Toán 1, 12D..."
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Khối Lớp</label>
                  <select
                    value={newClassGrade}
                    onChange={(e) => setNewClassGrade(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden bg-white"
                  >
                    <option value="12">Khối 12</option>
                    <option value="11">Khối 11</option>
                    <option value="10">Khối 10</option>
                    <option value="9">Khối 9</option>
                    <option value="8">Khối 8</option>
                    <option value="7">Khối 7</option>
                    <option value="6">Khối 6</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Năm Học</label>
                  <input
                    type="text"
                    value={newSchoolYear}
                    onChange={(e) => setNewSchoolYear(e.target.value)}
                    placeholder="2024 - 2025"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phòng Học (Ghi chú)</label>
                <input
                  type="text"
                  value={newRoomNumber}
                  onChange={(e) => setNewRoomNumber(e.target.value)}
                  placeholder="Ví dụ: Phòng 204, Dãy B"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddClassModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
                >
                  Tạo Lớp Học
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
