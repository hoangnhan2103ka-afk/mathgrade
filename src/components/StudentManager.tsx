import React, { useState } from 'react';
import { 
  Plus, 
  Users, 
  FileSpreadsheet, 
  Trash2, 
  Edit3, 
  Upload, 
  Check, 
  X, 
  Download,
  AlertCircle,
  Sparkles,
  CheckSquare,
  Square,
  AlertTriangle,
  Phone
} from 'lucide-react';
import { Student, ClassRoom, Gender } from '../types';
import * as XLSX from 'xlsx';
import { AIRosterImportModal } from './AIRosterImportModal';
import {
  formatDisplayDate,
  formatPhoneDisplay,
  parseExcelDate,
  normalizeVietnamesePhone
} from '../utils/excelRosterParser';

interface StudentManagerProps {
  classroom: ClassRoom;
  students: Student[];
  onAddStudent: (student: Omit<Student, 'id' | 'classId'>) => void;
  onUpdateStudent: (id: string, updates: Partial<Student>) => void;
  onDeleteStudent: (id: string) => void;
  onBatchDeleteStudents?: (studentIds: string[]) => void;
  onClearClassStudents?: (classId: string) => void;
  onBatchImportStudents: (newStudents: Omit<Student, 'id' | 'classId'>[], mode?: 'append' | 'replace') => void;
}

