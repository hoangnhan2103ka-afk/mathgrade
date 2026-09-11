import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  Save, 
  Download, 
  Upload, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  UserCheck,
  Layers,
  Users,
  Sliders,
  Database,
  Trash2,
  Plus,
  Edit3,
  School,
  BookOpen,
  Phone,
  Mail,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { GradeWeights, TeacherProfile, ClassRoom, Student, StudentScore, DisciplineRecord } from '../types';
import { INITIAL_TEACHER } from '../data/mockData';

interface SettingsModalProps {
  weights: GradeWeights;
  teacher: TeacherProfile;
  classes: ClassRoom[];
  students: Student[];
  scores: StudentScore[];
  disciplines: DisciplineRecord[];
  currentClassId: string;
  onSaveWeights: (weights: GradeWeights) => void;
  onSaveTeacher: (profile: TeacherProfile) => void;
  onClearTeacher: () => void;
  onResetTeacher: () => void;
  onAddClass: (newClass: Omit<ClassRoom, 'id'>) => void;
  onUpdateClass: (id: string, updates: Partial<ClassRoom>) => void;
  onDeleteClass: (id: string) => void;
  onClearClassStudents: (classId: string) => void;
  onClearAllStudents: () => void;
  onClearAllData: () => void;
  onExportAllData: () => void;
  onImportAllData: (jsonData: string) => boolean;
  onResetToDemo: () => void;
  onClose: () => void;
  initialTab?: 'teacher' | 'classes' | 'students' | 'weights' | 'backup';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  weights,
  teacher,
  classes,
  students,
  scores,
  disciplines,
  currentClassId,
  onSaveWeights,
  onSaveTeacher,
  onClearTeacher,
  onResetTeacher,
  onAddClass,
  onUpdateClass,
  onDeleteClass,
  onClearClassStudents,
  onClearAllStudents,
  onClearAllData,
  onExportAllData,
  onImportAllData,
  onResetToDemo,
  onClose,
  initialTab = 'teacher',
}) => {
  const [activeTab, setActiveTab] = useState<'teacher' | 'classes' | 'students' | 'weights' | 'backup'>(initialTab);

  // 1. Teacher State
  const [teacherForm, setTeacherForm] = useState<TeacherProfile>({ ...teacher });
  const [teacherSavedMsg, setTeacherSavedMsg] = useState(false);
  const [showConfirmClearTeacher, setShowConfirmClearTeacher] = useState(false);

  // 2. Weights State
  const [formWeights, setFormWeights] = useState<GradeWeights>({ ...weights });

  // 3. Class Form State
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState<'10' | '11' | '12' | '9' | '8' | '7' | '6'>('10');
  const [newSchoolYear, setNewSchoolYear] = useState('2024 - 2025');
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [editClassGrade, setEditClassGrade] = useState<'10' | '11' | '12' | '9' | '8' | '7' | '6'>('10');
  const [classToDelete, setClassToDelete] = useState<ClassRoom | null>(null);

  // 4. Student Management Confirmation States
  const [classToClearStudents, setClassToClearStudents] = useState<ClassRoom | null>(null);
  const [showClearAllStudentsConfirm, setShowClearAllStudentsConfirm] = useState(false);
  const [showClearAllSystemConfirm, setShowClearAllSystemConfirm] = useState(false);

  // 5. Backup State
  const [importStatus, setImportStatus] = useState<string>('');

  // Handle Teacher Save
  const handleSaveTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveTeacher(teacherForm);
    setTeacherSavedMsg(true);
    setTimeout(() => setTeacherSavedMsg(false), 2000);
  };

  // Handle Teacher Clear
  const handleClearTeacher = () => {
    onClearTeacher();
    setTeacherForm({
      fullName: '',
      subject: 'Toán học',
      department: '',
      schoolName: '',
      phone: '',
      email: '',
      academicYear: '',
      notes: '',
    });
    setShowConfirmClearTeacher(false);
  };

  // Handle Weights Save
  const handleSaveWeights = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveWeights(formWeights);
    onClose();
  };

  // Handle Add Class
  const handleAddClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    onAddClass({
      name: newClassName.trim(),
      grade: newClassGrade,
      schoolYear: newSchoolYear.trim() || '2024 - 2025',
      semester: 'HK1',
      roomNumber: newRoomNumber.trim() || undefined,
    });
    setNewClassName('');
    setNewRoomNumber('');
  };

  // Handle Edit Class
  const handleSaveEditClass = (id: string) => {
    if (!editClassName.trim()) return;
    onUpdateClass(id, {
      name: editClassName.trim(),
      grade: editClassGrade,
    });
    setEditingClassId(null);
  };

  // Handle File Upload JSON
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const success = onImportAllData(text);
        if (success) {
          setImportStatus('Khôi phục dữ liệu thành công!');
          setTimeout(() => onClose(), 1200);
        } else {
          setImportStatus('Lỗi: File sao lưu không đúng cấu trúc!');
        }
      } catch (err) {
        setImportStatus('Lỗi: Không thể đọc file dữ liệu!');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-150">
        {/* Header Modal */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Quản Lý Dữ Liệu & Cài Đặt Hệ Thống
              </h3>
              <p className="text-xs text-slate-500">
                Quản trị toàn diện: Giáo viên, Lớp học, Học sinh, Hệ số TT22 & Sao lưu
              </p>
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 mt-3 overflow-x-auto scrollbar-none shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('teacher')}
            className={`inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'teacher'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Giáo Viên</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('classes')}
            className={`inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'classes'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Dữ Liệu Lớp ({classes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className={`inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'students'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Dữ Liệu Học Sinh ({students.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('weights')}
            className={`inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'weights'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Hệ Số TT22</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'backup'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Sao Lưu & Đặt Lại</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* TAB 1: GIÁO VIÊN */}
          {activeTab === 'teacher' && (
            <form onSubmit={handleSaveTeacherSubmit} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Thông tin này xuất hiện trên tiêu đề sổ điểm, báo cáo định kỳ, phiếu điểm phụ huynh và file Excel xuất ra.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Họ và Tên Giáo Viên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Thầy Nguyễn Văn Hoàng"
                    value={teacherForm.fullName}
                    onChange={(e) => setTeacherForm({ ...teacherForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm font-semibold border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Môn Giảng Dạy <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Toán học"
                    value={teacherForm.subject}
                    onChange={(e) => setTeacherForm({ ...teacherForm, subject: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Trường Học / Đơn Vị
                  </label>
                  <input
                    type="text"
                    placeholder="Trường THPT Chuyên"
                    value={teacherForm.schoolName || ''}
                    onChange={(e) => setTeacherForm({ ...teacherForm, schoolName: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tổ Chuyên Môn
                  </label>
                  <input
                    type="text"
                    placeholder="Tổ Toán - Tin"
                    value={teacherForm.department || ''}
                    onChange={(e) => setTeacherForm({ ...teacherForm, department: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số Điện Thoại</label>
                  <input
                    type="tel"
                    placeholder="0912 345 678"
                    value={teacherForm.phone || ''}
                    onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="gvtoan@edu.vn"
                    value={teacherForm.email || ''}
                    onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Năm Học</label>
                  <input
                    type="text"
                    placeholder="2024 - 2025"
                    value={teacherForm.academicYear || ''}
                    onChange={(e) => setTeacherForm({ ...teacherForm, academicYear: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Nút Xóa dữ liệu giáo viên & Đặt về mẫu */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Thao Tác Dữ Liệu Giáo Viên
                  </span>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        onResetTeacher();
                        setTeacherForm({ ...INITIAL_TEACHER });
                      }}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3 text-slate-500" />
                      <span>Dữ liệu mẫu</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmClearTeacher(true)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Xóa thông tin GV</span>
                    </button>
                  </div>
                </div>
              </div>

              {showConfirmClearTeacher && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-rose-800">
                    Xác nhận xóa trắng toàn bộ thông tin giáo viên?
                  </p>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowConfirmClearTeacher(false)}
                      className="px-2.5 py-1 text-xs text-slate-600 bg-white border border-slate-300 rounded-md"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleClearTeacher}
                      className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md"
                    >
                      Xác Nhận Xóa
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                {teacherSavedMsg && (
                  <span className="text-xs text-emerald-600 font-bold">✓ Đã lưu hồ sơ giáo viên!</span>
                )}
                <div className="ml-auto">
                  <button
                    type="submit"
                    className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Lưu Dữ Liệu Giáo Viên</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: QUẢN LÝ DỮ LIỆU LỚP HỌC */}
          {activeTab === 'classes' && (
            <div className="space-y-4">
              {/* Form thêm lớp mới */}
              <form onSubmit={handleAddClassSubmit} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Nhập Thêm Lớp Giảng Dạy Mới
                  </h4>
                  <span className="text-[11px] text-slate-500">Toán THCS / THPT</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      required
                      placeholder="Tên lớp (ví dụ: 10A3, 11 Tin...)"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white outline-hidden"
                    />
                  </div>
                  <div>
                    <select
                      value={newClassGrade}
                      onChange={(e) => setNewClassGrade(e.target.value as any)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-hidden"
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
                    <input
                      type="text"
                      placeholder="Phòng học (tùy chọn)"
                      value={newRoomNumber}
                      onChange={(e) => setNewRoomNumber(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-hidden"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm Lớp</span>
                  </button>
                </div>
              </form>

              {/* Danh sách các lớp hiện tại & Thao tác xóa */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Danh Sách Lớp Giảng Dạy Hiện Có
                </h4>
                {classes.map((cls) => {
                  const studentCount = students.filter((s) => s.classId === cls.id).length;
                  const isEditing = editingClassId === cls.id;

                  if (isEditing) {
                    return (
                      <div key={cls.id} className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editClassName}
                            onChange={(e) => setEditClassName(e.target.value)}
                            className="px-2 py-1 text-xs border border-slate-300 rounded-md bg-white font-bold"
                          />
                          <select
                            value={editClassGrade}
                            onChange={(e) => setEditClassGrade(e.target.value as any)}
                            className="px-2 py-1 text-xs border border-slate-300 rounded-md bg-white"
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
                        <div className="flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => setEditingClassId(null)}
                            className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-md"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditClass(cls.id)}
                            className="px-3 py-1 text-xs font-bold text-white bg-indigo-600 rounded-md shadow-xs"
                          >
                            Lưu Sửa
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={cls.id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center">
                          {cls.grade}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-xs text-slate-900">{cls.name}</span>
                            {cls.id === currentClassId && (
                              <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded-md">
                                Đang chọn
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {cls.schoolYear} • Sĩ số: <strong className="text-slate-700">{studentCount}</strong> học sinh
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingClassId(cls.id);
                            setEditClassName(cls.name);
                            setEditClassGrade(cls.grade);
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors"
                          title="Sửa tên/khối lớp"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setClassToDelete(cls)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                          title="Xóa lớp này khỏi hệ thống"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Hộp thoại xác nhận xóa lớp */}
              {classToDelete && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-rose-800 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Xác nhận xóa lớp {classToDelete.name}?</span>
                  </div>
                  <p className="text-xs text-rose-700">
                    Lớp này có {students.filter((s) => s.classId === classToDelete.id).length} học sinh. Toàn bộ học sinh và điểm số của lớp sẽ bị xóa vĩnh viễn!
                  </p>
                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setClassToDelete(null)}
                      className="px-2.5 py-1 text-xs text-slate-600 bg-white border border-slate-300 rounded-md"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteClass(classToDelete.id);
                        setClassToDelete(null);
                      }}
                      className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-xs"
                    >
                      Xác Nhận Xóa Lớp
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: QUẢN LÝ DỮ LIỆU HỌC SINH */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Thống Kê Dữ Liệu Học Sinh & Điểm Số
                </h4>
                <p className="text-xs text-slate-600">
                  Tổng cộng: <strong className="text-slate-900">{students.length} học sinh</strong>,{' '}
                  <strong className="text-slate-900">{scores.length} bản ghi điểm</strong> và{' '}
                  <strong className="text-slate-900">{disciplines.length} bản ghi nề nếp</strong>.
                </p>
              </div>

              {/* Xóa học sinh theo từng lớp */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Xóa Danh Sách Học Sinh Theo Lớp
                </h4>
                {classes.map((cls) => {
                  const classStudents = students.filter((s) => s.classId === cls.id);
                  return (
                    <div
                      key={cls.id}
                      className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-900">{cls.name}</span>
                        <span className="text-xs text-slate-500 ml-2">
                          ({classStudents.length} học sinh)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setClassToClearStudents(cls)}
                        disabled={classStudents.length === 0}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md disabled:opacity-40 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Xóa học sinh lớp {cls.name}</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Xác nhận xóa học sinh theo lớp */}
              {classToClearStudents && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-rose-800">
                    Xác nhận xóa sạch toàn bộ học sinh trong lớp {classToClearStudents.name}?
                  </p>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setClassToClearStudents(null)}
                      className="px-2.5 py-1 text-xs text-slate-600 bg-white border border-slate-300 rounded-md"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClearClassStudents(classToClearStudents.id);
                        setClassToClearStudents(null);
                      }}
                      className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md"
                    >
                      Xóa Sạch
                    </button>
                  </div>
                </div>
              )}

              {/* Xóa toàn bộ học sinh tất cả các lớp */}
              <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-rose-800">
                      Xóa Toàn Bộ Học Sinh Toàn Hệ Thống
                    </h5>
                    <p className="text-[11px] text-rose-600">
                      Chuẩn bị đón năm học mới: Giữ lại thông tin lớp học và hệ số, làm trống toàn bộ danh sách học sinh & điểm số.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowClearAllStudentsConfirm(true)}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa Tất Cả HS</span>
                  </button>
                </div>

                {showClearAllStudentsConfirm && (
                  <div className="p-3 bg-white border border-rose-300 rounded-lg space-y-2 mt-2">
                    <p className="text-xs font-bold text-rose-800">
                      Cảnh báo: Thao tác này sẽ xóa vĩnh viễn {students.length} học sinh và toàn bộ điểm số!
                    </p>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowClearAllStudentsConfirm(false)}
                        className="px-2.5 py-1 text-xs text-slate-600 bg-slate-100 rounded-md"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onClearAllStudents();
                          setShowClearAllStudentsConfirm(false);
                        }}
                        className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md"
                      >
                        Xác Nhận Xóa Toàn Bộ HS
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: HỆ SỐ THÔNG TƯ 22 */}
          {activeTab === 'weights' && (
            <form onSubmit={handleSaveWeights} className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Hệ Số Tính Điểm Trung Bình Môn Toán (Thông Tư 22)
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Đ. Thường Xuyên
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={formWeights.regularWeight}
                      onChange={(e) =>
                        setFormWeights({ ...formWeights, regularWeight: Number(e.target.value) })
                      }
                      className="w-full text-center px-3 py-1.5 text-xs sm:text-sm font-bold border border-slate-300 rounded-lg outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400 text-center block mt-0.5">Mặc định: 1</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Đ. Giữa Kỳ
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={formWeights.midtermWeight}
                      onChange={(e) =>
                        setFormWeights({ ...formWeights, midtermWeight: Number(e.target.value) })
                      }
                      className="w-full text-center px-3 py-1.5 text-xs sm:text-sm font-bold border border-slate-300 rounded-lg outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400 text-center block mt-0.5">Mặc định: 2</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Đ. Cuối Kỳ
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={formWeights.finalWeight}
                      onChange={(e) =>
                        setFormWeights({ ...formWeights, finalWeight: Number(e.target.value) })
                      }
                      className="w-full text-center px-3 py-1.5 text-xs sm:text-sm font-bold border border-slate-300 rounded-lg outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400 text-center block mt-0.5">Mặc định: 3</span>
                  </div>
                </div>
              </div>

              {/* Quy chế điểm cộng lên bảng */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Quy Chế Tích Lũy Điểm Thưởng & Lên Bảng
                </h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        1 Điểm Thưởng Quy Đổi =
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min="0.05"
                        max="1.0"
                        value={formWeights.bonusScale}
                        onChange={(e) =>
                          setFormWeights({ ...formWeights, bonusScale: Number(e.target.value) })
                        }
                        className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Điểm Cộng Tối Đa
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.5"
                        max="2.0"
                        value={formWeights.maxBonusAllowed}
                        onChange={(e) =>
                          setFormWeights({ ...formWeights, maxBonusAllowed: Number(e.target.value) })
                        }
                        className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu Quy Chế Hệ Số</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 5: SAO LƯU & ĐẶT LẠI DỮ LIỆU */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Sao Lưu & Khôi Phục Toàn Diện
                </h4>
                <p className="text-xs text-slate-600">
                  Xuất toàn bộ giáo viên, danh sách lớp, học sinh, điểm số, nề nếp và cấu hình ra file JSON để lưu trữ an toàn hoặc chuyển sang máy tính khác.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onExportAllData}
                    className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Sao Lưu Tệp JSON</span>
                  </button>

                  <label className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Khôi Phục Tệp JSON</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {importStatus && (
                  <div className="mt-2 p-2 bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs rounded-lg flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{importStatus}</span>
                  </div>
                )}
              </div>

              {/* Khôi phục demo hoặc Xóa trắng toàn hệ thống */}
              <div className="p-3.5 bg-rose-50/50 border border-rose-200 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                  Khôi Phục Mẫu Hoặc Xóa Trắng Hệ Thống
                </h4>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Khôi phục toàn bộ dữ liệu mẫu ban đầu (Giáo viên, các lớp 10A1, 10A2, học sinh mẫu)?')) {
                        onResetToDemo();
                        onClose();
                      }
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                    <span>Khôi Phục Dữ Liệu Mẫu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowClearAllSystemConfirm(true)}
                    className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa Sạch Toàn Bộ Hệ Thống</span>
                  </button>
                </div>

                {showClearAllSystemConfirm && (
                  <div className="p-3 bg-white border border-rose-300 rounded-lg space-y-2 mt-2">
                    <p className="text-xs font-bold text-rose-800">
                      Cảnh báo nghiêm trọng: Thao tác này sẽ xóa sạch tất cả giáo viên, lớp học, học sinh và điểm số.
                    </p>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowClearAllSystemConfirm(false)}
                        className="px-2.5 py-1 text-xs text-slate-600 bg-slate-100 rounded-md"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onClearAllData();
                          setShowClearAllSystemConfirm(false);
                          onClose();
                        }}
                        className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md"
                      >
                        Xác Nhận Xóa Sạch Hoàn Toàn
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
