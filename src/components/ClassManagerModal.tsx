import React, { useState } from 'react';
import { 
  X, 
  Layers, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  AlertTriangle, 
  Check, 
  Users, 
  FileSpreadsheet, 
  Calendar,
  Building
} from 'lucide-react';
import { ClassRoom, Student, StudentScore, DisciplineRecord } from '../types';

interface ClassManagerModalProps {
  classes: ClassRoom[];
  currentClassId: string;
  students: Student[];
  scores?: StudentScore[];
  disciplines?: DisciplineRecord[];
  onSelectClass: (id: string) => void;
  onAddClass: (newClass: Omit<ClassRoom, 'id'>) => void;
  onUpdateClass: (id: string, updates: Partial<ClassRoom>) => void;
  onDeleteClass: (id: string) => void;
  onBatchAddClasses: (newClasses: Omit<ClassRoom, 'id'>[]) => void;
  onClose: () => void;
}

export const ClassManagerModal: React.FC<ClassManagerModalProps> = ({
  classes,
  currentClassId,
  students,
  scores = [],
  disciplines = [],
  onSelectClass,
  onAddClass,
  onUpdateClass,
  onDeleteClass,
  onBatchAddClasses,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'add_single' | 'add_batch'>('list');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  // Form thêm 1 lớp
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState<'10' | '11' | '12' | '9' | '8' | '7' | '6'>('10');
  const [newSchoolYear, setNewSchoolYear] = useState('2024 - 2025');
  const [newRoomNumber, setNewRoomNumber] = useState('');

  // Form sửa lớp
  const [editName, setEditName] = useState('');
  const [editGrade, setEditGrade] = useState<'10' | '11' | '12' | '9' | '8' | '7' | '6'>('10');
  const [editSchoolYear, setEditSchoolYear] = useState('');
  const [editRoomNumber, setEditRoomNumber] = useState('');

  // Form dán nhiều lớp
  const [batchText, setBatchText] = useState('');

  // Trạng thái xác nhận xóa lớp
  const [classToDelete, setClassToDelete] = useState<ClassRoom | null>(null);

  const startEdit = (cls: ClassRoom) => {
    setEditingClassId(cls.id);
    setEditName(cls.name);
    setEditGrade(cls.grade);
    setEditSchoolYear(cls.schoolYear);
    setEditRoomNumber(cls.roomNumber || '');
  };

  const saveEdit = (id: string) => {
    if (!editName.trim()) return;
    onUpdateClass(id, {
      name: editName.trim(),
      grade: editGrade,
      schoolYear: editSchoolYear.trim() || '2024 - 2025',
      roomNumber: editRoomNumber.trim() || undefined,
    });
    setEditingClassId(null);
  };

  const handleCreateSingle = (e: React.FormEvent) => {
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
    setViewMode('list');
  };

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchText.trim()) return;

    // Tách theo dòng hoặc dấu phẩy
    const rawNames = batchText
      .split(/[\n,;]+/)
      .map((n) => n.trim())
      .filter(Boolean);

    if (rawNames.length === 0) return;

    const list: Omit<ClassRoom, 'id'>[] = rawNames.map((name) => {
      // Suy luận khối từ tên lớp (vd: 10A1 -> khối 10, 11 Toán -> khối 11, 12D -> 12)
      let grade: '10' | '11' | '12' | '9' | '8' | '7' | '6' = '10';
      if (/^12/i.test(name)) grade = '12';
      else if (/^11/i.test(name)) grade = '11';
      else if (/^10/i.test(name)) grade = '10';
      else if (/^9/i.test(name)) grade = '9';
      else if (/^8/i.test(name)) grade = '8';
      else if (/^7/i.test(name)) grade = '7';
      else if (/^6/i.test(name)) grade = '6';

      return {
        name,
        grade,
        schoolYear: newSchoolYear.trim() || '2024 - 2025',
        semester: 'HK1',
      };
    });

    onBatchAddClasses(list);
    setBatchText('');
    setViewMode('list');
  };

  const confirmDeleteClass = () => {
    if (!classToDelete) return;
    onDeleteClass(classToDelete.id);
    setClassToDelete(null);
  };

  // Đếm học sinh & điểm cho 1 lớp
  const getClassStats = (classId: string) => {
    const classStudentsCount = students.filter((s) => s.classId === classId).length;
    const classScoresCount = scores.filter((s) => s.classId === classId).length;
    const classDisciplinesCount = disciplines.filter((d) => d.classId === classId).length;
    return { classStudentsCount, classScoresCount, classDisciplinesCount };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col">
        {/* Header Modal */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Quản Lý Dữ Liệu Lớp Học</h3>
              <p className="text-xs text-slate-500">
                Thêm, sửa, xóa lớp giảng dạy và điều chuyển học sinh
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

        {/* Tab chuyển đổi chế độ */}
        <div className="flex items-center justify-between py-3 border-b border-slate-100 shrink-0">
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Danh Sách Lớp ({classes.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('add_single')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                viewMode === 'add_single'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              + Thêm 1 Lớp
            </button>
            <button
              type="button"
              onClick={() => setViewMode('add_batch')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                viewMode === 'add_batch'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              + Nhập Nhiều Lớp
            </button>
          </div>

          <span className="text-xs text-slate-500">
            Lớp đang chọn: <strong className="text-indigo-700">{classes.find((c) => c.id === currentClassId)?.name || 'Chưa chọn'}</strong>
          </span>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          {/* VIEW: DANH SÁCH LỚP */}
          {viewMode === 'list' && (
            <div className="space-y-2">
              {classes.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Layers className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Chưa có lớp học nào trong hệ thống</p>
                  <button
                    type="button"
                    onClick={() => setViewMode('add_single')}
                    className="mt-3 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg"
                  >
                    Tạo lớp học đầu tiên
                  </button>
                </div>
              ) : (
                classes.map((cls) => {
                  const isCurrent = cls.id === currentClassId;
                  const isEditing = editingClassId === cls.id;
                  const stats = getClassStats(cls.id);

                  if (isEditing) {
                    return (
                      <div
                        key={cls.id}
                        className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-3"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Tên Lớp
                            </label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-md bg-white outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Khối
                            </label>
                            <select
                              value={editGrade}
                              onChange={(e) => setEditGrade(e.target.value as any)}
                              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white outline-hidden"
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
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Năm Học
                            </label>
                            <input
                              type="text"
                              value={editSchoolYear}
                              onChange={(e) => setEditSchoolYear(e.target.value)}
                              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white outline-hidden"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Phòng Học
                          </label>
                          <input
                            type="text"
                            value={editRoomNumber}
                            placeholder="Ví dụ: Phòng 204"
                            onChange={(e) => setEditRoomNumber(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white outline-hidden"
                          />
                        </div>

                        <div className="flex justify-end space-x-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingClassId(null)}
                            className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-md"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEdit(cls.id)}
                            className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs"
                          >
                            <Save className="w-3 h-3" />
                            <span>Lưu Thay Đổi</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={cls.id}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                        isCurrent
                          ? 'bg-indigo-50/40 border-indigo-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                            isCurrent
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {cls.grade || '10'}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-slate-900">{cls.name}</span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-md">
                                Đang chọn
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{cls.schoolYear}</span>
                            </span>
                            <span>•</span>
                            <span className="flex items-center space-x-1">
                              <Users className="w-3 h-3" />
                              <strong className="text-slate-800">{stats.classStudentsCount}</strong> hs
                            </span>
                            {cls.roomNumber && (
                              <>
                                <span>•</span>
                                <span className="flex items-center space-x-1">
                                  <Building className="w-3 h-3" />
                                  <span>{cls.roomNumber}</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Các nút hành động cho lớp */}
                      <div className="flex items-center space-x-2 self-end sm:self-center">
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => onSelectClass(cls.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors cursor-pointer"
                          >
                            Chọn lớp này
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => startEdit(cls)}
                          title="Sửa thông tin lớp"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setClassToDelete(cls)}
                          title="Xóa lớp học này"
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* VIEW: THÊM 1 LỚP */}
          {viewMode === 'add_single' && (
            <form onSubmit={handleCreateSingle} className="p-4 bg-slate-50 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Thông Tin Lớp Giảng Dạy Mới
              </h4>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên Lớp Học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 10A1, 11 Toán 2, 12 Tin..."
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Khối Lớp</label>
                  <select
                    value={newClassGrade}
                    onChange={(e) => setNewClassGrade(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white outline-hidden"
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
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phòng Học / Ghi Chú Địa Điểm
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Phòng 302, Dãy Nhà C"
                  value={newRoomNumber}
                  onChange={(e) => setNewRoomNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center space-x-1 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo Lớp Học</span>
                </button>
              </div>
            </form>
          )}

          {/* VIEW: NHẬP HÀNG LOẠT NHIỀU LỚP */}
          {viewMode === 'add_batch' && (
            <form onSubmit={handleCreateBatch} className="p-4 bg-slate-50 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Dán Danh Sách Nhiều Lớp Cùng Lúc
                </h4>
                <span className="text-[11px] text-slate-400">Cách nhau bằng dấu phẩy hoặc xuống dòng</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Năm Học Áp Dụng
                </label>
                <input
                  type="text"
                  value={newSchoolYear}
                  onChange={(e) => setNewSchoolYear(e.target.value)}
                  placeholder="2024 - 2025"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Danh Sách Tên Lớp
                </label>
                <textarea
                  rows={4}
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  placeholder="Ví dụ:&#10;10A1&#10;10A2&#10;11 Toán 1&#10;11 Toán 2&#10;12A3, 12A4"
                  className="w-full p-2.5 text-xs font-mono border border-slate-300 rounded-lg bg-white outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center space-x-1 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo Hàng Loạt Lớp</span>
                </button>
              </div>
            </form>
          )}

          {/* CẢNH BÁO XÓA LỚP */}
          {classToDelete && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-rose-800">
                    Xác nhận xóa lớp: <span className="underline">{classToDelete.name}</span>?
                  </h4>
                  {(() => {
                    const s = getClassStats(classToDelete.id);
                    return (
                      <p className="text-xs text-rose-700 leading-relaxed">
                        Lớp này đang có <strong>{s.classStudentsCount} học sinh</strong>,{' '}
                        <strong>{s.classScoresCount} bản ghi điểm</strong> và{' '}
                        <strong>{s.classDisciplinesCount} bản ghi nề nếp</strong>. Khi xóa lớp, toàn bộ học sinh và điểm số của lớp này sẽ bị xóa hoàn toàn khỏi hệ thống!
                      </p>
                    );
                  })()}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-rose-200/60">
                <button
                  type="button"
                  onClick={() => setClassToDelete(null)}
                  className="px-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteClass}
                  className="inline-flex items-center space-x-1 px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xác Nhận Xóa Lớp</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
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
