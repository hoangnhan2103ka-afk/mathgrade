import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Search, 
  Filter, 
  TrendingUp, 
  AlertCircle, 
  Award, 
  CheckCircle, 
  HelpCircle, 
  Sparkles, 
  ArrowUpDown,
  Undo2,
  RotateCcw,
  X,
  Check,
  Eraser,
  MoreVertical,
  Download
} from 'lucide-react';
import { Student, StudentScore, ClassRoom, GradeWeights, DisciplineRecord } from '../types';
import { calculateSingleGrade, computeClassStats, roundTo005 } from '../utils/gradeCalculations';
import { ScoreInputCell } from './ScoreInputCell';
import { AIStudentCommentModal } from './AIStudentCommentModal';
import { AIBatchCommentModal } from './AIBatchCommentModal';

interface GradeBookViewProps {
  classroom: ClassRoom;
  students: Student[];
  scores: StudentScore[];
  weights: GradeWeights;
  disciplines: DisciplineRecord[];
  onUpdateScore: (studentId: string, updatedFields: Partial<StudentScore>) => void;
  onBatchUpdateScores?: (updates: { studentId: string; comment: string }[]) => void;
  onOpenQuickBonus: (student: Student) => void;
  onOpenExportModal?: () => void;
}

interface ScoreUndoItem {
  id: string;
  studentId: string;
  studentName: string;
  fieldLabel: string;
  oldScoreState: StudentScore;
  timestamp: number;
}

