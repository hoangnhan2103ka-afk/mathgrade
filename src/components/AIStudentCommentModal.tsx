import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  Save,
  RotateCw,
  Award,
  AlertTriangle,
  BookOpen,
  Send,
  HeartHandshake,
  BrainCircuit,
  Loader2
} from 'lucide-react';
import { Student, StudentScore, ClassRoom, DisciplineRecord, GradeWeights } from '../types';
import { calculateSingleGrade } from '../utils/gradeCalculations';
import { generateStudentCommentWithAI, summarizeStudentDiscipline } from '../services/aiService';

interface AIStudentCommentModalProps {
  student: Student;
  score?: StudentScore;
  classroom: ClassRoom;
  weights: GradeWeights;
  disciplines: DisciplineRecord[];
  onSaveComment: (studentId: string, comment: string) => void;
  onClose: () => void;
}

export const AIStudentCommentModal: React.FC<AIStudentCommentModalProps> = ({
  student,
  score,
  classroom,
  weights,
  disciplines,
  onSaveComment,
  onClose,
}) => {
  const [commentStyle, setCommentStyle] = useState<'hoc_ba' | 'so_lien_lac' | 'khuyen_khich' | 'chi_tiet'>('hoc_ba');
  const [generatedComment, setGeneratedComment] = useState<string>(score?.teacherNote || '');
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);

  // Tính toán kết quả học tập của học sinh
  const safeScore: StudentScore = score || {
    studentId: student.id,
    classId: classroom.id,
    semester: classroom.semester,
    regularScores: [],
    boardBonusCount: 0,
    boardBonusTotal: 0,
    midtermScore: null,
    finalScore: null,
  };

  const calc = calculateSingleGrade(student, safeScore, weights);
  const disciplineSummary = summarizeStudentDiscipline(student.id, disciplines);

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setInfoNotice(null);
    setSavedSuccess(false);

    try {
      const res = await generateStudentCommentWithAI({
        student,
        score: safeScore,
        disciplineSummary,
        classroom,
        commentStyle,
      });

      setGeneratedComment(res.comment);
      setTags(res.tags || []);
      if (res.notice) {
        setInfoNotice(res.notice);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Không thể tạo nhận xét bằng AI. Vui lòng kiểm tra lại kết nối.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedComment) return;
    navigator.clipboard.writeText(generatedComment);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (!generatedComment.trim()) return;
    onSaveComment(student.id, generatedComment.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-auto">
        {/* Header Modal */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center space-x-2">
                <span>AI Nhận Xét Học Sinh Môn Toán</span>
              </h3>
              <p className="text-xs text-slate-500">
                Học sinh: <span className="font-bold text-slate-800">{student.fullName}</span> ({student.studentCode}) • Lớp {classroom.name}
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

        {/* Tóm tắt kết quả học sinh */}
        <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-slate-400 block text-[11px]">ĐTB Môn Toán</span>
            <span className={`text-base font-extrabold ${
              calc.finalAvg !== null && calc.finalAvg >= 8.0 ? 'text-emerald-600' :
              calc.finalAvg !== null && calc.finalAvg >= 5.0 ? 'text-indigo-600' : 'text-rose-600'
            }`}>
              {calc.finalAvg !== null ? calc.finalAvg.toFixed(2) : '--'}
            </span>
            <span className="block text-[10px] text-slate-500 font-medium">
              {calc.ratingLabel}
            </span>
          </div>

          <div className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-xl">
            <span className="text-amber-700 block text-[11px]">Lên Bảng & Điểm Cộng</span>
            <span className="text-base font-extrabold text-amber-900">
              +{safeScore.boardBonusTotal || 0}đ
            </span>
            <span className="block text-[10px] text-amber-700 font-medium">
              {safeScore.boardBonusCount || 0} lần xung phong
            </span>
          </div>

          <div className="p-2.5 bg-blue-50/60 border border-blue-200 rounded-xl">
            <span className="text-blue-700 block text-[11px]">Điểm Thi Giữa/Cuối</span>
            <span className="text-base font-extrabold text-blue-900">
              {safeScore.midtermScore !== null ? safeScore.midtermScore : '-'} / {safeScore.finalScore !== null ? safeScore.finalScore : '-'}
            </span>
            <span className="block text-[10px] text-blue-700 font-medium">
              GK / CK
            </span>
          </div>

          <div className="p-2.5 bg-rose-50/60 border border-rose-200 rounded-xl">
            <span className="text-rose-700 block text-[11px]">Nề Nếp Môn Toán</span>
            <span className="text-base font-extrabold text-rose-900">
              {disciplineSummary.forgotHomeworkCount} BTVN
            </span>
            <span className="block text-[10px] text-rose-700 font-medium">
              {disciplineSummary.forgotCalculatorCount} lần quên Casio
            </span>
          </div>
        </div>

        {/* Lựa chọn phong cách nhận xét */}
        <div className="mt-4 space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            Chọn hình thức và văn phong nhận xét:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setCommentStyle('hoc_ba')}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                commentStyle === 'hoc_ba'
                  ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold ring-2 ring-indigo-500/20'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div className="flex items-center space-x-1.5 mb-1 text-indigo-600">
                <BookOpen className="w-3.5 h-3.5" />
                <span className="font-bold text-xs">Chuẩn Học Bạ</span>
              </div>
              <span className="text-[10px] text-slate-500 leading-tight">Theo Thông tư 22, súc tích, chuẩn mực</span>
            </button>

            <button
              type="button"
              onClick={() => setCommentStyle('so_lien_lac')}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                commentStyle === 'so_lien_lac'
                  ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold ring-2 ring-indigo-500/20'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div className="flex items-center space-x-1.5 mb-1 text-emerald-600">
                <Send className="w-3.5 h-3.5" />
                <span className="font-bold text-xs">Sổ Liên Lạc / Zalo</span>
              </div>
              <span className="text-[10px] text-slate-500 leading-tight">Gửi phụ huynh, gần gũi, phối hợp</span>
            </button>

            <button
              type="button"
              onClick={() => setCommentStyle('khuyen_khich')}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                commentStyle === 'khuyen_khich'
                  ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold ring-2 ring-indigo-500/20'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div className="flex items-center space-x-1.5 mb-1 text-amber-600">
                <HeartHandshake className="w-3.5 h-3.5" />
                <span className="font-bold text-xs">Động Viên Khích Lệ</span>
              </div>
              <span className="text-[10px] text-slate-500 leading-tight">Truyền cảm hứng, khích lệ tiến bộ</span>
            </button>

            <button
              type="button"
              onClick={() => setCommentStyle('chi_tiet')}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                commentStyle === 'chi_tiet'
                  ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold ring-2 ring-indigo-500/20'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div className="flex items-center space-x-1.5 mb-1 text-purple-600">
                <BrainCircuit className="w-3.5 h-3.5" />
                <span className="font-bold text-xs">Chi Tiết Năng Lực</span>
              </div>
              <span className="text-[10px] text-slate-500 leading-tight">Phân tích đại số, hình học & Casio</span>
            </button>
          </div>
        </div>

        {/* Nút sinh nhận xét */}
        <div className="mt-3 flex justify-between items-center">
          <span className="text-xs text-slate-500">
            AI sẽ tự động đối chiếu điểm số môn Toán và nề nếp để đưa ra lời nhận xét xác đáng nhất.
          </span>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs flex items-center space-x-1.5 cursor-pointer shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>AI đang soạn thảo...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{generatedComment ? 'Tạo lại nhận xét' : 'Bấm để AI tạo nhận xét'}</span>
              </>
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {infoNotice && (
          <div className="mt-3 p-2.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{infoNotice}</span>
          </div>
        )}

        {/* Vùng hiển thị & chỉnh sửa nhận xét */}
        <div className="mt-3 space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-700">
              Nội dung nhận xét (Bạn có thể tinh chỉnh trực tiếp):
            </label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-medium border border-slate-200"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <textarea
            rows={4}
            value={generatedComment}
            onChange={(e) => setGeneratedComment(e.target.value)}
            placeholder="Nội dung lời nhận xét của giáo viên sẽ hiển thị tại đây sau khi bấm 'Tạo nhận xét bằng AI'..."
            className="w-full p-3 text-xs sm:text-sm text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden leading-relaxed"
          />
        </div>

        {/* Footer Modal */}
        <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!generatedComment.trim()}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Đã sao chép!' : 'Sao chép nhận xét'}</span>
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
              onClick={handleSave}
              disabled={!generatedComment.trim()}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Đã lưu thành công!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu Vào Sổ Điểm Môn Toán</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