export const StudentManager: React.FC<StudentManagerProps> = ({
  classroom,
  students,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onBatchDeleteStudents,
  onClearClassStudents,
  onBatchImportStudents,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showAIRosterModal, setShowAIRosterModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Trạng thái chọn nhiều học sinh
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showClearClassConfirm, setShowClearClassConfirm] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // Form state thêm đơn lẻ
  const [stt, setStt] = useState<number>(students.length + 1);
  const [studentCode, setStudentCode] = useState<string>(`HS${classroom.grade}0${students.length + 1}`);
  const [fullName, setFullName] = useState<string>('');
  const [gender, setGender] = useState<Gender>('Nam');
  const [dateOfBirth, setDateOfBirth] = useState<string>('2009-01-01');
  const [phone, setPhone] = useState<string>('');
  const [parentPhone, setParentPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Form state nhập hàng loạt
  const [batchText, setBatchText] = useState<string>('');
  const [batchError, setBatchError] = useState<string>('');

  // Tỷ lệ Nam/Nữ
  const maleCount = students.filter((s) => s.gender === 'Nam').length;
  const femaleCount = students.filter((s) => s.gender === 'Nữ').length;

  const handleOpenAdd = () => {
    setStt(students.length + 1);
    setStudentCode(`HS${classroom.grade}${String(students.length + 1).padStart(2, '0')}`);
    setFullName('');
    setGender('Nam');
    setDateOfBirth('2009-01-01');
    setPhone('');
    setParentPhone('');
    setNotes('');
    setShowAddModal(true);
  };

  const defaultTargetYear = 2024 - (parseInt(classroom.grade, 10) || 10) - 5;

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    const cleanDob = dateOfBirth ? parseExcelDate(dateOfBirth, defaultTargetYear) : `${defaultTargetYear}-01-01`;
    const cleanParentPhone = parentPhone.trim() ? normalizeVietnamesePhone(parentPhone.trim()) : undefined;
    const cleanStudentPhone = phone.trim() ? normalizeVietnamesePhone(phone.trim()) : undefined;

    onAddStudent({
      stt,
      studentCode: studentCode.trim() || `HS${stt}`,
      fullName: fullName.trim(),
      gender,
      dateOfBirth: cleanDob,
      phone: cleanStudentPhone,
      parentPhone: cleanParentPhone,
      notes: notes.trim() || undefined,
    });

    setShowAddModal(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editingStudent.fullName.trim()) return;

    const cleanDob = editingStudent.dateOfBirth ? parseExcelDate(editingStudent.dateOfBirth, defaultTargetYear) : `${defaultTargetYear}-01-01`;
    const cleanParentPhone = editingStudent.parentPhone?.trim() ? normalizeVietnamesePhone(editingStudent.parentPhone.trim()) : undefined;
    const cleanStudentPhone = editingStudent.phone?.trim() ? normalizeVietnamesePhone(editingStudent.phone.trim()) : undefined;

    onUpdateStudent(editingStudent.id, {
      stt: editingStudent.stt,
      studentCode: editingStudent.studentCode,
      fullName: editingStudent.fullName.trim(),
      gender: editingStudent.gender,
      dateOfBirth: cleanDob,
      phone: cleanStudentPhone,
      parentPhone: cleanParentPhone,
      notes: editingStudent.notes?.trim() || undefined,
    });

    setEditingStudent(null);
  };

  // Xử lý parse danh sách từ văn bản hoặc Excel
  const handleProcessBatchText = () => {
    if (!batchText.trim()) {
      setBatchError('Vui lòng dán nội dung danh sách học sinh');
      return;
    }

    const lines = batchText.split('\n').filter((l) => l.trim().length > 0);
    const parsedStudents: Omit<Student, 'id' | 'classId'>[] = [];

    lines.forEach((line, index) => {
      // Tách theo tab (copy từ Excel) hoặc dấu phẩy
      const parts = (line.includes('\t') ? line.split('\t') : line.split(',')).map((p) => p.trim());
      const currentStt = students.length + index + 1;

      let name = '';
      let code = `HS${classroom.grade}${String(currentStt).padStart(2, '0')}`;
      let stGender: Gender = 'Nam';
      let dob = `${defaultTargetYear}-01-01`;
      let pPhone = '';
      let notesVal = '';

      if (parts.length === 1) {
        // Chỉ có mỗi họ tên
        name = parts[0].trim();
      } else {
        // Duyệt từng ô để nhận dạng thông minh
        const nonSttParts = /^\d+$/.test(parts[0]) && parts.length > 2 ? parts.slice(1) : parts;
        
        for (let i = 0; i < nonSttParts.length; i++) {
          const val = nonSttParts[i];
          if (!val) continue;

          // 1. Nhận diện giới tính
          if (/^(Nam|Nữ|Nu)$/i.test(val)) {
            stGender = /^N/i.test(val) && !/^Nam$/i.test(val) ? 'Nữ' : 'Nam';
            continue;
          }

          // 2. Nhận diện Ngày sinh (chứa / hoặc - hoặc . hoặc 4 số năm)
          if (/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})|\b(19\d\d|20\d\d)\b/.test(val) && dob.includes('-01-01')) {
            dob = parseExcelDate(val, defaultTargetYear);
            continue;
          }

          // 3. Nhận diện Số điện thoại
          if (/(?:\+?84|0)?[35789]\d{8}/.test(val) && !pPhone) {
            pPhone = normalizeVietnamesePhone(val);
            continue;
          }

          // 4. Nhận diện Mã học sinh
          if (/^HS\w+/i.test(val) && code.startsWith(`HS${classroom.grade}`)) {
            code = val.toUpperCase();
            continue;
          }

          // 5. Nhận diện Họ tên (chữ cái tiếng Việt, độ dài >= 3)
          if (!name && /[a-zA-ZÀ-ỹ]{2,}/.test(val) && val.length >= 3 && !/^\d+$/.test(val)) {
            // Kiểm tra ô kế tiếp có phải là tên đơn không
            if (i + 1 < nonSttParts.length && /^[a-zA-ZÀ-ỹ]{2,10}$/.test(nonSttParts[i + 1]) && !/^(Nam|Nữ)$/i.test(nonSttParts[i + 1])) {
              name = `${val} ${nonSttParts[i + 1]}`.trim();
              i++;
            } else {
              name = val.trim();
            }
            continue;
          }

          // 6. Ghi chú
          if (!notesVal && val.length > 2 && name && val !== name) {
            notesVal = val;
          }
        }
      }

      if (name) {
        parsedStudents.push({
          stt: currentStt,
          studentCode: code,
          fullName: name,
          gender: stGender,
          dateOfBirth: dob,
          parentPhone: pPhone || undefined,
          notes: notesVal || undefined,
        });
      }
    });

    if (parsedStudents.length === 0) {
      setBatchError('Không nhận diện được học sinh nào từ văn bản. Vui lòng kiểm tra lại định dạng.');
      return;
    }

    onBatchImportStudents(parsedStudents);
    setBatchText('');
    setBatchError('');
    setShowBatchModal(false);
  };

  // Xuất danh sách lớp ra Excel
  const handleExportRoster = () => {
    const headers = ['STT', 'Mã Học Sinh', 'Họ và Tên', 'Giới Tính', 'Ngày Sinh', 'SĐT Phụ Huynh', 'Ghi Chú'];
    const rows = students.map((s) => [
      s.stt,
      s.studentCode,
      s.fullName,
      s.gender,
      formatDisplayDate(s.dateOfBirth),
      formatPhoneDisplay(s.parentPhone || ''),
      s.notes || '',
    ]);

    const worksheetData = [
      [`DANH SÁCH HỌC SINH LỚP ${classroom.name.toUpperCase()} - MÔN TOÁN`],
      [`Năm học: ${classroom.schoolYear} | Sĩ số: ${students.length} (Nam: ${maleCount}, Nữ: ${femaleCount})`],
      [],
      headers,
      ...rows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DanhSachLop');
    XLSX.writeFile(wb, `DanhSach_${classroom.name.replace(/\s+/g, '_')}.xlsx`);
  };

  // Chọn / bỏ chọn 1 học sinh
  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Chọn tất cả / Bỏ chọn tất cả
  const toggleSelectAll = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((s) => s.id));
    }
  };

  // Xóa các học sinh đã chọn
  const handleExecuteBatchDelete = () => {
    if (onBatchDeleteStudents) {
      onBatchDeleteStudents(selectedStudentIds);
    } else {
      selectedStudentIds.forEach((id) => onDeleteStudent(id));
    }
    setSelectedStudentIds([]);
    setShowBatchDeleteConfirm(false);
  };

  // Xóa toàn bộ học sinh lớp này
  const handleExecuteClearClass = () => {
    if (onClearClassStudents) {
      onClearClassStudents(classroom.id);
    } else {
      students.forEach((s) => onDeleteStudent(s.id));
    }
    setSelectedStudentIds([]);
    setShowClearClassConfirm(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Danh Sách & Nút Thao Tác */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">
              Quản Lý Danh Sách Học Sinh - {classroom.name}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Sĩ số: <span className="font-bold text-slate-800">{students.length} học sinh</span> (Nam: {maleCount}, Nữ: {femaleCount}) • Năm học {classroom.schoolYear}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Nút Nhập Bằng Excel / AI */}
          <button
            type="button"
            onClick={() => setShowAIRosterModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-all cursor-pointer ring-2 ring-indigo-500/20"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Nhập từ Excel / AI (Ảnh, File)</span>
          </button>

          {/* Nút Nhập Nhanh / Copy Paste */}
          <button
            type="button"
            onClick={() => setShowBatchModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            <span>Dán văn bản</span>
          </button>

          {/* Xuất file danh sách */}
          <button
            type="button"
            onClick={handleExportRoster}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Excel</span>
          </button>

          {/* Nút Thêm 1 học sinh */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Học Sinh</span>
          </button>

          {/* Nút Xóa Toàn Bộ Học Sinh Lớp Này */}
          <button
            type="button"
            onClick={() => setShowClearClassConfirm(true)}
            disabled={students.length === 0}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
            title="Xóa sạch danh sách học sinh của lớp này"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa danh sách lớp</span>
          </button>
        </div>
      </div>

      {/* Thanh tác vụ khi có học sinh được chọn */}
      {selectedStudentIds.length > 0 && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center space-x-2 text-xs font-bold text-indigo-900">
            <CheckSquare className="w-4 h-4 text-indigo-600" />
            <span>Đã chọn {selectedStudentIds.length} / {students.length} học sinh</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setSelectedStudentIds([])}
              className="px-2.5 py-1 text-xs text-slate-600 hover:bg-indigo-100/60 rounded-lg transition-colors cursor-pointer"
            >
              Bỏ chọn
            </button>
            <button
              type="button"
              onClick={() => setShowBatchDeleteConfirm(true)}
              className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa {selectedStudentIds.length} học sinh đã chọn</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Bảng Danh Sách Học Sinh */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.length === students.length && students.length > 0}
                    onChange={toggleSelectAll}
                    aria-label="Chọn tất cả học sinh"
                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3 w-12 text-center">STT</th>
                <th className="py-3 px-3 w-24">Mã HS</th>
                <th className="py-3 px-4 min-w-[160px]">Họ và Tên</th>
                <th className="py-3 px-3 w-20 text-center">Giới Tính</th>
                <th className="py-3 px-3 w-28">Ngày Sinh</th>
                <th className="py-3 px-3 min-w-[120px]">SĐT Phụ Huynh</th>
                <th className="py-3 px-4 min-w-[180px]">Đặc Điểm / Ghi Chú Toán</th>
                <th className="py-3 px-3 w-20 text-center">Thao Tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-800">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Chưa có học sinh nào trong lớp. Vui lòng thêm học sinh hoặc dán danh sách nhanh.
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const isSelected = selectedStudentIds.includes(student.id);
                  return (
                    <tr
                      key={student.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectStudent(student.id)}
                          aria-label={`Chọn học sinh ${student.fullName}`}
                          className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-500 font-medium">
                        {student.stt}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-600">
                        {student.studentCode}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        {student.fullName}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          student.gender === 'Nam'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {student.gender}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 text-xs font-mono">
                        {student.dateOfBirth ? (
                          <span title={`ISO: ${student.dateOfBirth}`} className="hover:text-indigo-600 transition-colors">
                            {formatDisplayDate(student.dateOfBirth)}
                          </span>
                        ) : (
                          <span className="text-slate-300 italic">--</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-700">
                        {student.parentPhone ? (
                          <div className="flex items-center space-x-1.5">
                            <span>{formatPhoneDisplay(student.parentPhone)}</span>
                            <a
                              href={`tel:${student.parentPhone.replace(/[^\d+]/g, '')}`}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title={`Gọi điện cho phụ huynh em ${student.fullName}`}
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-300 italic">Chưa có</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-600">
                        {student.notes || <span className="text-slate-300 italic">Không có</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={() => setEditingStudent({ ...student })}
                            className="p-1 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-md transition-colors cursor-pointer"
                            title="Sửa thông tin"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setStudentToDelete(student)}
                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                            title="Xóa học sinh"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Modal Thêm 1 Học Sinh */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Thêm Học Sinh Vào Lớp</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="space-y-3 pt-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">STT</label>
                  <input
                    type="number"
                    value={stt}
                    onChange={(e) => setStt(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-hidden"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mã Học Sinh</label>
                  <input
                    type="text"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và Tên *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giới Tính</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white outline-hidden"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày Sinh</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SĐT Học Sinh</label>
                  <input
                    type="text"
                    placeholder="091..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SĐT Phụ Huynh</label>
                  <input
                    type="text"
                    placeholder="098..."
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi Chú Năng Lực Toán</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Giỏi hình học, cần kèm đại số..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
                >
                  Lưu Học Sinh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal Sửa Thông Tin Học Sinh */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Sửa Thông Tin Học Sinh</h3>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 pt-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">STT</label>
                  <input
                    type="number"
                    value={editingStudent.stt}
                    onChange={(e) => setEditingStudent({ ...editingStudent, stt: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-hidden"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mã Học Sinh</label>
                  <input
                    type="text"
                    value={editingStudent.studentCode}
                    onChange={(e) => setEditingStudent({ ...editingStudent, studentCode: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và Tên *</label>
                <input
                  type="text"
                  required
                  value={editingStudent.fullName}
                  onChange={(e) => setEditingStudent({ ...editingStudent, fullName: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giới Tính</label>
                  <select
                    value={editingStudent.gender}
                    onChange={(e) => setEditingStudent({ ...editingStudent, gender: e.target.value as Gender })}
                    className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white outline-hidden"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày Sinh</label>
                  <input
                    type="date"
                    value={editingStudent.dateOfBirth}
                    onChange={(e) => setEditingStudent({ ...editingStudent, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">SĐT Phụ Huynh</label>
                <input
                  type="text"
                  value={editingStudent.parentPhone || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, parentPhone: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi Chú Năng Lực Toán</label>
                <input
                  type="text"
                  value={editingStudent.notes || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, notes: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal Nhập Nhanh Hàng Loạt (Paste từ Excel) */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Nhập Nhanh Danh Sách Học Sinh (Copy & Paste)
              </h3>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="pt-3 space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-slate-800">Hướng dẫn định dạng:</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBatchModal(false);
                      setShowAIRosterModal(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Hoặc tải tệp Excel trực tiếp</span>
                    <span>&rarr;</span>
                  </button>
                </div>
                <p>• Bạn có thể copy trực tiếp từ Excel (Cột Họ tên, Giới tính, Ngày sinh) và dán vào đây.</p>
                <p>• Hoặc nhập mỗi học sinh một dòng, ví dụ:</p>
                <code className="block bg-white p-2 rounded-sm border border-slate-200 text-[11px] font-mono mt-1 text-slate-700">
                  Nguyễn Văn An, Nam, 2009-03-15<br />
                  Trần Thị Mai, Nữ, 2009-07-22<br />
                  Lê Hoàng Long
                </code>
              </div>

              {batchError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{batchError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dán nội dung danh sách vào đây:
                </label>
                <textarea
                  rows={8}
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  placeholder="Dán danh sách tại đây..."
                  className="w-full p-3 text-xs sm:text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleProcessBatchText}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
                >
                  Xử Lý & Thêm Vào Lớp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal Nhập Danh Sách Bằng AI */}
      {showAIRosterModal && (
        <AIRosterImportModal
          classroom={classroom}
          existingStudents={students}
          onImportSuccess={(newStudents, mode) => {
            onBatchImportStudents(newStudents, mode);
            setShowAIRosterModal(false);
          }}
          onClose={() => setShowAIRosterModal(false)}
        />
      )}

      {/* 7. Modal Xác Nhận Xóa 1 Học Sinh */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Xác Nhận Xóa Học Sinh</h3>
                <p className="text-xs text-slate-600">
                  Bạn có chắc chắn muốn xóa học sinh{' '}
                  <strong className="text-rose-700">{studentToDelete.fullName}</strong> (Mã: {studentToDelete.studentCode}) khỏi lớp {classroom.name}?
                </p>
                <p className="text-[11px] text-rose-600 font-medium">
                  Toàn bộ điểm kiểm tra và lịch sử nề nếp của học sinh này sẽ bị xóa!
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-5 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteStudent(studentToDelete.id);
                  setStudentToDelete(null);
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xác Nhận Xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal Xác Nhận Xóa Hàng Loạt Học Sinh Đã Chọn */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Xóa Hàng Loạt Học Sinh</h3>
                <p className="text-xs text-slate-600">
                  Bạn đang chuẩn bị xóa <strong className="text-rose-700">{selectedStudentIds.length}</strong> học sinh đã chọn khỏi lớp {classroom.name}.
                </p>
                <p className="text-[11px] text-rose-600 font-medium">
                  Tất cả điểm số tương ứng của các học sinh này sẽ bị xóa đồng thời.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-5 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => setShowBatchDeleteConfirm(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleExecuteBatchDelete}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa {selectedStudentIds.length} Học Sinh</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Modal Xác Nhận Xóa Sạch Toàn Bộ Học Sinh Lớp */}
      {showClearClassConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-rose-800">
                  Xóa Toàn Bộ Danh Sách {classroom.name}?
                </h3>
                <p className="text-xs text-slate-600">
                  Thao tác này sẽ xóa toàn bộ <strong>{students.length} học sinh</strong> cùng tất cả điểm số thường xuyên, điểm kiểm tra và nề nếp của lớp {classroom.name}.
                </p>
                <p className="text-[11px] text-rose-600 font-bold bg-rose-50 p-2 rounded-lg border border-rose-200 mt-1">
                  Lưu ý: Không thể hoàn tác sau khi xác nhận. Bạn có thể xuất file Excel dự phòng trước khi xóa.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-5 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => setShowClearClassConfirm(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleExecuteClearClass}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xác Nhận Xóa Sạch</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
