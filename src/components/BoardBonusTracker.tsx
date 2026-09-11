import React, { useState } from 'react';
import { 
  Sparkles, 
  Award, 
  Dices, 
  CheckCircle2, 
  UserCheck, 
  TrendingUp, 
  AlertCircle,
  Clock,
  Plus,
  Trash2,
  Edit3,
  Search,
  Check,
  X,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Student, StudentScore, ClassRoom, DisciplineRecord } from '../types';

interface BoardBonusTrackerProps {
  classroom: ClassRoom;
  students: Student[];
  scores: StudentScore[];
  disciplines: DisciplineRecord[];
  onAddBoardScore: (
    studentId: string, 
    bonusPoints: number, 
    exerciseNote: string, 
    recordAsRegularScore: boolean
  ) => void;
  onUpdateBoardScore?: (
    studentId: string,
    newTotal: number,
    newCount: number,
    note?: string
  ) => void;
  onDeleteBoardScore?: (studentId: string) => void;
}

export const BoardBonusTracker: React.FC<BoardBonusTrackerProps> = ({
  classroom,
  students,
  scores,
  disciplines,
  onAddBoardScore,
  onUpdateBoardScore,
  onDeleteBoardScore,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [bonusValue, setBonusValue] = useState<number>(0.5);
  const [exerciseNote, setExerciseNote] = useState<string>('Chữa bài tập phương trình trên bảng');
  const [recordAsRegularScore, setRecordAsRegularScore] = useState<boolean>(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [calledStudent, setCalledStudent] = useState<Student | null>(null);

  // Search & Filter trong danh sách học sinh
  const [searchQuery, setSearchQuery] = useState('');
  const [filterView, setFilterView] = useState<'all' | 'has_bonus' | 'uncalled'>('all');

  // Trạng thái sửa điểm trực tiếp
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [customTotalInput, setCustomTotalInput] = useState<number>(0);
  const [customCountInput, setCustomCountInput] = useState<number>(0);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Học sinh được chọn hiện tại
  const currentStudent = students.find((s) => s.id === selectedStudentId);
  const currentScore = scores.find((s) => s.studentId === selectedStudentId);

  // Thống kê số lần lên bảng
  const studentStats = students.map((st) => {
    const sc = scores.find((s) => s.studentId === st.id);
    return {
      student: st,
      bonusTotal: sc?.boardBonusTotal || 0,
      bonusCount: sc?.boardBonusCount || 0,
      lastScores: sc?.regularScores || [],
    };
  });

  const sortedByBonus = [...studentStats].sort((a, b) => b.bonusTotal - a.bonusTotal);
  const uncalledStudents = studentStats.filter((s) => s.bonusCount === 0);

  // Đồng bộ giá trị form sửa khi chọn học sinh
  React.useEffect(() => {
    if (currentScore) {
      setCustomTotalInput(currentScore.boardBonusTotal || 0);
      setCustomCountInput(currentScore.boardBonusCount || 0);
    } else {
      setCustomTotalInput(0);
      setCustomCountInput(0);
    }
  }, [selectedStudentId, currentScore]);

  // Hiển thị thông báo thành công tạm thời
  const showToast = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  // Mở popup/form sửa điểm nhanh cho 1 học sinh
  const handleStartEdit = (studentId: string) => {
    const sc = scores.find((s) => s.studentId === studentId);
    setSelectedStudentId(studentId);
    setEditingStudentId(studentId);
    setCustomTotalInput(sc?.boardBonusTotal || 0);
    setCustomCountInput(sc?.boardBonusCount || 0);
    setFormMode('edit');
  };

  // Lưu chỉnh sửa điểm cộng
  const handleSaveEditBonus = (studentId: string, newTotal: number, newCount: number) => {
    if (onUpdateBoardScore) {
      onUpdateBoardScore(studentId, newTotal, newCount);
      const st = students.find((s) => s.id === studentId);
      showToast(`Đã sửa điểm cộng của ${st?.fullName || 'học sinh'} thành +${newTotal}đ (${newCount} lần)!`);
    }
    setEditingStudentId(null);
  };

  // Xóa toàn bộ điểm cộng của học sinh
  const handleDeleteBonus = (studentId: string) => {
    const st = students.find((s) => s.id === studentId);
    if (onDeleteBoardScore) {
      onDeleteBoardScore(studentId);
    } else if (onUpdateBoardScore) {
      onUpdateBoardScore(studentId, 0, 0);
    }
    showToast(`Đã xóa sạch điểm cộng của ${st?.fullName || 'học sinh'} về 0đ!`);
    setEditingStudentId(null);
  };

  // Giảm bớt điểm cộng (-0.5 hoặc -0.25)
  const handleReduceBonus = (studentId: string, amount: number) => {
    const sc = scores.find((s) => s.studentId === studentId);
    const currTotal = sc?.boardBonusTotal || 0;
    const currCount = sc?.boardBonusCount || 0;
    const newTotal = Math.max(0, Math.round((currTotal - amount) * 100) / 100);
    const newCount = Math.max(0, currCount - 1);
    
    if (onUpdateBoardScore) {
      onUpdateBoardScore(studentId, newTotal, newCount);
      const st = students.find((s) => s.id === studentId);
      showToast(`Đã trừ ${amount}đ của ${st?.fullName || 'học sinh'} (còn +${newTotal}đ)!`);
    }
  };

  // Hiệu ứng gọi học sinh ngẫu nhiên lên bảng
  const handleRandomCall = () => {
    if (students.length === 0) return;
    setIsShuffling(true);
    setCalledStudent(null);

    let counter = 0;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * students.length);
      setCalledStudent(students[randomIndex]);
      counter++;

      if (counter > 18) {
        clearInterval(interval);
        setIsShuffling(false);
        const finalStudent = students[Math.floor(Math.random() * students.length)];
        setCalledStudent(finalStudent);
        setSelectedStudentId(finalStudent.id);

        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.6 },
        });
      }
    }, 90);
  };

  const handleAwardBonus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    onAddBoardScore(selectedStudentId, bonusValue, exerciseNote, recordAsRegularScore);

    // Bắn pháo hoa nhỏ ăn mừng
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.7 },
    });

    // Reset ghi chú ngắn gọn
    setExerciseNote('');
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Giới Thiệu & Thẻ Hành Động Nhanh */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-semibold backdrop-blur-xs mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>Khuyến khích học tập tích cực</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Điểm Cộng & Gọi Lên Bảng Môn Toán
            </h2>
            <p className="text-amber-100 text-xs sm:text-sm max-w-2xl mt-1">
              Khuyến khích học sinh xung phong giải bài, trình bày lời giải toán trên bảng. Điểm cộng sẽ được tích lũy và nâng điểm trung bình môn theo quy định.
            </p>
          </div>

          <button
            id="btn-random-student"
            type="button"
            onClick={handleRandomCall}
            disabled={isShuffling}
            className="flex items-center space-x-2 px-5 py-3 bg-white text-amber-900 hover:bg-amber-50 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-75 shrink-0 cursor-pointer"
          >
            <Dices className={`w-5 h-5 text-amber-600 ${isShuffling ? 'animate-spin' : ''}`} />
            <span>{isShuffling ? 'Đang quay ngẫu nhiên...' : '🎲 Quay Gọi Học Sinh Lên Bảng'}</span>
          </button>
        </div>

        {/* Kết quả quay ngẫu nhiên */}
        {calledStudent && (
          <div className="mt-4 p-3 bg-white/15 backdrop-blur-md rounded-xl border border-white/30 flex items-center space-x-3 animate-fade-in">
            <div className="w-10 h-10 rounded-full bg-white text-amber-600 flex items-center justify-center font-bold text-lg">
              {calledStudent.stt}
            </div>
            <div>
              <div className="text-xs text-amber-100">Học sinh được gọi lên bảng:</div>
              <div className="text-base font-extrabold text-white">
                {calledStudent.fullName} ({calledStudent.studentCode})
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Thông báo thao tác thành công nếu có */}
      {actionSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs sm:text-sm px-4 py-2.5 rounded-xl flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-800 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Hai Cột: Form Chấm/Sửa/Xóa Điểm Lên Bảng & Danh Sách Học Sinh */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột Trái: Chấm hoặc Sửa / Xóa Điểm Lên Bảng */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                {formMode === 'add' ? 'Chấm Điểm Lên Bảng' : 'Sửa / Xóa Điểm Cộng'}
              </h3>
            </div>
            {/* Chuyển đổi nhanh chế độ */}
            <div className="flex rounded-md bg-slate-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setFormMode('add')}
                className={`px-2 py-1 rounded font-semibold transition-all cursor-pointer ${
                  formMode === 'add'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                + Chấm Điểm
              </button>
              <button
                type="button"
                onClick={() => setFormMode('edit')}
                className={`px-2 py-1 rounded font-semibold transition-all cursor-pointer ${
                  formMode === 'edit'
                    ? 'bg-white text-amber-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ✏️ Sửa / Xóa
              </button>
            </div>
          </div>

          {/* CHẾ ĐỘ 1: CHẤM ĐIỂM MỚI (+) */}
          {formMode === 'add' ? (
            <form onSubmit={handleAwardBonus} className="space-y-4">
              {/* Chọn học sinh */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chọn Học Sinh Lên Bảng *
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full text-xs sm:text-sm font-medium border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-hidden"
                >
                  {students.map((st) => {
                    const sc = scores.find((s) => s.studentId === st.id);
                    return (
                      <option key={st.id} value={st.id}>
                        #{st.stt} - {st.fullName} ({sc?.boardBonusTotal || 0}đ cộng / {sc?.boardBonusCount || 0} lần)
                      </option>
                    );
                  })}
                </select>
                {currentScore && (currentScore.boardBonusTotal || 0) > 0 && (
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Đang có: <strong className="text-amber-700">+{currentScore.boardBonusTotal}đ</strong> ({currentScore.boardBonusCount} lần)</span>
                    <button
                      type="button"
                      onClick={() => setFormMode('edit')}
                      className="text-indigo-600 hover:underline font-medium"
                    >
                      Sửa/Xóa điểm em này
                    </button>
                  </div>
                )}
              </div>

              {/* Mức điểm thưởng */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mức Điểm Cộng Thưởng
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 0.25, label: '+0.25 đ', desc: 'Chữa bài tập' },
                    { value: 0.5, label: '+0.5 đ', desc: 'Lời giải tốt' },
                    { value: 1.0, label: '+1.0 đ', desc: 'Bài toán khó' },
                  ].map((tier) => (
                    <button
                      key={tier.value}
                      type="button"
                      onClick={() => setBonusValue(tier.value)}
                      className={`py-2 px-1 rounded-lg text-center border transition-all cursor-pointer ${
                        bonusValue === tier.value
                          ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-sm font-bold">{tier.label}</div>
                      <div className="text-[10px] text-slate-500">{tier.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nội dung bài toán */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nội Dung Bài Toán / Ghi Chú
                </label>
                <input
                  type="text"
                  value={exerciseNote}
                  onChange={(e) => setExerciseNote(e.target.value)}
                  placeholder="Ví dụ: Bài 3.2 - Tìm tập xác định của hàm số..."
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>

              {/* Tùy chọn ghi vào cột ĐTX */}
              <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/80">
                <label className="flex items-start space-x-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={recordAsRegularScore}
                    onChange={(e) => setRecordAsRegularScore(e.target.checked)}
                    className="mt-0.5 rounded-sm border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-amber-900 block">
                      Đồng thời ghi thành một đầu điểm ĐTX 10 điểm
                    </span>
                    <span className="text-amber-700 text-[11px]">
                      (Phù hợp khi học sinh giải xuất sắc câu hỏi kiểm tra bài cũ trên bảng)
                    </span>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs hover:shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Xác Nhận Cộng Điểm Cho Học Sinh</span>
              </button>
            </form>
          ) : (
            /* CHẾ ĐỘ 2: SỬA / XÓA ĐIỂM CỘNG LÊN BẢNG (✏️/🗑️) */
            <div className="space-y-4 pt-1">
              {/* Chọn học sinh muốn sửa */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chọn Học Sinh Cần Sửa / Xóa Điểm
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                    const sc = scores.find((s) => s.studentId === e.target.value);
                    setCustomTotalInput(sc?.boardBonusTotal || 0);
                    setCustomCountInput(sc?.boardBonusCount || 0);
                  }}
                  className="w-full text-xs sm:text-sm font-medium border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                >
                  {students.map((st) => {
                    const sc = scores.find((s) => s.studentId === st.id);
                    return (
                      <option key={st.id} value={st.id}>
                        #{st.stt} - {st.fullName} ({sc?.boardBonusTotal || 0}đ / {sc?.boardBonusCount || 0} lần)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Box chỉnh sửa điểm */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Điều Chỉnh Điểm Cộng & Số Lần</span>
                  <span className="text-[11px] text-amber-700 font-semibold">
                    Hiện tại: +{currentScore?.boardBonusTotal || 0}đ ({currentScore?.boardBonusCount || 0} lần)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Tổng điểm cộng (đ):
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      max="10"
                      value={customTotalInput}
                      onChange={(e) => setCustomTotalInput(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full text-sm font-bold text-amber-900 p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Số lần lên bảng:
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="50"
                      value={customCountInput}
                      onChange={(e) => setCustomCountInput(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-sm font-bold text-slate-900 p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Các nút chỉnh nhanh */}
                <div>
                  <div className="text-[10px] text-slate-500 mb-1">Điều chỉnh nhanh:</div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomTotalInput((p) => Math.max(0, Math.round((p - 0.5) * 100) / 100));
                        setCustomCountInput((p) => Math.max(0, p - 1));
                      }}
                      className="px-2 py-1 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md cursor-pointer"
                    >
                      -0.5 đ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomTotalInput((p) => Math.max(0, Math.round((p - 0.25) * 100) / 100));
                        setCustomCountInput((p) => Math.max(0, p - 1));
                      }}
                      className="px-2 py-1 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md cursor-pointer"
                    >
                      -0.25 đ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomTotalInput((p) => Math.round((p + 0.25) * 100) / 100);
                        setCustomCountInput((p) => p + 1);
                      }}
                      className="px-2 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md cursor-pointer"
                    >
                      +0.25 đ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomTotalInput((p) => Math.round((p + 0.5) * 100) / 100);
                        setCustomCountInput((p) => p + 1);
                      }}
                      className="px-2 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md cursor-pointer"
                    >
                      +0.5 đ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomTotalInput(0);
                        setCustomCountInput(0);
                      }}
                      className="px-2 py-1 text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md ml-auto cursor-pointer"
                    >
                      Về 0
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveEditBonus(selectedStudentId, customTotalInput, customCountInput)}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Lưu Cập Nhật Điểm</span>
                </button>
              </div>

              {/* Nút Xóa Sạch Điểm Cộng */}
              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-rose-900">Xóa Điểm Lên Bảng</div>
                  <div className="text-[11px] text-rose-700">Đề phòng nhập sai học sinh</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteBonus(selectedStudentId)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg flex items-center space-x-1 shadow-xs transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa Về 0đ</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Cột Phải: Bảng Danh Sách Theo Dõi & Sửa/Xóa Nhanh */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            {/* Header và Bộ lọc tìm kiếm */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                  Bảng Theo Dõi & Quản Lý Điểm Cộng
                </h3>
              </div>

              {/* Thanh tìm kiếm & Tabs lọc */}
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm tên, mã số..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-400 outline-hidden w-36 sm:w-44"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="flex rounded-md bg-slate-100 p-0.5 text-[11px] font-medium">
                  <button
                    type="button"
                    onClick={() => setFilterView('all')}
                    className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                      filterView === 'all' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Tất cả ({students.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterView('has_bonus')}
                    className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                      filterView === 'has_bonus' ? 'bg-white text-amber-900 font-bold shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Có điểm ({studentStats.filter((s) => s.bonusTotal > 0).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterView('uncalled')}
                    className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                      filterView === 'uncalled' ? 'bg-white text-rose-900 font-bold shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Chưa lên ({uncalledStudents.length})
                  </button>
                </div>
              </div>
            </div>

            {/* Danh sách học sinh kèm thao tác Sửa / Xóa Điểm */}
            <div className="divide-y divide-slate-100 mt-2 max-h-96 overflow-y-auto pr-1">
              {sortedByBonus
                .filter(({ student, bonusTotal, bonusCount }) => {
                  const matchQuery =
                    student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    student.studentCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    student.stt.toString().includes(searchQuery);
                  if (!matchQuery) return false;

                  if (filterView === 'has_bonus') return bonusTotal > 0 || bonusCount > 0;
                  if (filterView === 'uncalled') return bonusCount === 0;
                  return true;
                })
                .map(({ student, bonusTotal, bonusCount }, idx) => {
                  const isEditing = editingStudentId === student.id;

                  return (
                    <div
                      key={student.id}
                      className={`py-2.5 px-2 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm transition-colors ${
                        isEditing
                          ? 'bg-indigo-50/70 border border-indigo-200'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Cột Tên & Thứ hạng */}
                      <div className="flex items-center space-x-3">
                        <span
                          className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center font-bold text-xs ${
                            idx === 0 && bonusTotal > 0
                              ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-400'
                              : idx === 1 && bonusTotal > 0
                              ? 'bg-slate-200 text-slate-700'
                              : idx === 2 && bonusTotal > 0
                              ? 'bg-amber-50 text-amber-800'
                              : 'text-slate-400 bg-slate-100'
                          }`}
                        >
                          #{student.stt}
                        </span>
                        <div>
                          <span className="font-semibold text-slate-900">{student.fullName}</span>
                          <span className="text-slate-400 text-xs ml-2 font-mono">{student.studentCode}</span>
                        </div>
                      </div>

                      {/* Cột Điểm và Thao tác Sửa / Xóa */}
                      <div className="flex items-center space-x-2 mt-2 sm:mt-0 ml-9 sm:ml-0">
                        {isEditing ? (
                          /* Giao diện sửa trực tiếp */
                          <div className="flex items-center space-x-1.5 bg-white p-1 rounded-md border border-indigo-300">
                            <span className="text-[10px] text-slate-400 font-medium">Điểm:</span>
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              max="10"
                              value={customTotalInput}
                              onChange={(e) => setCustomTotalInput(Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-14 text-xs font-bold text-amber-900 p-1 border border-slate-200 rounded-sm"
                            />
                            <span className="text-[10px] text-slate-400 font-medium">Lần:</span>
                            <input
                              type="number"
                              step="1"
                              min="0"
                              value={customCountInput}
                              onChange={(e) => setCustomCountInput(Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-10 text-xs font-bold text-slate-800 p-1 border border-slate-200 rounded-sm"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditBonus(student.id, customTotalInput, customCountInput)}
                              title="Lưu sửa điểm"
                              className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingStudentId(null)}
                              title="Hủy"
                              className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-sm cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          /* Hiển thị điểm và các nút thao tác nhanh */
                          <>
                            <span className="text-xs text-slate-500 whitespace-nowrap">
                              {bonusCount} lần
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-bold text-xs whitespace-nowrap ${
                                bonusTotal > 0
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              +{bonusTotal} đ
                            </span>

                            {/* Nút Sửa điểm */}
                            <button
                              type="button"
                              onClick={() => handleStartEdit(student.id)}
                              title="Sửa điểm cộng lên bảng của học sinh này"
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Nút trừ nhanh -0.5đ nếu đã có điểm */}
                            {bonusTotal > 0 && (
                              <button
                                type="button"
                                onClick={() => handleReduceBonus(student.id, 0.5)}
                                title="Trừ 0.5đ (giảm bớt điểm nhập thừa)"
                                className="px-1.5 py-0.5 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md cursor-pointer transition-colors"
                              >
                                -0.5đ
                              </button>
                            )}

                            {/* Nút Xóa sạch điểm cộng */}
                            {bonusTotal > 0 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteBonus(student.id)}
                                title="Xóa điểm cộng lên bảng của em này (Về 0đ)"
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Nhắc nhở: Học sinh chưa lên bảng lần nào */}
          {uncalledStudents.length > 0 && filterView !== 'has_bonus' && (
            <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-rose-900">
                    Cần Khuyến Khích Gọi Lên Bảng ({uncalledStudents.length} học sinh)
                  </h4>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Các bạn dưới đây chưa từng lên bảng chữa bài trong học kỳ này, thầy/cô nên ưu tiên gọi:
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {uncalledStudents.map(({ student }) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudentId(student.id);
                          setFormMode('add');
                        }}
                        className="px-2 py-1 text-xs bg-white text-rose-800 border border-rose-300 rounded-md font-medium hover:bg-rose-100 transition-colors cursor-pointer"
                      >
                        #{student.stt} {student.fullName}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
