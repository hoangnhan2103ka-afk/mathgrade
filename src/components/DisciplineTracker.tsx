import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calculator, 
  BookOpen, 
  FileText, 
  AlertTriangle, 
  ThumbsUp, 
  Calendar, 
  Sparkles,
  Save,
  Check,
  Sun,
  Sunset,
  PenTool,
  Plus,
  X,
  Filter,
  Tag,
  Search
} from 'lucide-react';
import { Student, ClassRoom, DisciplineRecord, AttendanceStatus, BehaviorTag } from '../types';
import { BEHAVIOR_TAGS } from '../data/mockData';

interface StudentSessionState {
  attendance: AttendanceStatus;
  hasHomework: boolean;
  hasCalculator: boolean;
  hasTextbook: boolean;
  hasNotes: boolean; // Trạng thái ghi bài của học sinh
  behaviorTags: string[];
  notes: string;
}

interface DisciplineTrackerProps {
  classroom: ClassRoom;
  students: Student[];
  disciplines: DisciplineRecord[];
  onSaveDisciplineSession: (records: DisciplineRecord[]) => void;
}

export const DisciplineTracker: React.FC<DisciplineTrackerProps> = ({
  classroom,
  students,
  disciplines,
  onSaveDisciplineSession,
}) => {
  // Chọn ngày và tiết học hiện tại
  const todayStr = new Date().toISOString().split('T')[0];
  const [sessionDate, setSessionDate] = useState<string>(todayStr);
  const [sessionPeriod, setSessionPeriod] = useState<number>(1);
  const [successSaved, setSuccessSaved] = useState(false);
  
  // Bộ lọc danh mục thái độ/hành vi
  const [selectedTagCategory, setSelectedTagCategory] = useState<'all' | 'notes' | 'study' | 'attitude' | 'discipline'>('all');
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [activeStudentForTags, setActiveStudentForTags] = useState<string | null>(null);
  const [customTagInput, setCustomTagInput] = useState('');

  // Tìm các bản ghi đã lưu cho buổi học này (nếu có)
  const existingRecordsForSession = disciplines.filter(
    (d) => d.classId === classroom.id && d.date === sessionDate && d.period === sessionPeriod
  );

  // Khởi tạo state chỉnh sửa nề nếp cho buổi này
  const [sessionState, setSessionState] = useState<Record<string, StudentSessionState>>(() => {
    const map: Record<string, StudentSessionState> = {};
    students.forEach((st) => {
      const exist = existingRecordsForSession.find((r) => r.studentId === st.id);
      if (exist) {
        map[st.id] = {
          attendance: exist.attendance,
          hasHomework: exist.hasHomework,
          hasCalculator: exist.hasCalculator,
          hasTextbook: exist.hasTextbook,
          hasNotes: exist.hasNotes !== false,
          behaviorTags: [...(exist.behaviorTags || [])],
          notes: exist.notes || '',
        };
      } else {
        map[st.id] = {
          attendance: 'co_mat',
          hasHomework: true,
          hasCalculator: true,
          hasTextbook: true,
          hasNotes: true,
          behaviorTags: [],
          notes: '',
        };
      }
    });
    return map;
  });

  // Khi đổi ngày hoặc tiết, nạp lại state
  React.useEffect(() => {
    const map: Record<string, StudentSessionState> = {};
    const records = disciplines.filter(
      (d) => d.classId === classroom.id && d.date === sessionDate && d.period === sessionPeriod
    );
    students.forEach((st) => {
      const exist = records.find((r) => r.studentId === st.id);
      if (exist) {
        map[st.id] = {
          attendance: exist.attendance,
          hasHomework: exist.hasHomework,
          hasCalculator: exist.hasCalculator,
          hasTextbook: exist.hasTextbook,
          hasNotes: exist.hasNotes !== false,
          behaviorTags: [...(exist.behaviorTags || [])],
          notes: exist.notes || '',
        };
      } else {
        map[st.id] = {
          attendance: 'co_mat',
          hasHomework: true,
          hasCalculator: true,
          hasTextbook: true,
          hasNotes: true,
          behaviorTags: [],
          notes: '',
        };
      }
    });
    setSessionState(map);
    setSuccessSaved(false);
  }, [sessionDate, sessionPeriod, classroom.id, students, disciplines]);

  // Cập nhật trạng thái của 1 học sinh
  const updateStudentState = (studentId: string, updates: Partial<StudentSessionState>) => {
    setSessionState((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {
          attendance: 'co_mat',
          hasHomework: true,
          hasCalculator: true,
          hasTextbook: true,
          hasNotes: true,
          behaviorTags: [],
          notes: '',
        }),
        ...updates,
      },
    }));
    setSuccessSaved(false);
  };

  // Toggle tag hành vi
  const toggleBehaviorTag = (studentId: string, tagId: string) => {
    const currentTags = sessionState[studentId]?.behaviorTags || [];
    let newTags: string[];
    let extraUpdates: Partial<StudentSessionState> = {};

    if (currentTags.includes(tagId)) {
      newTags = currentTags.filter((t) => t !== tagId);
      if (tagId === 'khong_ghi_bai') {
        extraUpdates.hasNotes = true;
      }
    } else {
      newTags = [...currentTags, tagId];
      if (tagId === 'khong_ghi_bai' || tagId === 'vo_trang_khong_chua') {
        extraUpdates.hasNotes = false;
      }
    }
    updateStudentState(studentId, { behaviorTags: newTags, ...extraUpdates });
  };

  // Thêm hành vi tùy chỉnh mới
  const handleAddCustomTag = (studentId: string) => {
    const clean = customTagInput.trim();
    if (!clean) return;
    const customId = `custom_${clean.toLowerCase().replace(/\s+/g, '_')}`;
    const currentTags = sessionState[studentId]?.behaviorTags || [];
    if (!currentTags.includes(customId)) {
      updateStudentState(studentId, {
        behaviorTags: [...currentTags, customId],
      });
    }
    setCustomTagInput('');
  };

  // Chuyển đổi nhanh trạng thái ghi bài
  const toggleStudentNotes = (studentId: string) => {
    const currentHasNotes = sessionState[studentId]?.hasNotes !== false;
    const newHasNotes = !currentHasNotes;
    const currentTags = sessionState[studentId]?.behaviorTags || [];
    
    let newTags = [...currentTags];
    if (!newHasNotes) {
      // Đánh dấu không ghi bài -> Thêm tag khong_ghi_bai nếu chưa có
      if (!newTags.includes('khong_ghi_bai')) {
        newTags.push('khong_ghi_bai');
      }
    } else {
      // Đã ghi bài -> Gỡ các tag không ghi bài nếu có
      newTags = newTags.filter((t) => t !== 'khong_ghi_bai' && t !== 'vo_trang_khong_chua');
    }

    updateStudentState(studentId, {
      hasNotes: newHasNotes,
      behaviorTags: newTags,
    });
  };

  // Đánh dấu nhanh: Toàn bộ lớp Có Mặt & Đầy đủ đồ dùng & Ghi bài tốt
  const handleMarkAllPresentAndPrepared = () => {
    const map: Record<string, StudentSessionState> = {};
    students.forEach((st) => {
      map[st.id] = {
        attendance: 'co_mat',
        hasHomework: true,
        hasCalculator: true,
        hasTextbook: true,
        hasNotes: true,
        behaviorTags: [],
        notes: '',
      };
    });
    setSessionState(map);
  };

  // Lưu sổ nề nếp buổi học
  const handleSave = () => {
    const recordsToSave: DisciplineRecord[] = students.map((st) => {
      const state = sessionState[st.id] || {
        attendance: 'co_mat',
        hasHomework: true,
        hasCalculator: true,
        hasTextbook: true,
        hasNotes: true,
        behaviorTags: [],
        notes: '',
      };
      return {
        id: `disc-${classroom.id}-${st.id}-${sessionDate}-P${sessionPeriod}`,
        studentId: st.id,
        classId: classroom.id,
        date: sessionDate,
        period: sessionPeriod,
        attendance: state.attendance,
        hasHomework: state.hasHomework,
        hasCalculator: state.hasCalculator,
        hasTextbook: state.hasTextbook,
        hasNotes: state.hasNotes !== false,
        behaviorTags: state.behaviorTags,
        notes: state.notes,
        boardScoreAwarded: state.behaviorTags.includes('len_bang_tot') ? 1.0 : undefined,
      };
    });

    onSaveDisciplineSession(recordsToSave);
    setSuccessSaved(true);
    setTimeout(() => setSuccessSaved(false), 3000);
  };

  // Tính thống kê nhanh của buổi này
  const summary = useMemo(() => {
    let absent = 0;
    let late = 0;
    let forgotHW = 0;
    let forgotCalc = 0;
    let notTakingNotesCount = 0;
    let positiveCount = 0;

    Object.values(sessionState).forEach((item: StudentSessionState) => {
      if (item.attendance === 'vang_p' || item.attendance === 'vang_kp') absent++;
      if (item.attendance === 'di_tre') late++;
      if (!item.hasHomework) forgotHW++;
      if (!item.hasCalculator) forgotCalc++;
      if (item.hasNotes === false || item.behaviorTags.includes('khong_ghi_bai') || item.behaviorTags.includes('vo_trang_khong_chua')) {
        notTakingNotesCount++;
      }
      if (item.behaviorTags.some((t) => {
        const found = BEHAVIOR_TAGS.find((b) => b.id === t);
        return found?.type === 'positive';
      })) {
        positiveCount++;
      }
    });

    return { absent, late, forgotHW, forgotCalc, notTakingNotesCount, positiveCount };
  }, [sessionState]);

  // Lọc danh sách tag hành vi theo category và từ khóa
  const filteredTags = useMemo(() => {
    return BEHAVIOR_TAGS.filter((tag) => {
      const matchCat = selectedTagCategory === 'all' || tag.category === selectedTagCategory;
      const matchQuery = !tagSearchQuery.trim() || tag.label.toLowerCase().includes(tagSearchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [selectedTagCategory, tagSearchQuery]);

  // Cấu hình danh sách tiết học đầy đủ (Sáng 1-5, Chiều 6-10)
  const periodsList = [
    { value: 1, label: 'Tiết 1', session: 'morning' },
    { value: 2, label: 'Tiết 2', session: 'morning' },
    { value: 3, label: 'Tiết 3', session: 'morning' },
    { value: 4, label: 'Tiết 4', session: 'morning' },
    { value: 5, label: 'Tiết 5', session: 'morning' },
    { value: 6, label: 'Tiết 6 (Tiết 1 Chiều)', session: 'afternoon' },
    { value: 7, label: 'Tiết 7 (Tiết 2 Chiều)', session: 'afternoon' },
    { value: 8, label: 'Tiết 8 (Tiết 3 Chiều)', session: 'afternoon' },
    { value: 9, label: 'Tiết 9 (Tiết 4 Chiều)', session: 'afternoon' },
    { value: 10, label: 'Tiết 10 (Tiết 5 Chiều)', session: 'afternoon' },
  ];

  const currentPeriodInfo = periodsList.find((p) => p.value === sessionPeriod) || periodsList[0];

  return (
    <div className="space-y-6">
      {/* 1. Thanh Cấu Hình Buổi Dạy & Thống Kê Nhanh */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              <span>Sổ Theo Dõi Nề Nếp & Chuyên Cần Tiết Toán</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi điểm danh, BTVN, ghi chép bài và dụng cụ học tập (máy tính Casio, SGK) của lớp {classroom.name}
            </p>
          </div>

          {/* Chọn Ngày & Tiết Học (Sáng / Chiều) */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Chọn Ngày */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <Calendar className="w-4 h-4 text-slate-500" />
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-transparent outline-hidden cursor-pointer"
              />
            </div>

            {/* Dropdown Tiết Học Sáng / Chiều */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-2xs">
              {sessionPeriod <= 5 ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Sunset className="w-4 h-4 text-orange-500" />
              )}
              <select
                value={sessionPeriod}
                onChange={(e) => setSessionPeriod(Number(e.target.value))}
                className="text-xs font-semibold text-slate-800 bg-transparent outline-hidden cursor-pointer pr-1"
              >
                <optgroup label="☀️ Buổi Sáng (Tiết 1 - 5)">
                  <option value={1}>Tiết 1</option>
                  <option value={2}>Tiết 2</option>
                  <option value={3}>Tiết 3</option>
                  <option value={4}>Tiết 4</option>
                  <option value={5}>Tiết 5</option>
                </optgroup>
                <optgroup label="🌤️ Buổi Chiều (Tiết 6 - 10)">
                  <option value={6}>Tiết 6 (Tiết 1 Chiều)</option>
                  <option value={7}>Tiết 7 (Tiết 2 Chiều)</option>
                  <option value={8}>Tiết 8 (Tiết 3 Chiều)</option>
                  <option value={9}>Tiết 9 (Tiết 4 Chiều)</option>
                  <option value={10}>Tiết 10 (Tiết 5 Chiều)</option>
                </optgroup>
              </select>
            </div>

            {/* Nút Lưu */}
            <button
              type="button"
              onClick={handleSave}
              className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer ${
                successSaved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {successSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{successSaved ? 'Đã Lưu Sổ Nề Nếp!' : 'Lưu Nhật Ký Buổi Này'}</span>
            </button>
          </div>
        </div>

        {/* Thanh chọn nhanh tiết học Sáng / Chiều */}
        <div className="pt-3 pb-2 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 text-xs">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <span className="text-slate-400 font-medium flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chọn nhanh:</span>
            </span>

            {/* Nhóm Tiết Sáng */}
            <div className="inline-flex items-center bg-amber-50/80 p-0.5 rounded-lg border border-amber-200">
              <span className="px-1.5 text-[10px] font-bold text-amber-800">Sáng:</span>
              {[1, 2, 3, 4, 5].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSessionPeriod(p)}
                  className={`px-2 py-0.5 rounded-md font-bold text-xs transition-all cursor-pointer ${
                    sessionPeriod === p
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-amber-900 hover:bg-amber-100'
                  }`}
                >
                  T{p}
                </button>
              ))}
            </div>

            {/* Nhóm Tiết Chiều */}
            <div className="inline-flex items-center bg-blue-50/80 p-0.5 rounded-lg border border-blue-200">
              <span className="px-1.5 text-[10px] font-bold text-blue-800">Chiều:</span>
              {[6, 7, 8, 9, 10].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSessionPeriod(p)}
                  className={`px-2 py-0.5 rounded-md font-bold text-xs transition-all cursor-pointer ${
                    sessionPeriod === p
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-blue-900 hover:bg-blue-100'
                  }`}
                >
                  T{p} {p >= 6 ? `(C${p - 5})` : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="text-slate-500 text-xs">
            Đang ghi nề nếp: <span className="font-bold text-slate-800">{currentPeriodInfo.label}</span>
          </div>
        </div>

        {/* Thống kê nhanh buổi học (Đặc biệt có số em không ghi bài) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-4 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-slate-500 block">Sĩ số có mặt</span>
            <span className="text-sm font-bold text-slate-900">
              {students.length - summary.absent} / {students.length} HS
            </span>
          </div>

          <div className="bg-rose-50/70 p-2.5 rounded-lg border border-rose-200">
            <span className="text-rose-700 block">Vắng / Đi trễ</span>
            <span className="text-sm font-bold text-rose-900">
              {summary.absent} vắng, {summary.late} trễ
            </span>
          </div>

          <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-200">
            <span className="text-amber-800 block">Chưa làm BTVN</span>
            <span className="text-sm font-bold text-amber-900">
              {summary.forgotHW} học sinh
            </span>
          </div>

          <div className="bg-blue-50/70 p-2.5 rounded-lg border border-blue-200">
            <span className="text-blue-700 block">Quên Casio / SGK</span>
            <span className="text-sm font-bold text-blue-900">
              {summary.forgotCalc} học sinh
            </span>
          </div>

          {/* Cột thống kê KHÔNG GHI BÀI nổi bật */}
          <div className={`p-2.5 rounded-lg border transition-all ${
            summary.notTakingNotesCount > 0 
              ? 'bg-orange-50 border-orange-300 text-orange-950 font-medium' 
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <span className="text-orange-700 font-semibold block flex items-center space-x-1">
              <PenTool className="w-3 h-3" />
              <span>Không ghi bài</span>
            </span>
            <span className="text-sm font-extrabold text-orange-900">
              {summary.notTakingNotesCount} học sinh
            </span>
          </div>

          <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200">
            <span className="text-emerald-700 block">Tích cực / Điểm cộng</span>
            <span className="text-sm font-bold text-emerald-900">
              {summary.positiveCount} học sinh
            </span>
          </div>
        </div>

        {/* Nút đánh dấu nhanh tất cả */}
        <div className="mt-3.5 flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400">
            Mẹo: Click trực tiếp vào các nút "Ghi bài", "BTVN", "Casio" để đánh dấu nhanh học sinh vi phạm.
          </span>
          <button
            type="button"
            onClick={handleMarkAllPresentAndPrepared}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
          >
            <span>⚡ Đặt lại: Cả lớp có mặt, ghi bài & chuẩn bị đầy đủ</span>
          </button>
        </div>
      </div>

      {/* 2. Danh Sách Điểm Danh & Nề Nếp Học Sinh Trong Tiết */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <Tag className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-bold text-slate-700">Bộ lọc danh mục hành vi hiển thị:</span>
            <div className="inline-flex rounded-lg bg-white border border-slate-200 p-0.5">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'notes', label: '📝 Vở ghi & Chép bài' },
                { id: 'study', label: '📐 Học tập & Toán' },
                { id: 'attitude', label: '✨ Thái độ' },
                { id: 'discipline', label: '⚖️ Kỷ luật' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedTagCategory(c.id as any)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                    selectedTagCategory === c.id
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
            <input
              type="text"
              placeholder="Tìm kiếm thái độ / hành vi..."
              value={tagSearchQuery}
              onChange={(e) => setTagSearchQuery(e.target.value)}
              className="pl-7 pr-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg outline-hidden w-48 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-3 px-3 w-12 text-center">STT</th>
                <th className="py-3 px-4 min-w-[150px]">Học Sinh</th>
                <th className="py-3 px-3 min-w-[160px]">Điểm Danh Tiết Học</th>
                <th className="py-3 px-3 min-w-[280px] text-center">Vở Ghi & Đồ Dùng Môn Toán</th>
                <th className="py-3 px-3 min-w-[300px]">Thái Độ / Hành Vi Trong Giờ</th>
                <th className="py-3 px-3 min-w-[140px]">Ghi Chú</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-800">
              {students.map((student) => {
                const state = sessionState[student.id] || {
                  attendance: 'co_mat',
                  hasHomework: true,
                  hasCalculator: true,
                  hasTextbook: true,
                  hasNotes: true,
                  behaviorTags: [],
                  notes: '',
                };

                const isNotTakingNotes = state.hasNotes === false || state.behaviorTags.includes('khong_ghi_bai');

                return (
                  <tr 
                    key={student.id} 
                    className={`hover:bg-slate-50/70 transition-colors ${
                      state.attendance !== 'co_mat' || !state.hasHomework || !state.hasCalculator || isNotTakingNotes
                        ? 'bg-amber-50/25'
                        : ''
                    }`}
                  >
                    {/* STT */}
                    <td className="py-2.5 px-3 text-center text-slate-500 font-medium">
                      {student.stt}
                    </td>

                    {/* Họ tên */}
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-900">{student.fullName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{student.studentCode}</div>
                    </td>

                    {/* Điểm danh */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center space-x-1">
                        {[
                          { key: 'co_mat', label: 'Có mặt', color: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
                          { key: 'di_tre', label: 'Đi trễ', color: 'bg-amber-50 text-amber-700 border-amber-300' },
                          { key: 'vang_p', label: 'Phép', color: 'bg-blue-50 text-blue-700 border-blue-300' },
                          { key: 'vang_kp', label: 'K.Phép', color: 'bg-rose-50 text-rose-700 border-rose-300' },
                        ].map((att) => (
                          <button
                            key={att.key}
                            type="button"
                            onClick={() => updateStudentState(student.id, { attendance: att.key as AttendanceStatus })}
                            className={`px-2 py-1 text-[11px] rounded-md font-medium border transition-all cursor-pointer ${
                              state.attendance === att.key
                                ? `${att.color} font-bold shadow-2xs`
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            {att.label}
                          </button>
                        ))}
                      </div>
                    </td>

                    {/* Vở ghi bài & Dụng cụ học tập Toán */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-center space-x-1.5 text-xs">
                        {/* 1. Nút Ghi Chép Bài (Yêu cầu trọng tâm: Không ghi bài) */}
                        <button
                          type="button"
                          onClick={() => toggleStudentNotes(student.id)}
                          title={state.hasNotes !== false ? 'Đã ghi bài đầy đủ (Bấm để báo Không ghi bài)' : 'Không ghi bài / lười chép bài (Bấm để gỡ lỗi)'}
                          className={`flex items-center space-x-1 px-2.5 py-1 rounded-md border text-[11px] transition-all cursor-pointer ${
                            state.hasNotes !== false
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-orange-100 text-orange-900 border-orange-400 font-extrabold ring-1 ring-orange-300'
                          }`}
                        >
                          <PenTool className="w-3 h-3" />
                          <span>{state.hasNotes !== false ? 'Ghi bài tốt' : 'Không ghi bài!'}</span>
                        </button>

                        {/* 2. BTVN */}
                        <button
                          type="button"
                          onClick={() => updateStudentState(student.id, { hasHomework: !state.hasHomework })}
                          title={state.hasHomework ? 'Đã làm BTVN đầy đủ' : 'Chưa làm BTVN'}
                          className={`flex items-center space-x-1 px-2 py-1 rounded-md border text-[11px] transition-all cursor-pointer ${
                            state.hasHomework
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-100 text-rose-900 border-rose-300 font-bold'
                          }`}
                        >
                          <FileText className="w-3 h-3" />
                          <span>{state.hasHomework ? 'Có BTVN' : 'Quên BTVN'}</span>
                        </button>

                        {/* 3. Máy tính Casio */}
                        <button
                          type="button"
                          onClick={() => updateStudentState(student.id, { hasCalculator: !state.hasCalculator })}
                          title={state.hasCalculator ? 'Có mang máy tính Casio' : 'Quên máy tính bỏ túi'}
                          className={`flex items-center space-x-1 px-2 py-1 rounded-md border text-[11px] transition-all cursor-pointer ${
                            state.hasCalculator
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-rose-100 text-rose-900 border-rose-300 font-bold'
                          }`}
                        >
                          <Calculator className="w-3 h-3" />
                          <span>{state.hasCalculator ? 'Máy tính' : 'Quên Casio'}</span>
                        </button>

                        {/* 4. SGK & Vở */}
                        <button
                          type="button"
                          onClick={() => updateStudentState(student.id, { hasTextbook: !state.hasTextbook })}
                          title={state.hasTextbook ? 'Có mang SGK/vở' : 'Quên SGK/vở ghi'}
                          className={`flex items-center space-x-1 px-2 py-1 rounded-md border text-[11px] transition-all cursor-pointer ${
                            state.hasTextbook
                              ? 'bg-slate-100 text-slate-700 border-slate-200'
                              : 'bg-rose-100 text-rose-900 border-rose-300 font-bold'
                          }`}
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>{state.hasTextbook ? 'SGK/Vở' : 'Quên SGK'}</span>
                        </button>
                      </div>
                    </td>

                    {/* Thái độ / Hành vi trong giờ (Đa dạng hóa các hành vi) */}
                    <td className="py-2.5 px-3">
                      <div className="space-y-1.5">
                        {/* Các tag hiện đang được gán cho học sinh */}
                        {state.behaviorTags.length > 0 && (
                          <div className="flex flex-wrap gap-1 items-center pb-1">
                            {state.behaviorTags.map((tagId) => {
                              const found = BEHAVIOR_TAGS.find((b) => b.id === tagId);
                              const isPositive = found?.type === 'positive';
                              const label = found ? found.label : tagId.replace(/^custom_/, '').replace(/_/g, ' ');

                              return (
                                <span
                                  key={tagId}
                                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                    isPositive
                                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                      : 'bg-rose-100 text-rose-900 border-rose-300'
                                  }`}
                                >
                                  <span>{isPositive ? '✓' : '⚠'} {label}</span>
                                  <button
                                    type="button"
                                    onClick={() => toggleBehaviorTag(student.id, tagId)}
                                    className="hover:text-rose-700 ml-0.5 cursor-pointer"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Danh sách nút tag hành vi được lọc theo danh mục */}
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                          {filteredTags.map((tag) => {
                            const isSelected = state.behaviorTags.includes(tag.id);
                            return (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => toggleBehaviorTag(student.id, tag.id)}
                                className={`px-2 py-0.5 text-[10px] rounded-full border transition-all cursor-pointer whitespace-nowrap ${
                                  isSelected
                                    ? tag.type === 'positive'
                                      ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-2xs'
                                      : 'bg-rose-600 text-white border-rose-600 font-bold shadow-2xs'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {tag.type === 'positive' ? '✓ ' : '⚠ '}
                                {tag.label}
                                {tag.bonusPoints ? ` (+${tag.bonusPoints}đ)` : ''}
                              </button>
                            );
                          })}
                        </div>

                        {/* Thêm hành vi tùy chỉnh nhanh */}
                        <div className="flex items-center space-x-1 pt-1">
                          <input
                            type="text"
                            placeholder="+ Thêm hành vi khác..."
                            value={activeStudentForTags === student.id ? customTagInput : ''}
                            onFocus={() => setActiveStudentForTags(student.id)}
                            onChange={(e) => {
                              setActiveStudentForTags(student.id);
                              setCustomTagInput(e.target.value);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCustomTag(student.id);
                              }
                            }}
                            className="text-[11px] px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-indigo-400 outline-hidden w-40"
                          />
                          {activeStudentForTags === student.id && customTagInput.trim() && (
                            <button
                              type="button"
                              onClick={() => handleAddCustomTag(student.id)}
                              className="px-1.5 py-0.5 bg-indigo-600 text-white rounded-md text-[10px] font-bold cursor-pointer"
                            >
                              Thêm
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Ghi chú */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={state.notes || ''}
                        onChange={(e) => updateStudentState(student.id, { notes: e.target.value })}
                        placeholder="Ghi chú thêm..."
                        className="w-full text-xs p-1 border border-transparent hover:border-slate-300 focus:border-indigo-400 focus:bg-white rounded-sm bg-transparent outline-hidden"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
