export type Gender = 'Nam' | 'Nữ';

export interface TeacherProfile {
  fullName: string;
  subject: string; // Môn giảng dạy, vd: 'Toán học'
  department?: string; // Tổ chuyên môn, vd: 'Tổ Toán - Tin'
  schoolName?: string; // Trường THPT/THCS
  phone?: string;
  email?: string;
  academicYear?: string;
  notes?: string;
}

export interface Student {
  id: string;
  classId: string;
  stt: number;
  studentCode: string;
  fullName: string;
  gender: Gender;
  dateOfBirth: string;
  phone?: string;
  parentPhone?: string;
  notes?: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  grade: '10' | '11' | '12' | '9' | '8' | '7' | '6';
  schoolYear: string;
  semester: 'HK1' | 'HK2';
  roomNumber?: string;
}

export interface GradeWeights {
  regularWeight: number; // Thường xuyên (hệ số 1)
  midtermWeight: number; // Giữa kỳ (hệ số 2)
  finalWeight: number;   // Cuối kỳ (hệ số 3)
  bonusConversion: 'direct_average' | 'add_to_regular' | 'separate_stat'; // Cách tính điểm cộng
  bonusScale: number; // Ví dụ 1 điểm cộng = +0.25 vào ĐTB hoặc 1 điểm thường xuyên
  maxBonusAllowed: number; // Tối đa điểm cộng quy đổi
}

export interface StudentScore {
  studentId: string;
  classId: string;
  semester: 'HK1' | 'HK2';
  // Điểm đánh giá thường xuyên (miệng, hỏi đáp, bài tập)
  regularScores: number[]; 
  // Điểm kiểm tra 15 phút (ĐĐG 15 phút - HS1)
  fifteenMinScores?: number[];
  // Điểm cộng lên bảng (tích lũy)
  boardBonusCount: number; // Số lần lên bảng
  boardBonusTotal: number; // Tổng số điểm cộng tích lũy (ví dụ 1.5, 2.0)
  // Điểm kiểm tra định kỳ
  midtermScore: number | null; // Điểm giữa kỳ (GK)
  finalScore: number | null;   // Điểm thi cuối kỳ (CK)
  teacherNote?: string;
}

export type AttendanceStatus = 'co_mat' | 'di_tre' | 'vang_p' | 'vang_kp';

export interface BehaviorTag {
  id: string;
  label: string;
  type: 'positive' | 'negative';
  category?: 'notes' | 'study' | 'attitude' | 'discipline';
  iconName?: string;
  bonusPoints?: number; // Điểm cộng thưởng lên bảng nếu có
  isCustom?: boolean; // Tag do giáo viên tự định nghĩa thêm
}

export interface DisciplineRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string; // YYYY-MM-DD
  period: number; // Tiết 1-5
  attendance: AttendanceStatus;
  hasHomework: boolean; // Có làm BTVN toán không
  hasCalculator: boolean; // Có mang máy tính Casio không
  hasTextbook: boolean; // Có mang SGK/vở bài tập không
  hasNotes?: boolean; // Có ghi chép bài đầy đủ trong giờ không
  behaviorTags: string[]; // List tag IDs (lên bảng tốt, mất trật tự, không ghi bài...)
  notes?: string;
  boardScoreAwarded?: number; // Điểm cộng nếu được gọi lên bảng trong buổi này
}

export type AcademicRating = 'XuatSac' | 'Gioi' | 'Kha' | 'Dat' | 'ChuaDat';

export interface CalculatedStudentGrade {
  student: Student;
  score: StudentScore;
  regularAvg: number | null;
  boardBonusApplied: number;
  finalAvg: number | null;
  rating: AcademicRating;
  ratingLabel: string;
  isPassing: boolean;
}

export interface ExcelExportOptions {
  // Phạm vi học sinh cần xuất
  studentScope: 'all' | 'has_scores' | 'struggling' | 'good_and_excellent';

  // Thông tin định danh học sinh
  includeStt: boolean;
  includeStudentCode: boolean;
  includeFullName: boolean;
  includeGender: boolean;
  includeDateOfBirth: boolean;

  // Cột điểm kiểm tra môn Toán
  includeRegularScores: boolean;        // Điểm đánh giá thường xuyên (miệng, bài tập)
  includeFifteenMinScores: boolean;     // Điểm kiểm tra 15 phút
  includeBoardBonus: boolean;           // Điểm cộng & Số lần lên bảng
  includeMidtermScore: boolean;         // Điểm kiểm tra Giữa kỳ (ĐGK - HS2)
  includeFinalScore: boolean;           // Điểm kiểm tra Cuối kỳ (ĐCK - HS3)

  // Tổng kết & Đánh giá
  includeFinalAvg: boolean;             // Điểm trung bình môn Toán (ĐTBm)
  includeRating: boolean;               // Xếp loại học lực (Xuất sắc, Giỏi, Khá, Đạt, Chưa đạt)
  includeTeacherNote: boolean;          // Ghi chú / Lời phê của giáo viên

  // Nề nếp & Chuyên cần (tùy chọn gộp)
  includeAttendanceSummary: boolean;    // Số buổi vắng / đi trễ
  includeStudyHabitSummary: boolean;    // Quên BTVN / Quên máy tính

  // Tiêu đề & Thông tin bổ sung
  customTitle?: string;                 // Tiêu đề bảng điểm
  includeTeacherInfo: boolean;          // Kèm thông tin Giáo viên bộ môn ở đầu bảng
  includeClassStatsSummary: boolean;    // Kèm bảng tóm tắt tỷ lệ Đạt, ĐTB lớp ở cuối bảng
  customFileName?: string;              // Tên tệp Excel
}

