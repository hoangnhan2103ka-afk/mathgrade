import { Student, StudentScore, ClassRoom, DisciplineRecord } from '../types';

export interface ParsedStudentItem {
  stt: number;
  studentCode: string;
  fullName: string;
  gender: 'Nam' | 'Nữ';
  dateOfBirth: string;
  parentPhone?: string;
  notes?: string;
}

export interface ParseRosterResponse {
  classNameDetected?: string;
  students: ParsedStudentItem[];
  fallbackUsed?: boolean;
  notice?: string;
  error?: string;
}

export interface StudentCommentResponse {
  comment: string;
  tags: string[];
  isFallback?: boolean;
  notice?: string;
  error?: string;
}

export interface BatchCommentItem {
  studentId: string;
  comment: string;
}

export interface BatchCommentsResponse {
  results: BatchCommentItem[];
  isFallback?: boolean;
  notice?: string;
  error?: string;
}

/**
 * Gọi API backend phân tích danh sách lớp học từ ảnh hoặc nội dung file bằng Gemini
 */
export async function parseRosterWithAI(params: {
  imageBase64?: string;
  mimeType?: string;
  fileContent?: string;
  grade?: string;
}): Promise<ParseRosterResponse> {
  const response = await fetch('/api/ai/parse-roster', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Yêu cầu thất bại với mã trạng thái ${response.status}`);
  }

  return response.json();
}

/**
 * Gọi API backend tạo lời nhận xét học sinh bằng Gemini
 */
export async function generateStudentCommentWithAI(params: {
  student: Student;
  score?: StudentScore;
  disciplineSummary?: {
    absentOrLateCount: number;
    forgotHomeworkCount: number;
    forgotCalculatorCount: number;
    positiveNotes: string;
    negativeNotes: string;
  };
  classroom: ClassRoom;
  commentStyle?: 'hoc_ba' | 'so_lien_lac' | 'khuyen_khich' | 'chi_tiet';
}): Promise<StudentCommentResponse> {
  const response = await fetch('/api/ai/student-comment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Không thể tạo nhận xét (mã lỗi ${response.status})`);
  }

  return response.json();
}

/**
 * Gọi API backend tạo nhận xét hàng loạt cho cả lớp bằng Gemini
 */
export async function generateBatchCommentsWithAI(params: {
  studentsWithData: Array<{
    student: Student;
    score?: StudentScore;
    calculatedAvg: number | null;
    disciplineSummary?: {
      absentOrLateCount: number;
      forgotHomeworkCount: number;
      forgotCalculatorCount: number;
    };
  }>;
  classroom: ClassRoom;
  commentStyle?: 'hoc_ba' | 'so_lien_lac' | 'khuyen_khich' | 'chi_tiet';
}): Promise<BatchCommentsResponse> {
  const response = await fetch('/api/ai/batch-student-comments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Không thể tạo nhận xét hàng loạt (mã lỗi ${response.status})`);
  }

  return response.json();
}

/**
 * Hàm helper tóm tắt nề nếp của một học sinh từ danh sách nề nếp
 */
export function summarizeStudentDiscipline(studentId: string, disciplines: DisciplineRecord[]) {
  const records = disciplines.filter((d) => d.studentId === studentId);
  const absentOrLate = records.filter(
    (d) => d.attendance === 'vang_p' || d.attendance === 'vang_kp' || d.attendance === 'di_tre'
  ).length;
  const forgotHW = records.filter((d) => !d.hasHomework).length;
  const forgotCalc = records.filter((d) => !d.hasCalculator).length;
  const notTakingNotesCount = records.filter(
    (d) => d.hasNotes === false || d.behaviorTags?.includes('khong_ghi_bai') || d.behaviorTags?.includes('vo_trang_khong_chua')
  ).length;

  const tags = records.flatMap((d) => d.behaviorTags || []);
  const positiveList: string[] = [];
  if (tags.includes('len_bang_tot')) positiveList.push('Hăng hái lên bảng giải toán đúng phương pháp');
  if (tags.includes('phat_bieu_dung')) positiveList.push('Tích cực phát biểu xây dựng bài');
  if (tags.includes('cach_giai_sang_tao')) positiveList.push('Có tư duy và cách giải sáng tạo');
  if (tags.includes('ghi_bai_sach_dep')) positiveList.push('Vở ghi bài sạch đẹp, cẩn thận');
  if (tags.includes('tu_giac_chua_bai')) positiveList.push('Tự giác chữa bài tập vào vở');
  if (tags.includes('giup_do_ban')) positiveList.push('Biết tương tác và giúp đỡ bạn bè');

  const positive = positiveList.length > 0 ? positiveList.join('; ') : 'Chấp hành tốt nội quy giờ học';

  const negativeList: string[] = [];
  if (notTakingNotesCount > 0) negativeList.push(`Có ${notTakingNotesCount} lần không ghi bài / lười chép bài vào vở`);
  if (forgotHW > 0) negativeList.push(`Có ${forgotHW} lần chưa hoàn thành BTVN`);
  if (forgotCalc > 0) negativeList.push(`Có ${forgotCalc} lần quên máy tính Casio`);
  if (tags.includes('mat_trat_tu')) negativeList.push('Đôi khi còn nói chuyện riêng trong giờ');
  if (tags.includes('lam_viec_rieng')) negativeList.push('Có biểu hiện làm việc riêng trong tiết học');
  if (tags.includes('dung_dien_thoai')) negativeList.push('Từng sử dụng điện thoại riêng trái phép');

  const negative = negativeList.length > 0 ? negativeList.join('; ') : 'Không có vi phạm';

  return {
    absentOrLateCount: absentOrLate,
    forgotHomeworkCount: forgotHW,
    forgotCalculatorCount: forgotCalc,
    notTakingNotesCount,
    positiveNotes: positive,
    negativeNotes: negative,
  };
}
