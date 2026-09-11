import React, { useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Download,
  BookOpen,
  Send,
  HeartHandshake
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student, StudentScore, ClassRoom, DisciplineRecord, GradeWeights } from '../types';
import { calculateSingleGrade } from '../utils/gradeCalculations';
import { generateBatchCommentsWithAI, summarizeStudentDiscipline } from '../services/aiService';

interface AIBatchCommentModalProps {
  classroom: ClassRoom;
  students: Student[];
  scores: StudentScore[];
  weights: GradeWeights;
  disciplines: DisciplineRecord[];
  onApplyBatchComments: (updates: { studentId: string; comment: string }[]) => void;
  onClose: () => void;
}

export const AIBatchCommentModal: React.FC<AIBatchCommentModalProps> = ({
  classroom,
  students,
  scores,
  weights,
  disciplines,
  onApplyBatchComments,
  onClose,
}) => {
  const [commentStyle, setCommentStyle] = useState<'hoc_ba' | 'so_lien_lac' | 'khuyen_khich'>('hoc_ba');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [studentComments, setStudentComments] = useState<Record<string, string>>(() => {
    // Khởi tạo từ các ghi chú có sẵn
    const init: Record<string, string> = {};
    students.forEach((s) => {
      const sc = scores.find((item) => item.studentId === s.id);
      if (sc?.teacherNote) {
        init[s.id] = sc.teacherNote;
      }
    });
    return init;
  });

  const [hasGenerated, setHasGenerated] = useState<boolean>(false);

  // Chuẩn bị dữ liệu tổng hợp từng học sinh
  const studentDataList = students.map((student) => {
    const sc = scores.find((item) => item.studentId === student.id) || {
      studentId: student.id,
      classId: classroom.id,
      semester: classroom.semester,
      regularScores: [],
      boardBonusCount: 0,
      boardBonusTotal: 0,
      midtermScore: null,
      finalScore: null,
    };
    const calc = calculateSingleGrade(student, sc, weights);
    const disc = summarizeStudentDiscipline(student.id, disciplines);

    return {
      student,
      score: sc,
      calculatedAvg: calc.finalAvg,
      ratingLabel: calc.ratingLabel,
      disciplineSummary: disc,
    };
  });

  // Gọi AI tạo nhận xét hàng loạt
  const handleGenerateBatch = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setInfoNotice(null);

    try {
      const payload = studentDataList.map((item) => ({
        student: item.student,
        score: item.score,
        calculatedAvg: item.calculatedAvg,
        disciplineSummary: {
          absentOrLateCount: item.disciplineSummary.absentOrLateCount,
          forgotHomeworkCount: item.disciplineSummary.forgotHomeworkCount,
          forgotCalculatorCount: item.disciplineSummary.forgotCalculatorCount,
        },
      }));

      const res = await generateBatchCommentsWithAI({
        studentsWithData: payload,
        classroom,
        commentStyle,
      });

      const newComments: Record<string, string> = { ...studentComments };
      res.results.forEach((r) => {
        newComments[r.studentId] = r.comment;
      });

      setStudentComments(newComments);
      setHasGenerated(true);
      if (res.notice) {
        setInfoNotice(res.notice);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Không thể tạo nhận xét hàng loạt.');
    } finally {
      setIsLoading(false);
    }
  };

  // Cập nhật text nhận xét từng em
  const handleCommentChange = (studentId: string, text: string) => {
    setStudentComments((prev) => ({
      ...prev,
      [studentId]: text,
    }));
  };

  // Áp dụng lưu toàn bộ vào sổ điểm
  const handleApplyAll = () => {
    const updates = Object.entries(studentComments).map(([studentId, comment]) => ({
      studentId,
      comment,
    }));
    onApplyBatchComments(updates);
    onClose();
  };

  // Xuất file Excel kèm nhận xét môn Toán
  const handleExportExcelWithComments = () => {
    const headers = ['STT', 'Mã HS', 'Họ và Tên', 'ĐTB Môn', 'Xếp Loại', 'Lên Bảng', 'Lời Nhận Xét Môn Toán'];
    const rows = studentDataList.map((item) => [
      item.student.stt,
      item.student.studentCode,
      item.student.fullName,
      item.calculatedAvg !== null ? item.calculatedAvg.toFixed(2) : '',
      item.ratingLabel,
      item.score.boardBonusTotal || 0,
      studentComments[item.student.id] || item.score.teacherNote || '',
    ]);

    const worksheetData = [
      [`BẢNG ĐÁNH GIÁ & NHẬN XÉT HỌC SINH MÔN TOÁN - LỚP ${classroom.name.toUpperCase()}`],
      [`Học kỳ: ${classroom.semester === 'hk1' ? 'Học kỳ I' : 'Học kỳ II'} • Sĩ số: ${students.length} học sinh`],
      [],
      headers,
      ...rows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'NhanXetToan');
    XLSX.writeFile(wb, `NhanXet_MonToan_${classroom.name}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-auto">
        {/* Header Modal */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center space-x-2">
                <span>AI Nhận Xét Toàn Bộ Lớp {classroom.name}</span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                  {students.length} học sinh
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Tự động tổng hợp điểm số và nề nếp từng em để tạo lời nhận xét cá nhân hóa trong 1 lần nhấn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thanh điều khiển & Lựa chọn phong cách */}
        <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center space-x-2 text-xs">
            <span className="font-bold text-slate-700">Phong cách:</span>
            <select
              value={commentStyle}
              onChange={(e: any) => setCommentStyle(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 outline-hidden"
            >
              <option value="hoc_ba">Chuẩn Học bạ (Thông tư 22 - Ngắn gọn, chuẩn mực)</option>
              <option value="so_lien_lac">Sổ liên lạc / Zalo Phụ huynh (Ân cần, phối hợp)</option>
              <option value="khuyen_khich">Động viên & Khích lệ (Tích cực, tạo động lực)</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleGenerateBatch}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>AI đang phân tích {students.length} học sinh...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{hasGenerated ? 'Tạo lại nhận xét toàn lớp' : 'Bắt Đầu Sinh Nhận Xét Bằng AI'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {infoNotice && (
          <div className="mt-3 p-2.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{infoNotice}</span>
          </div>
        )}

        {/* Danh sách học sinh và nhận xét tương ứng */}
        <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">STT</th>
                <th className="py-2.5 px-3 min-w-[150px]">Học Sinh</th>
                <th className="py-2.5 px-2 w-20 text-center">ĐTB Môn</th>
                <th className="py-2.5 px-2 w-20 text-center">Lên bảng</th>
                <th className="py-2.5 px-3 min-w-[280px]">Lời Nhận Xét Môn Toán</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {studentDataList.map((item) => (
                <tr key={item.student.id} className="hover:bg-slate-50/70">
                  <td className="py-2 px-3 text-center text-slate-500 font-medium">
                    {item.student.stt}
                  </td>
                  <td className="py-2 px-3">
                    <div className="font-bold text-slate-900">{item.student.fullName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{item.student.studentCode}</div>
                  </td>
                  <td className="py-2 px-2 text-center font-mono font-bold">
                    {item.calculatedAvg !== null ? (
                      <span className={item.calculatedAvg >= 8.0 ? 'text-emerald-700' : item.calculatedAvg >= 5.0 ? 'text-slate-800' : 'text-rose-600'}>
                        {item.calculatedAvg.toFixed(2)}
                      </span>
                    ) : (
                      '--'
                    )}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-sm font-semibold">
                      +{item.score.boardBonusTotal || 0}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <textarea
                      rows={2}
                      value={studentComments[item.student.id] || ''}
                      onChange={(e) => handleCommentChange(item.student.id, e.target.value)}
                      placeholder="Nhận xét của học sinh sẽ hiển thị tại đây..."
                      className="w-full text-xs p-1.5 border border-slate-200 focus:border-indigo-500 rounded-lg outline-hidden bg-white leading-relaxed"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer hành động */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 mt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleExportExcelWithComments}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Bảng Điểm & Nhận Xét Ra Excel</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleApplyAll}
              disabled={Object.keys(studentComments).length === 0}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Lưu Toàn Bộ Nhận Xét Vào Sổ Điểm</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
