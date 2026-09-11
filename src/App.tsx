import React, { useState, useEffect } from 'react';
import { 
  ClassRoom, 
  Student, 
  StudentScore, 
  DisciplineRecord, 
  GradeWeights,
  TeacherProfile
} from './types';
import { 
  INITIAL_CLASSES, 
  INITIAL_STUDENTS, 
  INITIAL_SCORES, 
  INITIAL_DISCIPLINE, 
  DEFAULT_WEIGHTS,
  INITIAL_TEACHER
} from './data/mockData';
import { exportGradeBookToExcel } from './utils/exportUtils';
import { Navbar } from './components/Navbar';
import { GradeBookView } from './components/GradeBookView';
import { BoardBonusTracker } from './components/BoardBonusTracker';
import { DisciplineTracker } from './components/DisciplineTracker';
import { StudentManager } from './components/StudentManager';
import { PeriodicReports } from './components/PeriodicReports';
import { SettingsModal } from './components/SettingsModal';
import { QuickBonusModal } from './components/QuickBonusModal';
import { TeacherProfileModal } from './components/TeacherProfileModal';
import { ClassManagerModal } from './components/ClassManagerModal';
import { SyncModal } from './components/SyncModal';
import { ExportExcelModal } from './components/ExportExcelModal';
import { 
  fetchServerData, 
  pushServerData, 
  resetServerData,
  restoreDefaultServerData
} from './services/syncService';

