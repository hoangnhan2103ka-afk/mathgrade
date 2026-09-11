import React, { useState, useMemo } from 'react';
import { 
  X, 
  Download, 
  FileSpreadsheet, 
  CheckSquare, 
  Square, 
  Sliders, 
  Users, 
  GraduationCap, 
  FileText, 
  Sparkles,
  ClipboardList,
  UserCheck,
  BarChart2
} from 'lucide-react';
import { 
  ClassRoom, 
  Student, 
  StudentScore, 
  GradeWeights, 
  DisciplineRecord, 
  TeacherProfile,
  ExcelExportOptions 
} from '../types';
import { calculateSingleGrade } from '../utils/gradeCalculations';
import { exportGradeBookToExcel, DEFAULT_EXCEL_EXPORT_OPTIONS } from '../utils/exportUtils';

interface ExportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroom: ClassRoom;
  students: Student[];
  scores: StudentScore[];
  weights: GradeWeights;
  teacher?: TeacherProfile;
  disciplines?: DisciplineRecord[];
}

export const ExportExcelModal: React.FC<ExportExcelModalProps> = ({
  isOpen,
  onClose,
  classroom,
  students,
  scores,
  weights,
  teacher,
  disciplines = [],
}) => {
  if (!isOpen) return null;

  // Khởi tạo tùy chọn xuất
  const [options, setOptions] = useState<ExcelExportOptions>(() => {
    return {
      ...DEFAULT_EXCEL_EXPORT_OPTIONS,
      customTitle: `BẢNG ĐIỂM TỔNG HỢP MÔN TOÁN - ${classroom.name.toUpperCase()}`,
      customFileName: `SoDiem_MonToan_${classroom.name.replace(/\s+/g, '_')}_${classroom.semester}.xlsx`,
    };
  });

  // Tính số lượng học sinh theo từng phạm vi
  const scopeCounts = useMemo(() => {
    let hasScoresCount = 0;
    let strugglingCount = 0;
    let goodCount = 0;

    students.forEach((st) => {
      const sc = scores.find((s) => s.studentId === st.id);
      const calc = sc ? calculateSingleGrade(st, sc, weights) : null;

      const hasReg = !!(sc?.regularScores && sc.regularScores.length > 0);
      const has15p = !!(sc?.fifteenMinScores && sc.fifteenMinScores.length > 0);
      const hasMid = sc?.midtermScore !== null && sc?.midtermScore !== undefined;
      const hasFin = sc?.finalScore !== null && sc?.finalScore !== undefined;
      const hasBonus = !!(sc && (sc.boardBonusCount || 0) > 0);

      if (hasReg || has15p || hasMid || hasFin || hasBonus) {
        hasScoresCount++;
      }

      if (calc) {
        if (!calc.isPassing || (calc.finalAvg !== null && calc.finalAvg < 5.0) || calc.rating === 'ChuaDat') {
          strugglingCount++;
        }
        if (calc.rating === 'XuatSac' || calc.rating === 'Gioi') {
          goodCount++;
        }
      }
    });

    return {
      all: students.length,
      has_scores: hasScoresCount,
      struggling: strugglingCount,
      good_and_excellent: goodCount,
    };
  }, [students, scores, weights]);

  // Đếm tổng số cột sẽ được xuất
  const columnCount = useMemo(() => {
    let count = 0;
    if (options.includeStt) count++;
    if (options.includeStudentCode) count++;
    if (options.includeFullName) count++;
    if (options.includeGender) count++;
    if (options.includeDateOfBirth) count++;

    if (options.includeRegularScores) {
      const maxReg = Math.max(3, ...scores.map((s) => s.regularScores?.length || 0));
      count += maxReg;
    }
    if (options.includeFifteenMinScores) {
      const max15p = Math.max(1, ...scores.map((s) => s.fifteenMinScores?.length || 0));
      count += max15p;
    }
    if (options.includeBoardBonus) count += 2; // Số lần + Điểm cộng
    if (options.includeMidtermScore) count++;
    if (options.includeFinalScore) count++;
    if (options.includeFinalAvg) count++;
    if (options.includeRating) count++;
    if (options.includeAttendanceSummary) count++;
    if (options.includeStudyHabitSummary) count++;
    if (options.includeTeacherNote) count++;

    return count;
  }, [options, scores]);

  // Số lượng học sinh được chọn
  const selectedStudentCount = scopeCounts[options.studentScope];

  // Các bộ mẫu cấu hình nhanh (Presets)
  const applyPreset = (preset: 'full' | 'compact' | 'exams_only' | 'with_discipline') => {
    if (preset === 'full') {
      setOptions((prev) => ({
        ...prev,
        includeStt: true,
        includeStudentCode: true,
        includeFullName: true,
        includeGender: true,
        includeDateOfBirth: true,
        includeRegularScores: true,
        includeFifteenMinScores: true,
        includeBoardBonus: true,
        includeMidtermScore: true,
        includeFinalScore: true,
        includeFinalAvg: true,
        includeRating: true,
        includeTeacherNote: true,
        includeAttendanceSummary: false,
        includeStudyHabitSummary: false,
        includeTeacherInfo: true,
        includeClassStatsSummary: true,
      }));
    } else if (preset === 'compact') {
      setOptions((prev) => ({
        ...prev,
        includeStt: true,
        includeStudentCode: true,
        includeFullName: true,
        includeGender: false,
        includeDateOfBirth: false,
        includeRegularScores: true,
        includeFifteenMinScores: true,
        includeBoardBonus: false,
        includeMidtermScore: true,
        includeFinalScore: true,
        includeFinalAvg: true,
        includeRating: true,
        includeTeacherNote: false,
        includeAttendanceSummary: false,
        includeStudyHabitSummary: false,
        includeTeacherInfo: false,
        includeClassStatsSummary: true,
      }));
    } else if (preset === 'exams_only') {
      setOptions((prev) => ({
        ...prev,
        includeStt: true,
        includeStudentCode: true,
        includeFullName: true,
        includeGender: false,
        includeDateOfBirth: false,
        includeRegularScores: false,
        includeFifteenMinScores: false,
        includeBoardBonus: false,
        includeMidtermScore: true,
        includeFinalScore: true,
        includeFinalAvg: true,
        includeRating: true,
        includeTeacherNote: false,
        includeAttendanceSummary: false,
        includeStudyHabitSummary: false,
        includeTeacherInfo: true,
        includeClassStatsSummary: true,
      }));
    } else if (preset === 'with_discipline') {
      setOptions((prev) => ({
        ...prev,
        includeStt: true,
        includeStudentCode: true,
        includeFullName: true,
        includeGender: true,
        includeDateOfBirth: false,
        includeRegularScores: true,
        includeFifteenMinScores: true,
        includeBoardBonus: true,
        includeMidtermScore: true,
        includeFinalScore: true,
        includeFinalAvg: true,
        includeRating: true,
        includeTeacherNote: true,
        includeAttendanceSummary: true,
        includeStudyHabitSummary: true,
        includeTeacherInfo: true,
        includeClassStatsSummary: true,
      }));
    }
  };

  // Chọn tất cả các cột điểm
  const handleSelectAllColumns = () => {
    setOptions((prev) => ({
      ...prev,
      includeStt: true,
      includeStudentCode: true,
      includeFullName: true,
      includeGender: true,
      includeDateOfBirth: true,
      includeRegularScores: true,
      includeFifteenMinScores: true,
      includeBoardBonus: true,
      includeMidtermScore: true,
      includeFinalScore: true,
      includeFinalAvg: true,
      includeRating: true,
      includeAttendanceSummary: true,
      includeStudyHabitSummary: true,
      includeTeacherNote: true,
    }));
  };

  // Bỏ chọn tất cả (giữ lại họ tên & ĐTB)
  const handleSelectMinimalColumns = () => {
    setOptions((prev) => ({
      ...prev,
      includeStt: true,
      includeStudentCode: true,
      includeFullName: true,
      includeGender: false,
      includeDateOfBirth: false,
      includeRegularScores: false,
      includeFifteenMinScores: false,
      includeBoardBonus: false,
      includeMidtermScore: false,
      includeFinalScore: false,
      includeFinalAvg: true,
      includeRating: true,
      includeAttendanceSummary: false,
      includeStudyHabitSummary: false,
      includeTeacherNote: false,
    }));
  };

  // Tiến hành xuất file
  const handleConfirmExport = () => {
    exportGradeBookToExcel(
      classroom,
      students,
      scores,
      weights,
      options,
      teacher,
      disciplines
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0 shadow-inner">
              <FileSpreadsheet className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg tracking-tight">
                Tùy Chọn Nội Dung Xuất Excel
              </h3>
              <p className="text-xs text-emerald-100/90">
                Lựa chọn phạm vi học sinh và các cột điểm bạn muốn đưa vào bảng tính
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thông tin nhanh về Lớp học */}
        <div className="bg-emerald-50/60 border-b border-emerald-100 px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-emerald-950">
              Lớp: <span className="text-emerald-700 font-extrabold">{classroom.name}</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-800">
              {classroom.semester === 'HK1' ? 'Học kỳ 1' : 'Học kỳ 2'} ({classroom.schoolYear})
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-800">
              Tổng số: <b>{students.length}</b> học sinh
            </span>
          </div>

          <div className="text-emerald-700 font-semibold flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Định dạng chuẩn .xlsx</span>
          </div>
        </div>

        {/* Thân Modal */}
        <div className="p-5 space-y-5 max-h-[72vh] overflow-y-auto text-slate-800">

          {/* 1. Mẫu cấu hình nhanh (Presets) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                <span>Chọn nhanh theo mẫu:</span>
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <button
                type="button"
                onClick={() => applyPreset('full')}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-900 font-medium transition-all text-center cursor-pointer"
              >
                Đầy đủ tất cả (TT22)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('compact')}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-900 font-medium transition-all text-center cursor-pointer"
              >
                Bảng điểm tinh gọn
              </button>
              <button
                type="button"
                onClick={() => applyPreset('exams_only')}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-900 font-medium transition-all text-center cursor-pointer"
              >
                Chỉ điểm định kỳ (GK, CK)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('with_discipline')}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-900 font-medium transition-all text-center cursor-pointer"
              >
                Kèm nề nếp chuyên cần
              </button>
            </div>
          </div>

          {/* 2. Phạm vi học sinh cần xuất */}
          <div>
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>Phạm vi học sinh đưa vào bảng tính:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label
                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                  options.studentScope === 'all'
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="studentScope"
                    checked={options.studentScope === 'all'}
                    onChange={() => setOptions((p) => ({ ...p, studentScope: 'all' }))}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Tất cả học sinh trong lớp</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold">
                  {scopeCounts.all} HS
                </span>
              </label>

              <label
                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                  options.studentScope === 'has_scores'
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="studentScope"
                    checked={options.studentScope === 'has_scores'}
                    onChange={() => setOptions((p) => ({ ...p, studentScope: 'has_scores' }))}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Chỉ học sinh đã có đầu điểm</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold">
                  {scopeCounts.has_scores} HS
                </span>
              </label>

              <label
                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                  options.studentScope === 'struggling'
                    ? 'border-rose-400 bg-rose-50/60 text-rose-950 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="studentScope"
                    checked={options.studentScope === 'struggling'}
                    onChange={() => setOptions((p) => ({ ...p, studentScope: 'struggling' }))}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <span>Học sinh Chưa Đạt (cần phụ đạo)</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold">
                  {scopeCounts.struggling} HS
                </span>
              </label>

              <label
                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                  options.studentScope === 'good_and_excellent'
                    ? 'border-indigo-400 bg-indigo-50/60 text-indigo-950 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="studentScope"
                    checked={options.studentScope === 'good_and_excellent'}
                    onChange={() => setOptions((p) => ({ ...p, studentScope: 'good_and_excellent' }))}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Học sinh Giỏi & Xuất sắc</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold">
                  {scopeCounts.good_and_excellent} HS
                </span>
              </label>
            </div>
          </div>

          {/* 3. Lựa chọn các cột thông tin & điểm số */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />
                <span>Các cột dữ liệu đưa vào bảng Excel:</span>
              </span>
              <div className="space-x-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAllColumns}
                  className="text-emerald-700 hover:text-emerald-900 font-semibold underline cursor-pointer"
                >
                  Chọn tất cả
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleSelectMinimalColumns}
                  className="text-slate-500 hover:text-slate-700 font-medium underline cursor-pointer"
                >
                  Tối giản
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {/* Nhóm A: Thông tin học sinh */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200">
                <div className="text-[11px] font-bold text-slate-600 uppercase mb-2">
                  1. Thông tin học sinh
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.includeStt}
                      onChange={(e) => setOptions((p) => ({ ...p, includeStt: e.target.checked }))}
                      className="rounded-sm text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>STT</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.includeStudentCode}
                      onChange={(e) => setOptions((p) => ({ ...p, includeStudentCode: e.target.checked }))}
                      className="rounded-sm text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Mã Học Sinh</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.includeFullName}
                      onChange={(e) => setOptions((p) => ({ ...p, includeFullName: e.target.checked }))}
                      className="rounded-sm text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold">Họ và Tên</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.includeGender}
                      onChange={(e) => setOptions((p) => ({ ...p, includeGender: e.target.checked }))}
                      className="rounded-sm text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Giới Tính</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.includeDateOfBirth}
                      onChange={(e) => setOptions((p) => ({ ...p, includeDateOfBirth: e.target.checked }))}
                      className="rounded-sm text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Ngày Sinh</span>
                  </label>
                </div>
              </div>

              {/* Nhóm B: Các cột điểm môn Toán */}
              <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-200">
                <div className="text-[11px] font-bold text-emerald-900 uppercase mb-2">
                  2. Điểm kiểm tra môn Toán (Thông tư 22)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.includeRegularScores}
                      onChange={(e) => setOptions((p) => ({ ...p, includeRegularScores: e.target.checked }))}
                      className="rounded-sm text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Đánh giá thường xuyên (ĐTX - HS1)</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer font-semibold text-teal-900">
                    <input
                      type="checkbox"
                      checked={options.includeFifteenMinScores}
                      onChange={(e) => setOptions((p) => ({ ...p, includeFifteenMinScores: e.target.checked }))}
                      className="rounded-sm text-teal-600 focus:ring-teal-500"
                    />
                    <span>Kiểm tra 15 phút (ĐĐG 15p - HS1)</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.includeBoardBonus}
                      onChange={(e) => setOptions((p) => ({ ...p, includeBoardBonus: e.target.checked }))}
                      className="rounded-sm text-amber-600 focus:ring-amber-500"
                    />
                    <span>Điểm cộng & Lên bảng (Số lần + Điểm)</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.includeMidtermScore}
                      onChange={(e) => setOptions((p) => ({ ...p, includeMidtermScore: e.target.checked }))}
                      className="rounded-sm text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Điểm thi Giữa kỳ (ĐGK - HS2)</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.includeFinalScore}
                      onChange={(e) => setOptions((p) => ({ ...p, includeFinalScore: e.target.checked }))}
                      className="rounded-sm text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Điểm thi Cuối kỳ (ĐCK - HS3)</span>
                  </label>
                </div>
              </div>

              {/* Nhóm C: Tổng kết, ĐTB & Xếp loại */}
              <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-200">
                <div className="text-[11px] font-bold text-indigo-900 uppercase mb-2">
                  3. Tổng kết, ĐTB & Nhận xét
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <label className="flex items-center space-x-2 cursor-pointer font-bold text-indigo-950">
                    <input
                      type="checkbox"
                      checked={options.includeFinalAvg}
                      onChange={(e) => setOptions((p) => ({ ...p, includeFinalAvg: e.target.checked }))}
                      className="rounded-sm text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>ĐTB Môn Toán</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer font-bold text-indigo-950">
                    <input
                      type="checkbox"
                      checked={options.includeRating}
                      onChange={(e) => setOptions((p) => ({ ...p, includeRating: e.target.checked }))}
                      className="rounded-sm text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Xếp loại học lực</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.includeTeacherNote}
                      onChange={(e) => setOptions((p) => ({ ...p, includeTeacherNote: e.target.checked }))}
                      className="rounded-sm text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Ghi chú / Lời phê của GV</span>
                  </label>
                </div>
              </div>

              {/* Nhóm D: Nề nếp học tập (Tùy chọn kèm thêm) */}
              <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-200">
                <div className="text-[11px] font-bold text-amber-900 uppercase mb-2">
                  4. Nề nếp học tập & Dụng cụ (Tùy chọn kèm theo)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.includeAttendanceSummary}
                      onChange={(e) => setOptions((p) => ({ ...p, includeAttendanceSummary: e.target.checked }))}
                      className="rounded-sm text-amber-600 focus:ring-amber-500"
                    />
                    <span>Chuyên cần (Số buổi vắng, đi trễ)</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.includeStudyHabitSummary}
                      onChange={(e) => setOptions((p) => ({ ...p, includeStudyHabitSummary: e.target.checked }))}
                      className="rounded-sm text-amber-600 focus:ring-amber-500"
                    />
                    <span>Chuẩn bị bài (Quên BTVN, thiếu máy tính)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Tùy chỉnh tiêu đề bảng & thông tin bổ sung */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tiêu đề bảng & Thông tin kèm theo:</span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Tiêu đề in đầu bảng tính:
                </label>
                <input
                  type="text"
                  value={options.customTitle || ''}
                  onChange={(e) => setOptions((p) => ({ ...p, customTitle: e.target.value }))}
                  placeholder="Ví dụ: BẢNG ĐIỂM TỔNG HỢP MÔN TOÁN - LỚP 10A1"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.includeTeacherInfo}
                    onChange={(e) => setOptions((p) => ({ ...p, includeTeacherInfo: e.target.checked }))}
                    className="rounded-sm text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Kèm thông tin Giáo viên & Đơn vị ở đầu trang</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.includeClassStatsSummary}
                    onChange={(e) => setOptions((p) => ({ ...p, includeClassStatsSummary: e.target.checked }))}
                    className="rounded-sm text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Kèm bảng thống kê tổng quát ở cuối bảng</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Modal: Tóm tắt & Nút hành động */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>
              Dự kiến xuất: <b className="text-emerald-800">{selectedStudentCount}</b> học sinh •{' '}
              <b className="text-emerald-800">{columnCount}</b> cột dữ liệu
            </span>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>

            <button
              type="button"
              onClick={handleConfirmExport}
              disabled={selectedStudentCount === 0 || columnCount === 0}
              className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Xuất File Excel (.xlsx)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