export const GradeBookView: React.FC<GradeBookViewProps> = ({
  classroom,
  students,
  scores,
  weights,
  disciplines,
  onUpdateScore,
  onBatchUpdateScores,
  onOpenQuickBonus,
  onOpenExportModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'stt' | 'name' | 'avg' | 'bonus'>('stt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [commentingStudent, setCommentingStudent] = useState<Student | null>(null);
  const [showBatchCommentModal, setShowBatchCommentModal] = useState(false);

  // 1. Quản lý lịch sử hoàn tác (Undo) nhập điểm
  const [undoHistory, setUndoHistory] = useState<ScoreUndoItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeStudentMenu, setActiveStudentMenu] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Lưu trạng thái trước khi sửa điểm để hoàn tác
  const recordBeforeChange = (studentId: string, fieldLabel: string) => {
    const student = students.find((s) => s.id === studentId);
    const existingScore = scores.find((s) => s.studentId === studentId) || {
      studentId,
      classId: classroom.id,
      semester: classroom.semester,
      regularScores: [],
      boardBonusCount: 0,
      boardBonusTotal: 0,
      midtermScore: null,
      finalScore: null,
    };

    const snapshot: StudentScore = {
      ...existingScore,
      regularScores: [...(existingScore.regularScores || [])],
      fifteenMinScores: [...(existingScore.fifteenMinScores || [])],
    };

    setUndoHistory((prev) => [
      ...prev.slice(-19), // Giữ tối đa 20 lượt hoàn tác gần nhất
      {
        id: `undo-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        studentId,
        studentName: student?.fullName || 'Học sinh',
        fieldLabel,
        oldScoreState: snapshot,
        timestamp: Date.now(),
      },
    ]);
  };

  // Thực hiện hoàn tác điểm
  const handleUndo = () => {
    if (undoHistory.length === 0) return;
    const lastAction = undoHistory[undoHistory.length - 1];

    onUpdateScore(lastAction.studentId, {
      regularScores: [...(lastAction.oldScoreState.regularScores || [])],
      fifteenMinScores: [...(lastAction.oldScoreState.fifteenMinScores || [])],
      midtermScore: lastAction.oldScoreState.midtermScore,
      finalScore: lastAction.oldScoreState.finalScore,
      boardBonusCount: lastAction.oldScoreState.boardBonusCount,
      boardBonusTotal: lastAction.oldScoreState.boardBonusTotal,
    });

    setUndoHistory((prev) => prev.slice(0, prev.length - 1));
    showToast(`Đã hoàn tác: Khôi phục ${lastAction.fieldLabel} của em ${lastAction.studentName}`);
  };

  // Hỗ trợ phím tắt hoàn tác Ctrl+Z / Cmd+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        // Nếu không đang gõ text trong input ghi chú
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' && (e.target as HTMLInputElement).type === 'text') {
          return;
        }
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoHistory]);

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    const closeMenu = () => setActiveStudentMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  // Tính số lượng cột điểm ĐTX tối đa hiện có trong dữ liệu
  const maxRegularColumns = useMemo(() => {
    let max = 3;
    scores.forEach((s) => {
      if (s.regularScores && s.regularScores.length > max) {
        max = s.regularScores.length;
      }
    });
    return max;
  }, [scores]);

  const [columnCount, setColumnCount] = useState<number>(Math.max(3, maxRegularColumns));

  // Cập nhật columnCount nếu scores thay đổi
  useEffect(() => {
    if (maxRegularColumns > columnCount) {
      setColumnCount(maxRegularColumns);
    }
  }, [maxRegularColumns]);

  // Tính số lượng cột điểm 15 phút tối đa hiện có trong dữ liệu (ít nhất 1 cột)
  const maxFifteenMinColumns = useMemo(() => {
    let max = 1;
    scores.forEach((s) => {
      if (s.fifteenMinScores && s.fifteenMinScores.length > max) {
        max = s.fifteenMinScores.length;
      }
    });
    return max;
  }, [scores]);

  const [fifteenMinColumnCount, setFifteenMinColumnCount] = useState<number>(
    Math.max(1, maxFifteenMinColumns)
  );

  // Cập nhật fifteenMinColumnCount nếu dữ liệu có nhiều cột hơn
  useEffect(() => {
    if (maxFifteenMinColumns > fifteenMinColumnCount) {
      setFifteenMinColumnCount(maxFifteenMinColumns);
    }
  }, [maxFifteenMinColumns]);

  // Thống kê toàn lớp
  const stats = useMemo(() => {
    return computeClassStats(students, scores, weights);
  }, [students, scores, weights]);

  // Chuẩn bị dữ liệu tính toán cho từng học sinh
  const gradeList = useMemo(() => {
    return students.map((student) => {
      const studentScore = scores.find((s) => s.studentId === student.id) || {
        studentId: student.id,
        classId: classroom.id,
        semester: classroom.semester,
        regularScores: [],
        boardBonusCount: 0,
        boardBonusTotal: 0,
        midtermScore: null,
        finalScore: null,
      };

      const calc = calculateSingleGrade(student, studentScore, weights);
      return {
        student,
        score: studentScore,
        calc,
      };
    });
  }, [students, scores, classroom, weights]);

  // Lọc và sắp xếp
  const filteredAndSorted = useMemo(() => {
    return gradeList
      .filter(({ student, calc }) => {
        // Tìm kiếm theo tên hoặc mã HS
        const matchesQuery =
          student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.studentCode.toLowerCase().includes(searchQuery.toLowerCase());

        // Lọc theo xếp loại
        if (ratingFilter === 'all') return matchesQuery;
        if (ratingFilter === 'struggling') return matchesQuery && !calc.isPassing;
        if (ratingFilter === 'XuatSac') return matchesQuery && calc.rating === 'XuatSac';
        if (ratingFilter === 'Gioi') return matchesQuery && calc.rating === 'Gioi';
        if (ratingFilter === 'Kha') return matchesQuery && calc.rating === 'Kha';
        if (ratingFilter === 'Dat') return matchesQuery && calc.rating === 'Dat';
        if (ratingFilter === 'ChuaDat') return matchesQuery && calc.rating === 'ChuaDat';
        return matchesQuery;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'stt') cmp = a.student.stt - b.student.stt;
        else if (sortBy === 'name') cmp = a.student.fullName.localeCompare(b.student.fullName, 'vi');
        else if (sortBy === 'avg') cmp = (a.calc.finalAvg ?? -1) - (b.calc.finalAvg ?? -1);
        else if (sortBy === 'bonus') cmp = (a.score.boardBonusTotal ?? 0) - (b.score.boardBonusTotal ?? 0);
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [gradeList, searchQuery, ratingFilter, sortBy, sortOrder]);

  const toggleSort = (field: 'stt' | 'name' | 'avg' | 'bonus') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Xử lý cập nhật điểm ĐTX (làm tròn đến 0.05, 2 chữ số thập phân)
  const handleRegularScoreChange = (
    studentId: string,
    currentScores: number[],
    index: number,
    newScore: number | null
  ) => {
    recordBeforeChange(studentId, `điểm ĐTX ${index + 1}`);
    const newScores = [...(currentScores || [])];
    if (newScore === null) {
      newScores.splice(index, 1);
    } else {
      newScores[index] = roundTo005(newScore);
    }
    onUpdateScore(studentId, { regularScores: newScores });
  };

  // Xóa trực tiếp 1 ô điểm ĐTX
  const handleClearSingleRegularScore = (
    studentId: string,
    currentScores: number[],
    index: number
  ) => {
    recordBeforeChange(studentId, `điểm ĐTX ${index + 1}`);
    const newScores = [...(currentScores || [])];
    newScores.splice(index, 1);
    onUpdateScore(studentId, { regularScores: newScores });
    showToast(`Đã xóa điểm ĐTX ${index + 1}`);
  };

  // Xử lý cập nhật điểm Giữa kỳ / Cuối kỳ (làm tròn đến 0.05, 2 chữ số thập phân)
  const handleExamScoreChange = (
    studentId: string,
    type: 'midterm' | 'final',
    newScore: number | null
  ) => {
    recordBeforeChange(studentId, type === 'midterm' ? 'điểm Giữa kỳ' : 'điểm Cuối kỳ');
    const rounded = newScore !== null ? roundTo005(newScore) : null;
    onUpdateScore(studentId, { [type === 'midterm' ? 'midtermScore' : 'finalScore']: rounded });
  };

  // Xóa trực tiếp điểm Giữa kỳ hoặc Cuối kỳ
  const handleClearExamScore = (studentId: string, type: 'midterm' | 'final') => {
    recordBeforeChange(studentId, type === 'midterm' ? 'điểm Giữa kỳ' : 'điểm Cuối kỳ');
    onUpdateScore(studentId, { [type === 'midterm' ? 'midtermScore' : 'finalScore']: null });
    showToast(`Đã xóa điểm ${type === 'midterm' ? 'Giữa kỳ' : 'Cuối kỳ'}`);
  };

  // Hủy/Xóa toàn bộ điểm của 1 học sinh (đặt lại trống)
  const handleClearAllScoresForStudent = (studentId: string) => {
    recordBeforeChange(studentId, 'toàn bộ bảng điểm');
    onUpdateScore(studentId, {
      regularScores: [],
      fifteenMinScores: [],
      midtermScore: null,
      finalScore: null,
    });
    const st = students.find((s) => s.id === studentId);
    showToast(`Đã xóa sạch điểm số của em ${st?.fullName || ''}. Bạn có thể bấm Hoàn tác nếu muốn phục hồi.`);
  };

  // Hủy xóa toàn bộ điểm ĐTX của 1 học sinh
  const handleClearAllRegularScoresForStudent = (studentId: string) => {
    recordBeforeChange(studentId, 'tất cả điểm ĐTX');
    onUpdateScore(studentId, { regularScores: [] });
    const st = students.find((s) => s.id === studentId);
    showToast(`Đã xóa tất cả điểm ĐTX của em ${st?.fullName || ''}`);
  };

  // Xử lý cập nhật điểm 15 phút (làm tròn đến 0.05, 2 chữ số thập phân)
  const handleFifteenMinScoreChange = (
    studentId: string,
    currentScores: number[] = [],
    index: number,
    newScore: number | null
  ) => {
    recordBeforeChange(studentId, `điểm 15 phút ${fifteenMinColumnCount > 1 ? `cột ${index + 1}` : ''}`);
    const newScores = [...(currentScores || [])];
    if (newScore === null) {
      newScores.splice(index, 1);
    } else {
      newScores[index] = roundTo005(newScore);
    }
    onUpdateScore(studentId, { fifteenMinScores: newScores });
  };

  // Xóa trực tiếp 1 ô điểm 15 phút
  const handleClearSingleFifteenMinScore = (
    studentId: string,
    currentScores: number[] = [],
    index: number
  ) => {
    recordBeforeChange(studentId, `điểm 15 phút ${fifteenMinColumnCount > 1 ? `cột ${index + 1}` : ''}`);
    const newScores = [...(currentScores || [])];
    newScores.splice(index, 1);
    onUpdateScore(studentId, { fifteenMinScores: newScores });
    showToast(`Đã xóa điểm 15 phút ${fifteenMinColumnCount > 1 ? `cột ${index + 1}` : ''}`);
  };

  // Hủy xóa toàn bộ điểm 15 phút của 1 học sinh
  const handleClearAllFifteenMinScoresForStudent = (studentId: string) => {
    recordBeforeChange(studentId, 'tất cả điểm 15 phút');
    onUpdateScore(studentId, { fifteenMinScores: [] });
    const st = students.find((s) => s.id === studentId);
    showToast(`Đã xóa tất cả điểm 15 phút của em ${st?.fullName || ''}`);
  };

  // Xóa trực tiếp điểm cộng lên bảng của 1 học sinh (có thể bấm hoàn tác)
  const handleClearBoardBonus = (studentId: string) => {
    recordBeforeChange(studentId, 'điểm cộng lên bảng');
    onUpdateScore(studentId, {
      boardBonusTotal: 0,
      boardBonusCount: 0,
    });
    const st = students.find((s) => s.id === studentId);
    showToast(`Đã xóa điểm cộng lên bảng của em ${st?.fullName || ''}. Bấm Hoàn tác nếu muốn phục hồi.`);
  };

  // Thêm một cột điểm thường xuyên
  const handleAddRegularColumn = () => {
    if (columnCount < 8) {
      setColumnCount((prev) => prev + 1);
    }
  };

  // Thêm một cột điểm 15 phút
  const handleAddFifteenMinColumn = () => {
    if (fifteenMinColumnCount < 4) {
      setFifteenMinColumnCount((prev) => prev + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast thông báo hoàn tác & xóa điểm */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs sm:text-sm animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Thanh Chỉ Số Nhanh của Lớp */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">
              {stats.classAverage !== null ? stats.classAverage.toFixed(2) : '--'}
            </div>
            <div className="text-xs text-slate-500 font-medium">Điểm TB Lớp Môn Toán</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{stats.passRate}%</div>
            <div className="text-xs text-slate-500 font-medium">Tỷ Lệ Đạt (≥ 5.0)</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">
              {stats.ratingCounts.XuatSac + stats.ratingCounts.Gioi}
              <span className="text-xs text-slate-400 font-normal ml-1">/{stats.totalStudents} HS</span>
            </div>
            <div className="text-xs text-slate-500 font-medium">Học Lực Giỏi & Xuất Sắc</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">
              {stats.ratingCounts.ChuaDat}
              <span className="text-xs text-slate-400 font-normal ml-1">/{stats.totalStudents} HS</span>
            </div>
            <div className="text-xs text-slate-500 font-medium">Chưa Đạt (&lt; 5.0)</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3 col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">
              {scores.reduce((sum, s) => sum + (s.boardBonusCount || 0), 0)}
            </div>
            <div className="text-xs text-slate-500 font-medium">Lượt Lên Bảng Giải Bài</div>
          </div>
        </div>
      </div>

      {/* 2. Thanh Công Cụ & Bộ Lọc */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mã HS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>

          {/* Lọc xếp loại */}
          <div className="flex items-center space-x-1">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 outline-hidden cursor-pointer"
            >
              <option value="all">Tất cả xếp loại ({students.length})</option>
              <option value="XuatSac">Xuất sắc (≥ 9.0)</option>
              <option value="Gioi">Giỏi (8.0 - 8.9)</option>
              <option value="Kha">Khá (6.5 - 7.9)</option>
              <option value="Dat">Đạt (5.0 - 6.4)</option>
              <option value="ChuaDat">Chưa đạt (&lt; 5.0)</option>
              <option value="struggling">Học sinh cần phụ đạo</option>
            </select>
          </div>
        </div>

        {/* Nút Hoàn tác (Undo), Thêm cột ĐTX, AI Nhận xét & Chú giải */}
        <div className="flex flex-wrap items-center gap-2">
          {/* NÚT HOÀN TÁC (UNDO) NHẬP ĐIỂM */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={undoHistory.length === 0}
            title={
              undoHistory.length > 0
                ? `Hoàn tác: Khôi phục ${undoHistory[undoHistory.length - 1].fieldLabel} của em ${undoHistory[undoHistory.length - 1].studentName} (Phím tắt: Ctrl+Z)`
                : 'Chưa có thao tác nhập điểm nào để hoàn tác'
            }
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              undoHistory.length > 0
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 shadow-2xs font-bold'
                : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Hoàn tác nhập điểm</span>
            {undoHistory.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded-full text-[10px] font-bold">
                {undoHistory.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowBatchCommentModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-all cursor-pointer ring-2 ring-indigo-500/20"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Nhận Xét Cả Lớp</span>
          </button>

          <button
            type="button"
            onClick={handleAddRegularColumn}
            disabled={columnCount >= 8}
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm cột ĐTX</span>
          </button>

          <button
            type="button"
            onClick={handleAddFifteenMinColumn}
            disabled={fifteenMinColumnCount >= 4}
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm cột 15p</span>
          </button>

          {onOpenExportModal && (
            <button
              type="button"
              onClick={onOpenExportModal}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
              title="Tùy chọn nội dung và xuất bảng điểm ra file Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xuất Excel</span>
            </button>
          )}

          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 text-xs">
            <span className="font-semibold">Làm tròn:</span>
            <span>0,05 (2 số thập phân)</span>
          </div>

          <div className="relative group">
            <span className="cursor-pointer p-1.5 text-slate-400 hover:text-slate-600 block">
              <HelpCircle className="w-4 h-4" />
            </span>
            <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-80 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-lg z-20">
              <div className="font-bold mb-1">Quy tắc nhập điểm & Công thức (TT22):</div>
              <div className="text-slate-300 leading-relaxed space-y-1">
                <p>• Nhập điểm phần thập phân 2 chữ số, làm tròn đến 0,05 (bội số của 0,05; ví dụ: 8.25, 8.05, 8.5).</p>
                <p>• Hỗ trợ cả dấu chấm (.) và dấu phẩy (,) từ bàn phím tiếng Việt / numpad.</p>
                <p>• Dùng phím Mũi tên Lên/Xuống (↑/↓) để tăng/giảm chính xác 0,05 điểm.</p>
                <p>• ĐTBm = (Tổng ĐTX & 15p + 2×ĐGK + 3×ĐCK) / (Số ĐTX & 15p + 5) + Điểm cộng lên bảng (tối đa +1.0)</p>
              </div>
              <div className="text-amber-300 mt-2 font-semibold">
                💡 Đề phòng nhập sai: Bấm "Hoàn tác" hoặc Ctrl+Z để lấy lại điểm cũ bất cứ lúc nào!
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bảng Điểm Chính */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold select-none">
                <th 
                  onClick={() => toggleSort('stt')}
                  className="py-3 px-3 w-12 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>STT</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 w-20">Mã HS</th>
                <th 
                  onClick={() => toggleSort('name')}
                  className="py-3 px-4 min-w-[160px] cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Họ và Tên</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* Các cột Điểm Thường Xuyên (ĐTX) */}
                {Array.from({ length: columnCount }).map((_, idx) => (
                  <th key={`col-reg-${idx}`} className="py-3 px-2 w-16 text-center border-l border-slate-200">
                    <span className="block font-semibold text-slate-800">ĐTX {idx + 1}</span>
                    <span className="text-[10px] text-slate-400 font-normal">HS{weights.regularWeight}</span>
                  </th>
                ))}

                {/* Các cột Điểm Kiểm Tra 15 Phút (ĐĐG 15 phút - HS1) */}
                {Array.from({ length: fifteenMinColumnCount }).map((_, idx) => (
                  <th key={`col-15p-${idx}`} className="py-3 px-2 w-16 text-center border-l border-slate-200 bg-teal-50/35">
                    <span className="block font-semibold text-teal-900">
                      {fifteenMinColumnCount > 1 ? `15p (${idx + 1})` : '15 phút'}
                    </span>
                    <span className="text-[10px] text-teal-600 font-medium">HS{weights.regularWeight}</span>
                  </th>
                ))}

                {/* Điểm cộng lên bảng */}
                <th 
                  onClick={() => toggleSort('bonus')}
                  className="py-3 px-3 w-28 text-center border-l border-slate-200 bg-amber-50/50 cursor-pointer hover:bg-amber-100/50 transition-colors"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Lên bảng</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                  <span className="text-[10px] text-amber-700 font-medium">Điểm cộng</span>
                </th>

                {/* Điểm Giữa Kỳ (ĐGK) */}
                <th className="py-3 px-2 w-20 text-center border-l border-slate-200 bg-blue-50/40">
                  <span className="block font-semibold text-blue-900">Giữa kỳ</span>
                  <span className="text-[10px] text-blue-600 font-medium">HS{weights.midtermWeight}</span>
                </th>

                {/* Điểm Cuối Kỳ (ĐCK) */}
                <th className="py-3 px-2 w-20 text-center border-l border-slate-200 bg-indigo-50/40">
                  <span className="block font-semibold text-indigo-900">Cuối kỳ</span>
                  <span className="text-[10px] text-indigo-600 font-medium">HS{weights.finalWeight}</span>
                </th>

                {/* Điểm Trung Bình Môn */}
                <th 
                  onClick={() => toggleSort('avg')}
                  className="py-3 px-3 w-24 text-center border-l border-slate-200 bg-slate-100/80 cursor-pointer hover:bg-slate-200/80 transition-colors"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span className="font-bold text-slate-900">ĐTBm</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">Toán</span>
                </th>

                {/* Xếp loại */}
                <th className="py-3 px-3 w-28 text-center border-l border-slate-200">
                  <span>Xếp Loại</span>
                </th>

                {/* Ghi chú & Nhận xét & Hủy nhập điểm */}
                <th className="py-3 px-3 min-w-[200px] border-l border-slate-200">
                  <span>Nhận Xét & Thao Tác</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={columnCount + fifteenMinColumnCount + 8} className="py-8 text-center text-slate-400 text-xs sm:text-sm">
                    Không tìm thấy học sinh nào phù hợp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map(({ student, score, calc }) => {
                  const regularScores = score.regularScores || [];

                  // Badge xếp loại
                  const ratingBadges: Record<string, { bg: string; text: string }> = {
                    XuatSac: { bg: 'bg-purple-100 border-purple-300', text: 'text-purple-800' },
                    Gioi: { bg: 'bg-emerald-100 border-emerald-300', text: 'text-emerald-800' },
                    Kha: { bg: 'bg-blue-100 border-blue-300', text: 'text-blue-800' },
                    Dat: { bg: 'bg-amber-100 border-amber-300', text: 'text-amber-800' },
                    ChuaDat: { bg: 'bg-rose-100 border-rose-300', text: 'text-rose-800 font-bold' },
                  };
                  const badge = ratingBadges[calc.rating] || { bg: 'bg-slate-100', text: 'text-slate-600' };

                  return (
                    <tr 
                      key={student.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !calc.isPassing && calc.finalAvg !== null ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* STT */}
                      <td className="py-2.5 px-3 text-center text-slate-500 font-medium">
                        {student.stt}
                      </td>

                      {/* Mã HS */}
                      <td className="py-2.5 px-3 text-slate-600 font-mono text-xs">
                        {student.studentCode}
                      </td>

                      {/* Họ và Tên */}
                      <td className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span>{student.fullName}</span>
                          {score.boardBonusCount >= 3 && (
                            <span title={`${score.boardBonusCount} lần lên bảng`} className="text-amber-500">
                              ⭐
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Các cột Điểm Thường Xuyên */}
                      {Array.from({ length: columnCount }).map((_, colIdx) => {
                        const scoreVal = regularScores[colIdx];
                        return (
                          <td key={`reg-${student.id}-${colIdx}`} className="py-1 px-1 border-l border-slate-100 text-center">
                            <ScoreInputCell
                              value={scoreVal}
                              onChange={(val) =>
                                handleRegularScoreChange(student.id, regularScores, colIdx, val)
                              }
                              onClear={() =>
                                handleClearSingleRegularScore(student.id, regularScores, colIdx)
                              }
                              ariaLabel={`Điểm ĐTX ${colIdx + 1} của ${student.fullName}`}
                            />
                          </td>
                        );
                      })}

                      {/* Các cột Điểm Kiểm Tra 15 Phút */}
                      {Array.from({ length: fifteenMinColumnCount }).map((_, colIdx) => {
                        const fifteenScores = score.fifteenMinScores || [];
                        const scoreVal = fifteenScores[colIdx];
                        const hasValue = scoreVal !== undefined && scoreVal !== null;
                        return (
                          <td key={`15p-${student.id}-${colIdx}`} className="py-1 px-1 border-l border-slate-100 bg-teal-50/15 text-center">
                            <ScoreInputCell
                              value={scoreVal}
                              onChange={(val) =>
                                handleFifteenMinScoreChange(student.id, fifteenScores, colIdx, val)
                              }
                              onClear={() =>
                                handleClearSingleFifteenMinScore(student.id, fifteenScores, colIdx)
                              }
                              className={
                                hasValue && scoreVal >= 8
                                  ? 'text-teal-700 hover:border-teal-300 focus:border-teal-500'
                                  : hasValue && scoreVal < 5
                                  ? 'text-rose-600 font-bold hover:border-rose-300 focus:border-rose-500'
                                  : 'hover:border-teal-300 focus:border-teal-500'
                              }
                              ariaLabel={`Điểm 15 phút ${colIdx + 1} của ${student.fullName}`}
                            />
                          </td>
                        );
                      })}

                      {/* Điểm cộng lên bảng */}
                      <td className="py-1.5 px-2 border-l border-slate-100 bg-amber-50/20 text-center">
                        <div className="relative group/bonus inline-flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={() => onOpenQuickBonus(student)}
                            title="Bấm để chấm thêm, sửa hoặc xóa điểm cộng lên bảng"
                            className="px-2 py-1 rounded-md text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors cursor-pointer"
                          >
                            +{score.boardBonusTotal || 0}
                          </button>
                          <span className="text-[10px] text-slate-400">
                            ({score.boardBonusCount || 0} lần)
                          </span>
                          {((score.boardBonusTotal || 0) > 0 || (score.boardBonusCount || 0) > 0) && (
                            <button
                              type="button"
                              title="Xóa điểm cộng lên bảng của em này (Về 0đ)"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClearBoardBonus(student.id);
                              }}
                              className="w-3.5 h-3.5 rounded-full bg-amber-200 hover:bg-rose-500 text-amber-800 hover:text-white hidden group-hover/bonus:flex items-center justify-center text-[10px] shadow-2xs transition-colors cursor-pointer"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Điểm Giữa Kỳ */}
                      <td className="py-1 px-1 border-l border-slate-100 bg-blue-50/20 text-center">
                        <ScoreInputCell
                          value={score.midtermScore}
                          onChange={(val) => handleExamScoreChange(student.id, 'midterm', val)}
                          onClear={() => handleClearExamScore(student.id, 'midterm')}
                          className="font-bold text-blue-900 hover:border-blue-300 focus:border-blue-500"
                          ariaLabel={`Điểm Giữa kỳ của ${student.fullName}`}
                        />
                      </td>

                      {/* Điểm Cuối Kỳ */}
                      <td className="py-1 px-1 border-l border-slate-100 bg-indigo-50/20 text-center">
                        <ScoreInputCell
                          value={score.finalScore}
                          onChange={(val) => handleExamScoreChange(student.id, 'final', val)}
                          onClear={() => handleClearExamScore(student.id, 'final')}
                          className="font-bold text-indigo-900 hover:border-indigo-300 focus:border-indigo-500"
                          ariaLabel={`Điểm Cuối kỳ của ${student.fullName}`}
                        />
                      </td>

                      {/* ĐTB Môn */}
                      <td className="py-2 px-2 border-l border-slate-100 text-center bg-slate-50 font-mono">
                        {calc.finalAvg !== null ? (
                          <span className={`font-extrabold text-sm ${
                            calc.finalAvg >= 8.0 ? 'text-emerald-700' : calc.finalAvg >= 5.0 ? 'text-slate-800' : 'text-rose-600'
                          }`}>
                            {calc.finalAvg.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-300">--</span>
                        )}
                      </td>

                      {/* Xếp loại */}
                      <td className="py-2 px-2 border-l border-slate-100 text-center">
                        <span className={`inline-block px-2 py-0.5 text-[11px] font-medium border rounded-full ${badge.bg} ${badge.text}`}>
                          {calc.ratingLabel}
                        </span>
                      </td>

                      {/* Ghi chú & AI Nhận xét & HỦY NHẬP ĐIỂM */}
                      <td className="py-1 px-2 border-l border-slate-100">
                        <div className="flex items-center space-x-1">
                          <input
                            type="text"
                            value={score.teacherNote || ''}
                            placeholder="Nhận xét môn toán..."
                            onChange={(e) => onUpdateScore(student.id, { teacherNote: e.target.value })}
                            className="w-full text-xs py-1 px-1.5 border border-transparent hover:border-slate-300 focus:border-indigo-400 focus:bg-white rounded-sm bg-transparent outline-hidden"
                          />

                          {/* Nút AI nhận xét cá nhân */}
                          <button
                            type="button"
                            onClick={() => setCommentingStudent(student)}
                            title="Tạo lời nhận xét bằng AI cho học sinh này"
                            className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors shrink-0 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>

                          {/* Menu HỦY NHẬP ĐIỂM của học sinh này */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveStudentMenu(activeStudentMenu === student.id ? null : student.id);
                              }}
                              title="Hủy nhập điểm / Xóa điểm học sinh này"
                              className={`p-1 rounded-md transition-colors shrink-0 cursor-pointer ${
                                activeStudentMenu === student.id
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              }`}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>

                            {/* Dropdown Menu hủy điểm */}
                            {activeStudentMenu === student.id && (
                              <div 
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs"
                              >
                                <div className="px-3 py-1 font-bold text-slate-700 border-b border-slate-100 flex items-center justify-between">
                                  <span>Hủy / Xóa Điểm</span>
                                  <span className="text-[10px] text-slate-400 font-normal">#{student.stt}</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleClearAllRegularScoresForStudent(student.id);
                                    setActiveStudentMenu(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-slate-700 hover:text-rose-700 flex items-center space-x-2 transition-colors cursor-pointer"
                                >
                                  <Eraser className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Xóa các điểm ĐTX</span>
                                </button>

                                {((score.fifteenMinScores || []).length > 0) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleClearAllFifteenMinScoresForStudent(student.id);
                                      setActiveStudentMenu(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-slate-700 hover:text-rose-700 flex items-center space-x-2 transition-colors cursor-pointer"
                                  >
                                    <Eraser className="w-3.5 h-3.5 text-teal-600" />
                                    <span>Xóa các điểm 15 phút</span>
                                  </button>
                                )}

                                {score.midtermScore !== null && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleClearExamScore(student.id, 'midterm');
                                      setActiveStudentMenu(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-slate-700 hover:text-rose-700 flex items-center space-x-2 transition-colors cursor-pointer"
                                  >
                                    <Eraser className="w-3.5 h-3.5 text-blue-500" />
                                    <span>Hủy điểm Giữa kỳ</span>
                                  </button>
                                )}

                                {score.finalScore !== null && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleClearExamScore(student.id, 'final');
                                      setActiveStudentMenu(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-slate-700 hover:text-rose-700 flex items-center space-x-2 transition-colors cursor-pointer"
                                  >
                                    <Eraser className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>Hủy điểm Cuối kỳ</span>
                                  </button>
                                )}

                                {((score.boardBonusTotal || 0) > 0 || (score.boardBonusCount || 0) > 0) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleClearBoardBonus(student.id);
                                      setActiveStudentMenu(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-slate-700 hover:text-rose-700 flex items-center space-x-2 transition-colors cursor-pointer"
                                  >
                                    <Eraser className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Xóa điểm lên bảng (+{score.boardBonusTotal || 0}đ)</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    onOpenQuickBonus(student);
                                    setActiveStudentMenu(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-amber-50 text-slate-700 hover:text-amber-800 flex items-center space-x-2 transition-colors cursor-pointer"
                                >
                                  <Award className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Sửa / Xóa điểm lên bảng...</span>
                                </button>

                                <div className="border-t border-slate-100 my-1"></div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleClearAllScoresForStudent(student.id);
                                    setActiveStudentMenu(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-rose-100 text-rose-700 font-semibold flex items-center space-x-2 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Xóa sạch điểm em này</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer bảng */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div>
            Hiển thị <span className="font-semibold text-slate-700">{filteredAndSorted.length}</span> / {students.length} học sinh
          </div>
          <div className="flex items-center space-x-3 text-[11px]">
            <span>💡 Nhấp trực tiếp vào ô để nhập điểm (0.0 - 10.0)</span>
            <span className="hidden md:inline">• Dùng nút <strong>Hoàn tác</strong> (Ctrl+Z) nếu nhập sai</span>
            <span className="hidden md:inline">• Hệ số: TX ({weights.regularWeight}) | GK ({weights.midtermWeight}) | CK ({weights.finalWeight})</span>
          </div>
        </div>
      </div>

      {/* Modal AI Nhận xét cá nhân */}
      {commentingStudent && (
        <AIStudentCommentModal
          student={commentingStudent}
          score={scores.find((s) => s.studentId === commentingStudent.id)}
          classroom={classroom}
          weights={weights}
          disciplines={disciplines}
          onSaveComment={(studentId, comment) => {
            onUpdateScore(studentId, { teacherNote: comment });
          }}
          onClose={() => setCommentingStudent(null)}
        />
      )}

      {/* Modal AI Nhận xét hàng loạt cả lớp */}
      {showBatchCommentModal && (
        <AIBatchCommentModal
          classroom={classroom}
          students={students}
          scores={scores}
          weights={weights}
          disciplines={disciplines}
          onApplyBatchComments={(updates) => {
            if (onBatchUpdateScores) {
              onBatchUpdateScores(updates);
            } else {
              updates.forEach((u) => onUpdateScore(u.studentId, { teacherNote: u.comment }));
            }
          }}
          onClose={() => setShowBatchCommentModal(false)}
        />
      )}
    </div>
  );
};