export default function App() {
  // 0. Hồ sơ Giáo viên
  const [teacher, setTeacher] = useState<TeacherProfile>(() => {
    try {
      const saved = localStorage.getItem('mathgrade_teacher_v2');
      return saved ? JSON.parse(saved) : INITIAL_TEACHER;
    } catch {
      return INITIAL_TEACHER;
    }
  });

  // 1. Quản lý trạng thái Lớp học
  const [classes, setClasses] = useState<ClassRoom[]>(() => {
    try {
      const saved = localStorage.getItem('mathgrade_classes_v2');
      return saved ? JSON.parse(saved) : INITIAL_CLASSES;
    } catch {
      return INITIAL_CLASSES;
    }
  });

  const [currentClassId, setCurrentClassId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('mathgrade_curr_class_v2');
      return saved || classes[0]?.id || 'cls-10a1';
    } catch {
      return classes[0]?.id || 'cls-10a1';
    }
  });

  const [semester, setSemester] = useState<'HK1' | 'HK2'>('HK1');
  const [activeTab, setActiveTab] = useState<string>('gradebook');

  // 2. Danh sách Học sinh
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem('mathgrade_students_v2');
      return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
    } catch {
      return INITIAL_STUDENTS;
    }
  });

  // 3. Sổ Điểm
  const [scores, setScores] = useState<StudentScore[]>(() => {
    try {
      const saved = localStorage.getItem('mathgrade_scores_v2');
      return saved ? JSON.parse(saved) : INITIAL_SCORES;
    } catch {
      return INITIAL_SCORES;
    }
  });

  // 4. Sổ Nề Nếp
  const [disciplines, setDisciplines] = useState<DisciplineRecord[]>(() => {
    try {
      const saved = localStorage.getItem('mathgrade_discipline_v2');
      return saved ? JSON.parse(saved) : INITIAL_DISCIPLINE;
    } catch {
      return INITIAL_DISCIPLINE;
    }
  });

  // 5. Cấu hình hệ số
  const [weights, setWeights] = useState<GradeWeights>(() => {
    try {
      const saved = localStorage.getItem('mathgrade_weights_v2');
      return saved ? JSON.parse(saved) : DEFAULT_WEIGHTS;
    } catch {
      return DEFAULT_WEIGHTS;
    }
  });

  // Modal states
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showTeacherModal, setShowTeacherModal] = useState<boolean>(false);
  const [showClassModal, setShowClassModal] = useState<boolean>(false);
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [quickBonusStudent, setQuickBonusStudent] = useState<Student | null>(null);

  // Trạng thái đồng bộ đám mây (Multi-device Sync)
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isInitialSyncDone, setIsInitialSyncDone] = useState<boolean>(false);

  // Lưu trữ tự động vào localStorage
  useEffect(() => {
    localStorage.setItem('mathgrade_teacher_v2', JSON.stringify(teacher));
  }, [teacher]);

  useEffect(() => {
    localStorage.setItem('mathgrade_classes_v2', JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem('mathgrade_curr_class_v2', currentClassId);
  }, [currentClassId]);

  useEffect(() => {
    localStorage.setItem('mathgrade_students_v2', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('mathgrade_scores_v2', JSON.stringify(scores));
  }, [scores]);

  useEffect(() => {
    localStorage.setItem('mathgrade_discipline_v2', JSON.stringify(disciplines));
  }, [disciplines]);

  useEffect(() => {
    localStorage.setItem('mathgrade_weights_v2', JSON.stringify(weights));
  }, [weights]);

  // 1. Đồng bộ lúc mở ứng dụng (Initial cloud sync check)
  useEffect(() => {
    let isMounted = true;
    const initSync = async () => {
      try {
        setSyncStatus('syncing');
        const res = await fetchServerData();
        if (!isMounted) return;

        if (res && res.data) {
          const sData = res.data;
          if (sData.teacher) setTeacher(sData.teacher);
          if (sData.classes && sData.classes.length > 0) {
            setClasses(sData.classes);
            setCurrentClassId(sData.classes[0].id);
          }
          if (sData.students) setStudents(sData.students);
          if (sData.scores) setScores(sData.scores);
          if (sData.disciplines) setDisciplines(sData.disciplines);
          if (sData.weights) setWeights(sData.weights);

          setLastSyncedAt(res.updatedAt ? new Date(res.updatedAt) : new Date());
          setSyncStatus('synced');
        } else {
          // Chưa có dữ liệu máy chủ -> đẩy dữ liệu hiện tại lên
          await pushServerData({
            teacher,
            classes,
            students,
            scores,
            disciplines,
            weights,
          });
          if (isMounted) {
            setLastSyncedAt(new Date());
            setSyncStatus('synced');
          }
        }
      } catch (err) {
        console.warn('Lỗi kết nối máy chủ đồng bộ:', err);
        if (isMounted) setSyncStatus('offline');
      } finally {
        if (isMounted) setIsInitialSyncDone(true);
      }
    };

    initSync();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Tự động lưu và đồng bộ lên server khi dữ liệu thay đổi (Debounce 1.5s)
  useEffect(() => {
    if (!isInitialSyncDone) return;

    const timer = setTimeout(async () => {
      try {
        setSyncStatus('syncing');
        const res = await pushServerData({
          teacher,
          classes,
          students,
          scores,
          disciplines,
          weights,
        });
        if (res && res.success) {
          setSyncStatus('synced');
          setLastSyncedAt(new Date(res.updatedAt || res.lastUpdated || Date.now()));
        } else {
          setSyncStatus('error');
        }
      } catch {
        setSyncStatus('offline');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [teacher, classes, students, scores, disciplines, weights, isInitialSyncDone]);

  // Thao tác đồng bộ thủ công
  const handleForceSyncNow = async () => {
    setSyncStatus('syncing');
    const res = await pushServerData({
      teacher,
      classes,
      students,
      scores,
      disciplines,
      weights,
    });
    if (res && res.success) {
      setSyncStatus('synced');
      setLastSyncedAt(new Date(res.updatedAt || res.lastUpdated || Date.now()));
    } else {
      setSyncStatus('error');
      throw new Error('Lỗi đồng bộ lên máy chủ');
    }
  };

  const handlePullServerData = async () => {
    setSyncStatus('syncing');
    const res = await fetchServerData();
    if (res && res.data) {
      const sData = res.data;
      if (sData.teacher) setTeacher(sData.teacher);
      if (sData.classes && sData.classes.length > 0) setClasses(sData.classes);
      if (sData.students) setStudents(sData.students);
      if (sData.scores) setScores(sData.scores);
      if (sData.disciplines) setDisciplines(sData.disciplines);
      if (sData.weights) setWeights(sData.weights);

      setLastSyncedAt(res.updatedAt ? new Date(res.updatedAt) : new Date());
      setSyncStatus('synced');
    } else {
      setSyncStatus('offline');
      throw new Error('Không có dữ liệu trên máy chủ để tải về');
    }
  };

  // Lấy danh sách học sinh thuộc lớp hiện tại
  const currentClassStudents = students
    .filter((s) => s.classId === currentClassId)
    .sort((a, b) => a.stt - b.stt);

  // Lấy điểm số thuộc lớp và học kỳ hiện tại
  const currentClassScores = scores.filter(
    (sc) => sc.classId === currentClassId && sc.semester === semester
  );

  const currentClass = classes.find((c) => c.id === currentClassId) || classes[0];

  // Thêm lớp mới
  const handleAddClass = (newCls: Omit<ClassRoom, 'id'>) => {
    const id = `cls-${Date.now()}`;
    const created: ClassRoom = { ...newCls, id };
    setClasses((prev) => [...prev, created]);
    setCurrentClassId(id);
  };

  // Sửa thông tin lớp
  const handleUpdateClass = (id: string, updates: Partial<ClassRoom>) => {
    setClasses((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  // Xóa lớp học và dọn sạch dữ liệu liên quan
  const handleDeleteClass = (id: string) => {
    setClasses((prev) => prev.filter((c) => c.id !== id));
    setStudents((prev) => prev.filter((s) => s.classId !== id));
    setScores((prev) => prev.filter((s) => s.classId !== id));
    setDisciplines((prev) => prev.filter((d) => d.classId !== id));

    if (currentClassId === id) {
      const remaining = classes.filter((c) => c.id !== id);
      if (remaining.length > 0) {
        setCurrentClassId(remaining[0].id);
      }
    }
  };

  // Thêm nhiều lớp cùng lúc
  const handleBatchAddClasses = (newClasses: Omit<ClassRoom, 'id'>[]) => {
    const created = newClasses.map((cls, idx) => ({
      ...cls,
      id: `cls-${Date.now()}-${idx}`,
    }));
    setClasses((prev) => [...prev, ...created]);
    if (created.length > 0) {
      setCurrentClassId(created[0].id);
    }
  };

  // Quản lý dữ liệu giáo viên
  const handleSaveTeacher = (profile: TeacherProfile) => {
    setTeacher(profile);
  };

  const handleClearTeacher = () => {
    setTeacher({
      fullName: '',
      subject: 'Toán học',
      department: '',
      schoolName: '',
      phone: '',
      email: '',
      academicYear: '',
      notes: '',
    });
  };

  const handleResetTeacher = () => {
    setTeacher({ ...INITIAL_TEACHER });
  };

  // Cập nhật điểm cho 1 học sinh
  const handleUpdateScore = (studentId: string, updatedFields: Partial<StudentScore>) => {
    setScores((prev) => {
      const idx = prev.findIndex(
        (s) => s.studentId === studentId && s.classId === currentClassId && s.semester === semester
      );

      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...updatedFields };
        return updated;
      } else {
        const newScore: StudentScore = {
          studentId,
          classId: currentClassId,
          semester,
          regularScores: [],
          boardBonusCount: 0,
          boardBonusTotal: 0,
          midtermScore: null,
          finalScore: null,
          ...updatedFields,
        };
        return [...prev, newScore];
      }
    });
  };

  // Chấm điểm lên bảng
  const handleAddBoardScore = (
    studentId: string,
    bonusPoints: number,
    exerciseNote: string,
    recordAsRegularScore: boolean
  ) => {
    setScores((prev) => {
      const idx = prev.findIndex(
        (s) => s.studentId === studentId && s.classId === currentClassId && s.semester === semester
      );

      if (idx >= 0) {
        const current = prev[idx];
        const newBonusTotal = Math.round(((current.boardBonusTotal || 0) + bonusPoints) * 100) / 100;
        const newBonusCount = (current.boardBonusCount || 0) + 1;
        const newRegulars = [...(current.regularScores || [])];
        if (recordAsRegularScore) {
          newRegulars.push(10);
        }

        const updated = [...prev];
        updated[idx] = {
          ...current,
          boardBonusTotal: newBonusTotal,
          boardBonusCount: newBonusCount,
          regularScores: newRegulars,
          teacherNote: exerciseNote ? `[Lên bảng: ${exerciseNote}] ${current.teacherNote || ''}` : current.teacherNote,
        };
        return updated;
      } else {
        const newScore: StudentScore = {
          studentId,
          classId: currentClassId,
          semester,
          regularScores: recordAsRegularScore ? [10] : [],
          boardBonusCount: 1,
          boardBonusTotal: bonusPoints,
          midtermScore: null,
          finalScore: null,
          teacherNote: exerciseNote ? `[Lên bảng: ${exerciseNote}]` : undefined,
        };
        return [...prev, newScore];
      }
    });

    // Thêm bản ghi vào sổ nề nếp
    const today = new Date().toISOString().split('T')[0];
    const newDiscipline: DisciplineRecord = {
      id: `disc-${Date.now()}`,
      studentId,
      classId: currentClassId,
      date: today,
      period: 1,
      attendance: 'co_mat',
      hasHomework: true,
      hasCalculator: true,
      hasTextbook: true,
      behaviorTags: ['len_bang_tot'],
      notes: exerciseNote,
      boardScoreAwarded: bonusPoints,
    };
    setDisciplines((prev) => [newDiscipline, ...prev]);
  };

  // Cập nhật / sửa điểm cộng lên bảng trực tiếp
  const handleUpdateBoardBonus = (
    studentId: string,
    newTotal: number,
    newCount: number,
    note?: string
  ) => {
    const validTotal = Math.max(0, Math.round(Number(newTotal) * 100) / 100);
    const validCount = Math.max(0, Math.floor(Number(newCount)));

    setScores((prev) => {
      const idx = prev.findIndex(
        (s) => s.studentId === studentId && s.classId === currentClassId && s.semester === semester
      );

      if (idx >= 0) {
        const current = prev[idx];
        const updated = [...prev];
        updated[idx] = {
          ...current,
          boardBonusTotal: validTotal,
          boardBonusCount: validCount,
          teacherNote: note !== undefined ? note : current.teacherNote,
        };
        return updated;
      } else {
        const newScore: StudentScore = {
          studentId,
          classId: currentClassId,
          semester,
          regularScores: [],
          boardBonusCount: validCount,
          boardBonusTotal: validTotal,
          midtermScore: null,
          finalScore: null,
          teacherNote: note || '',
        };
        return [...prev, newScore];
      }
    });
  };

  // Xóa điểm cộng lên bảng của học sinh (đặt lại về 0 điểm)
  const handleDeleteBoardBonus = (studentId: string) => {
    handleUpdateBoardBonus(studentId, 0, 0);
  };

  // Lưu sổ nề nếp buổi học
  const handleSaveDisciplineSession = (newRecords: DisciplineRecord[]) => {
    setDisciplines((prev) => {
      // Loại bỏ các bản ghi cũ của cùng ngày + tiết + học sinh này
      const filtered = prev.filter(
        (p) =>
          !newRecords.some(
            (nr) =>
              nr.studentId === p.studentId &&
              nr.date === p.date &&
              nr.period === p.period &&
              nr.classId === p.classId
          )
      );
      return [...newRecords, ...filtered];
    });
  };

  // Thêm học sinh
  const handleAddStudent = (newSt: Omit<Student, 'id' | 'classId'>) => {
    const id = `st-${Date.now()}`;
    const student: Student = { ...newSt, id, classId: currentClassId };
    setStudents((prev) => [...prev, student]);

    // Tạo điểm trống
    const emptyScore: StudentScore = {
      studentId: id,
      classId: currentClassId,
      semester,
      regularScores: [],
      boardBonusCount: 0,
      boardBonusTotal: 0,
      midtermScore: null,
      finalScore: null,
    };
    setScores((prev) => [...prev, emptyScore]);
  };

  // Sửa học sinh
  const handleUpdateStudent = (id: string, updates: Partial<Student>) => {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  // Xóa 1 học sinh
  const handleDeleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    setScores((prev) => prev.filter((s) => s.studentId !== id));
    setDisciplines((prev) => prev.filter((d) => d.studentId !== id));
  };

  // Xóa nhiều học sinh đã chọn
  const handleBatchDeleteStudents = (studentIds: string[]) => {
    const idSet = new Set(studentIds);
    setStudents((prev) => prev.filter((s) => !idSet.has(s.id)));
    setScores((prev) => prev.filter((s) => !idSet.has(s.studentId)));
    setDisciplines((prev) => prev.filter((d) => !idSet.has(d.studentId)));
  };

  // Xóa toàn bộ học sinh trong 1 lớp cụ thể
  const handleClearClassStudents = (classId: string) => {
    setStudents((prev) => prev.filter((s) => s.classId !== classId));
    setScores((prev) => prev.filter((s) => s.classId !== classId));
    setDisciplines((prev) => prev.filter((d) => d.classId !== classId));
  };

  // Xóa toàn bộ học sinh tất cả các lớp
  const handleClearAllStudents = () => {
    setStudents([]);
    setScores([]);
    setDisciplines([]);
  };

  // Xóa sạch toàn bộ dữ liệu hệ thống
  const handleClearAllData = () => {
    setClasses([]);
    setStudents([]);
    setScores([]);
    setDisciplines([]);
    handleClearTeacher();
  };

  // Nhập hàng loạt học sinh
  const handleBatchImportStudents = (
    newSts: Omit<Student, 'id' | 'classId'>[],
    mode: 'append' | 'replace' = 'append'
  ) => {
    const createdList: Student[] = [];
    const createdScores: StudentScore[] = [];

    newSts.forEach((st, idx) => {
      const id = `st-${Date.now()}-${idx}`;
      createdList.push({ ...st, id, classId: currentClassId });
      createdScores.push({
        studentId: id,
        classId: currentClassId,
        semester,
        regularScores: [],
        boardBonusCount: 0,
        boardBonusTotal: 0,
        midtermScore: null,
        finalScore: null,
      });
    });

    if (mode === 'replace') {
      setStudents((prev) => [...prev.filter((s) => s.classId !== currentClassId), ...createdList]);
      setScores((prev) => [...prev.filter((s) => s.classId !== currentClassId), ...createdScores]);
    } else {
      setStudents((prev) => [...prev, ...createdList]);
      setScores((prev) => [...prev, ...createdScores]);
    }
  };

  // Cập nhật nhận xét hàng loạt từ AI
  const handleBatchUpdateScores = (updates: { studentId: string; comment: string }[]) => {
    setScores((prev) => {
      const updated = [...prev];
      updates.forEach(({ studentId, comment }) => {
        const idx = updated.findIndex(
          (s) => s.studentId === studentId && s.classId === currentClassId && s.semester === semester
        );
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], teacherNote: comment };
        } else {
          updated.push({
            studentId,
            classId: currentClassId,
            semester,
            regularScores: [],
            boardBonusCount: 0,
            boardBonusTotal: 0,
            midtermScore: null,
            finalScore: null,
            teacherNote: comment,
          });
        }
      });
      return updated;
    });
  };

  // Xuất Excel nhanh
  const handleQuickExportExcel = () => {
    exportGradeBookToExcel(currentClass, currentClassStudents, currentClassScores, weights);
  };

  // Xuất JSON sao lưu toàn bộ
  const handleExportAllData = () => {
    const data = {
      version: 2,
      exportDate: new Date().toISOString(),
      teacher,
      classes,
      students,
      scores,
      disciplines,
      weights,
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MathGrade_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Khôi phục JSON
  const handleImportAllData = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.classes && parsed.students && parsed.scores) {
        if (parsed.teacher) setTeacher(parsed.teacher);
        setClasses(parsed.classes);
        setStudents(parsed.students);
        setScores(parsed.scores);
        if (parsed.disciplines) setDisciplines(parsed.disciplines);
        if (parsed.weights) setWeights(parsed.weights);
        if (parsed.classes[0]?.id) setCurrentClassId(parsed.classes[0].id);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Khôi phục dữ liệu mẫu
  const handleResetToDemo = () => {
    setTeacher(INITIAL_TEACHER);
    setClasses(INITIAL_CLASSES);
    setCurrentClassId(INITIAL_CLASSES[0].id);
    setStudents(INITIAL_STUDENTS);
    setScores(INITIAL_SCORES);
    setDisciplines(INITIAL_DISCIPLINE);
    setWeights(DEFAULT_WEIGHTS);
  };

  // Khôi phục dữ liệu gốc Thầy Hoàng Duy Nhân (Lớp 10A5, 10A6, 10A7)
  const handleRestoreMasterData = async () => {
    try {
      const res = await restoreDefaultServerData();
      if (res.success && res.data) {
        if (res.data.teacher) setTeacher(res.data.teacher);
        if (res.data.classes && res.data.classes.length > 0) {
          setClasses(res.data.classes);
          setCurrentClassId(res.data.classes[0].id);
        }
        if (res.data.students) setStudents(res.data.students);
        if (res.data.scores) setScores(res.data.scores);
        if (res.data.disciplines) setDisciplines(res.data.disciplines);
        if (res.data.weights) setWeights(res.data.weights);
        setLastSyncedAt(new Date());
        setSyncStatus('synced');
        return true;
      }
    } catch (err) {
      console.warn('Không thể gọi API khôi phục mặc định:', err);
    }
    // Fallback nếu không có mạng
    handleResetToDemo();
    return true;
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Navigation Bar */}
      <div className="no-print">
        <Navbar
          classes={classes}
          currentClassId={currentClassId}
          teacher={teacher}
          onSelectClass={setCurrentClassId}
          onAddClass={handleAddClass}
          semester={semester}
          onChangeSemester={setSemester}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onOpenSettings={() => setShowSettings(true)}
          onOpenTeacherProfile={() => setShowTeacherModal(true)}
          onOpenClassManager={() => setShowClassModal(true)}
          onQuickExportExcel={() => setShowExportModal(true)}
          syncStatus={syncStatus}
          onOpenSyncModal={() => setShowSyncModal(true)}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'gradebook' && (
          <GradeBookView
            classroom={currentClass}
            students={currentClassStudents}
            scores={currentClassScores}
            weights={weights}
            disciplines={disciplines}
            onUpdateScore={handleUpdateScore}
            onBatchUpdateScores={handleBatchUpdateScores}
            onOpenQuickBonus={(st) => setQuickBonusStudent(st)}
            onOpenExportModal={() => setShowExportModal(true)}
          />
        )}

        {activeTab === 'bonus' && (
          <BoardBonusTracker
            classroom={currentClass}
            students={currentClassStudents}
            scores={currentClassScores}
            disciplines={disciplines}
            onAddBoardScore={handleAddBoardScore}
            onUpdateBoardScore={handleUpdateBoardBonus}
            onDeleteBoardScore={handleDeleteBoardBonus}
          />
        )}

        {activeTab === 'discipline' && (
          <DisciplineTracker
            classroom={currentClass}
            students={currentClassStudents}
            disciplines={disciplines}
            onSaveDisciplineSession={handleSaveDisciplineSession}
          />
        )}

        {activeTab === 'students' && (
          <StudentManager
            classroom={currentClass}
            students={currentClassStudents}
            onAddStudent={handleAddStudent}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onBatchImportStudents={handleBatchImportStudents}
            onBatchDeleteStudents={handleBatchDeleteStudents}
            onClearClassStudents={() => handleClearClassStudents(currentClassId)}
          />
        )}

        {activeTab === 'reports' && (
          <PeriodicReports
            classroom={currentClass}
            students={currentClassStudents}
            scores={currentClassScores}
            disciplines={disciplines}
            weights={weights}
            teacher={teacher}
            onOpenExportModal={() => setShowExportModal(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="no-print border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <p>
          Hệ Thống Quản Lý Học Sinh & Sổ Điểm Bộ Môn Toán • Chuẩn quy chế đánh giá Thông tư 22/2021 Bộ GD&ĐT
        </p>
      </footer>

      {/* Modal Quản Lý Hồ Sơ Giáo Viên */}
      {showTeacherModal && (
        <TeacherProfileModal
          teacher={teacher}
          onSave={handleSaveTeacher}
          onSaveTeacher={handleSaveTeacher}
          onClear={handleClearTeacher}
          onClearTeacher={handleClearTeacher}
          onReset={handleResetTeacher}
          onResetTeacher={handleResetTeacher}
          onClose={() => setShowTeacherModal(false)}
        />
      )}

      {/* Modal Quản Lý Danh Sách Lớp Học */}
      {showClassModal && (
        <ClassManagerModal
          classes={classes}
          currentClassId={currentClassId}
          students={students}
          scores={scores}
          disciplines={disciplines}
          onSelectClass={(id) => {
            setCurrentClassId(id);
            setShowClassModal(false);
          }}
          onAddClass={handleAddClass}
          onBatchAddClasses={handleBatchAddClasses}
          onUpdateClass={handleUpdateClass}
          onDeleteClass={handleDeleteClass}
          onClose={() => setShowClassModal(false)}
        />
      )}

      {/* Modal Cài Đặt & Trung Tâm Dữ Liệu */}
      {showSettings && (
        <SettingsModal
          weights={weights}
          teacher={teacher}
          classes={classes}
          students={students}
          scores={scores}
          disciplines={disciplines}
          currentClassId={currentClassId}
          onSaveWeights={setWeights}
          onSaveTeacher={handleSaveTeacher}
          onClearTeacher={handleClearTeacher}
          onResetTeacher={handleResetTeacher}
          onAddClass={handleAddClass}
          onUpdateClass={handleUpdateClass}
          onDeleteClass={handleDeleteClass}
          onClearClassStudents={handleClearClassStudents}
          onClearAllStudents={handleClearAllStudents}
          onClearAllData={handleClearAllData}
          onExportAllData={handleExportAllData}
          onImportAllData={handleImportAllData}
          onResetToDemo={handleResetToDemo}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Modal Cộng Điểm Lên Bảng Nhanh */}
      {quickBonusStudent && (
        <QuickBonusModal
          student={quickBonusStudent}
          currentScore={currentClassScores.find((s) => s.studentId === quickBonusStudent.id)}
          onAwardBonus={(points, note, addAsRegular) => {
            handleAddBoardScore(quickBonusStudent.id, points, note, addAsRegular);
          }}
          onUpdateBonus={(newTotal, newCount, note) => {
            handleUpdateBoardBonus(quickBonusStudent.id, newTotal, newCount, note);
          }}
          onDeleteBonus={() => {
            handleDeleteBoardBonus(quickBonusStudent.id);
          }}
          onClose={() => setQuickBonusStudent(null)}
        />
      )}

      {/* Modal Đồng Bộ Đa Thiết Bị (Cloud Sync) */}
      <SyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        syncStatus={syncStatus}
        lastSyncedAt={lastSyncedAt}
        onForceSync={handleForceSyncNow}
        onPullServerData={handlePullServerData}
        totalClasses={classes.length}
        totalStudents={students.length}
        totalScores={scores.length}
        totalDisciplines={disciplines.length}
        onRestoreMasterDefault={handleRestoreMasterData}
      />

      {/* Modal Tùy Chọn Nội Dung Xuất Excel */}
      {showExportModal && (
        <ExportExcelModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          classroom={currentClass}
          students={currentClassStudents}
          scores={currentClassScores}
          weights={weights}
          teacher={teacher}
          disciplines={disciplines}
        />
      )}
    </div>
  );
}
