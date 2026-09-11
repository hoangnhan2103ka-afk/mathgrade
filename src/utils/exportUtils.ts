import * as XLSX from 'xlsx';
import { 
  Student, 
  StudentScore, 
  ClassRoom, 
  GradeWeights, 
  DisciplineRecord,
  TeacherProfile,
  ExcelExportOptions
} from '../types';
import { calculateSingleGrade, computeClassStats } from './gradeCalculations';

export const DEFAULT_EXCEL_EXPORT_OPTIONS: ExcelExportOptions = {
  studentScope: 'all',
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
};

export function exportGradeBookToExcel(
  classroom: ClassRoom,
  students: Student[],
  scores: StudentScore[],
  weights: GradeWeights,
  options?: Partial<ExcelExportOptions>,
  teacher?: TeacherProfile,
  disciplines?: DisciplineRecord[]
) {
  const opts: ExcelExportOptions = {
    ...DEFAULT_EXCEL_EXPORT_OPTIONS,
    ...options,
  };

  // Tính toán điểm số cho tất cả học sinh trước khi lọc phạm vi
  const studentCalculations = students.map((st) => {
    const sc = scores.find((s) => s.studentId === st.id) || {
      studentId: st.id,
      classId: st.classId,
      semester: classroom.semester,
      regularScores: [],
      fifteenMinScores: [],
      boardBonusCount: 0,
      boardBonusTotal: 0,
      midtermScore: null,
      finalScore: null,
    };
    const calc = calculateSingleGrade(st, sc, weights);
    return { student: st, score: sc, calc };
  });

  // Lọc danh sách học sinh theo phạm vi được chọn
  const filteredStudents = studentCalculations.filter(({ score, calc }) => {
    if (opts.studentScope === 'all') return true;
    if (opts.studentScope === 'has_scores') {
      const hasReg = (score.regularScores && score.regularScores.length > 0);
      const has15p = (score.fifteenMinScores && score.fifteenMinScores.length > 0);
      const hasMid = score.midtermScore !== null;
      const hasFin = score.finalScore !== null;
      const hasBonus = (score.boardBonusCount || 0) > 0;
      return hasReg || has15p || hasMid || hasFin || hasBonus;
    }
    if (opts.studentScope === 'struggling') {
      return !calc.isPassing || (calc.finalAvg !== null && calc.finalAvg < 5.0) || calc.rating === 'ChuaDat';
    }
    if (opts.studentScope === 'good_and_excellent') {
      return calc.rating === 'XuatSac' || calc.rating === 'Gioi';
    }
    return true;
  });

  // Xác định số cột ĐTX và 15p tối đa
  const maxRegularScores = Math.max(
    3,
    ...filteredStudents.map(({ score }) => score.regularScores?.length || 0)
  );

  const maxFifteenMinScores = Math.max(
    1,
    ...filteredStudents.map(({ score }) => score.fifteenMinScores?.length || 0)
  );

  // Xây dựng danh sách tiêu đề cột (Headers) và độ rộng cột (Column Widths)
  const headers: string[] = [];
  const colWidths: { wch: number }[] = [];

  if (opts.includeStt) {
    headers.push('STT');
    colWidths.push({ wch: 6 });
  }

  if (opts.includeStudentCode) {
    headers.push('Mã Học Sinh');
    colWidths.push({ wch: 13 });
  }

  if (opts.includeFullName) {
    headers.push('Họ và Tên');
    colWidths.push({ wch: 24 });
  }

  if (opts.includeGender) {
    headers.push('Giới Tính');
    colWidths.push({ wch: 10 });
  }

  if (opts.includeDateOfBirth) {
    headers.push('Ngày Sinh');
    colWidths.push({ wch: 14 });
  }

  if (opts.includeRegularScores) {
    for (let i = 1; i <= maxRegularScores; i++) {
      headers.push(`ĐTX ${i} (HS${weights.regularWeight})`);
      colWidths.push({ wch: 12 });
    }
  }

  if (opts.includeFifteenMinScores) {
    for (let i = 1; i <= maxFifteenMinScores; i++) {
      headers.push(
        maxFifteenMinScores > 1
          ? `15 phút (${i}) (HS${weights.regularWeight})`
          : `Điểm 15 phút (HS${weights.regularWeight})`
      );
      colWidths.push({ wch: 15 });
    }
  }

  if (opts.includeBoardBonus) {
    headers.push('Số lần lên bảng');
    colWidths.push({ wch: 16 });
    headers.push('Tổng điểm cộng');
    colWidths.push({ wch: 14 });
  }

  if (opts.includeMidtermScore) {
    headers.push(`Giữa kỳ (HS${weights.midtermWeight})`);
    colWidths.push({ wch: 14 });
  }

  if (opts.includeFinalScore) {
    headers.push(`Cuối kỳ (HS${weights.finalWeight})`);
    colWidths.push({ wch: 14 });
  }

  if (opts.includeFinalAvg) {
    headers.push('ĐTB Môn Toán');
    colWidths.push({ wch: 14 });
  }

  if (opts.includeRating) {
    headers.push('Xếp loại học lực');
    colWidths.push({ wch: 16 });
  }

  if (opts.includeAttendanceSummary) {
    headers.push('Chuyên cần (Vắng/Trễ)');
    colWidths.push({ wch: 20 });
  }

  if (opts.includeStudyHabitSummary) {
    headers.push('Nề nếp (Quên BTVN/Máy tính)');
    colWidths.push({ wch: 24 });
  }

  if (opts.includeTeacherNote) {
    headers.push('Ghi chú của GV');
    colWidths.push({ wch: 28 });
  }

  // Tạo các hàng dữ liệu (Rows)
  const rows = filteredStudents.map(({ student: st, score: sc, calc }) => {
    const rowData: (string | number)[] = [];

    if (opts.includeStt) {
      rowData.push(st.stt);
    }

    if (opts.includeStudentCode) {
      rowData.push(st.studentCode);
    }

    if (opts.includeFullName) {
      rowData.push(st.fullName);
    }

    if (opts.includeGender) {
      rowData.push(st.gender);
    }

    if (opts.includeDateOfBirth) {
      rowData.push(st.dateOfBirth);
    }

    if (opts.includeRegularScores) {
      for (let i = 0; i < maxRegularScores; i++) {
        const val = sc.regularScores ? sc.regularScores[i] : undefined;
        rowData.push(val !== undefined ? val : '');
      }
    }

    if (opts.includeFifteenMinScores) {
      for (let i = 0; i < maxFifteenMinScores; i++) {
        const val = sc.fifteenMinScores ? sc.fifteenMinScores[i] : undefined;
        rowData.push(val !== undefined ? val : '');
      }
    }

    if (opts.includeBoardBonus) {
      rowData.push(sc.boardBonusCount || 0);
      rowData.push(sc.boardBonusTotal || 0);
    }

    if (opts.includeMidtermScore) {
      rowData.push(sc.midtermScore !== null ? sc.midtermScore : '');
    }

    if (opts.includeFinalScore) {
      rowData.push(sc.finalScore !== null ? sc.finalScore : '');
    }

    if (opts.includeFinalAvg) {
      rowData.push(calc.finalAvg !== null ? calc.finalAvg : '');
    }

    if (opts.includeRating) {
      rowData.push(calc.ratingLabel);
    }

    if (opts.includeAttendanceSummary) {
      const stDisc = (disciplines || []).filter((d) => d.studentId === st.id);
      const absentCount = stDisc.filter((d) => d.attendance === 'vang_p' || d.attendance === 'vang_kp').length;
      const lateCount = stDisc.filter((d) => d.attendance === 'di_tre').length;
      const attText = absentCount > 0 || lateCount > 0 ? `Vắng ${absentCount}b, trễ ${lateCount}l` : 'Đủ';
      rowData.push(attText);
    }

    if (opts.includeStudyHabitSummary) {
      const stDisc = (disciplines || []).filter((d) => d.studentId === st.id);
      const forgotHW = stDisc.filter((d) => !d.hasHomework).length;
      const forgotCalc = stDisc.filter((d) => !d.hasCalculator).length;
      const habitText = forgotHW > 0 || forgotCalc > 0 ? `BTVN: ${forgotHW}l, MT: ${forgotCalc}l` : 'Tốt';
      rowData.push(habitText);
    }

    if (opts.includeTeacherNote) {
      rowData.push(sc.teacherNote || st.notes || '');
    }

    return rowData;
  });

  // Chuẩn bị các dòng tiêu đề của bảng tính
  const titleText = opts.customTitle && opts.customTitle.trim()
    ? opts.customTitle.trim()
    : `BẢNG ĐIỂM TỔNG HỢP MÔN TOÁN - ${classroom.name.toUpperCase()}`;

  const subtitleText = `Năm học: ${classroom.schoolYear} | ${
    classroom.semester === 'HK1' ? 'Học kỳ I' : 'Học kỳ II'
  } | Hệ số: TX(${weights.regularWeight}) - 15p(${weights.regularWeight}) - GK(${weights.midtermWeight}) - CK(${weights.finalWeight})`;

  const worksheetData: (string | number)[][] = [
    [titleText],
    [subtitleText],
  ];

  if (opts.includeTeacherInfo && teacher && (teacher.fullName || teacher.schoolName)) {
    worksheetData.push([
      `Giáo viên bộ môn: ${teacher.fullName || '---'} | Đơn vị/Trường: ${teacher.schoolName || '---'} | Tổ bộ môn: ${teacher.department || 'Toán - Tin'}`
    ]);
  }

  worksheetData.push([]);
  worksheetData.push(headers);
  worksheetData.push(...rows);

  // Thêm phần thống kê tóm tắt ở cuối bảng nếu được chọn
  if (opts.includeClassStatsSummary) {
    const stats = computeClassStats(students, scores, weights);
    worksheetData.push([]);
    worksheetData.push(['--- THỐNG KÊ TỔNG QUÁT KẾT QUẢ MÔN TOÁN ---']);
    worksheetData.push(['Số học sinh trong danh sách xuất:', rows.length, 'Tổng số học sinh cả lớp:', students.length]);
    worksheetData.push(['Điểm trung bình toàn lớp:', stats.classAverage !== null ? stats.classAverage.toFixed(2) : '--']);
    worksheetData.push(['Tỷ lệ Đạt chuẩn (≥ 5.0):', `${stats.passRate}%`]);
    worksheetData.push([
      'Phân loại học lực:',
      `Xuất sắc: ${stats.ratingCounts.XuatSac} (${stats.ratingPercentages.XuatSac}%) | Giỏi: ${stats.ratingCounts.Gioi} (${stats.ratingPercentages.Gioi}%) | Khá: ${stats.ratingCounts.Kha} (${stats.ratingPercentages.Kha}%) | Đạt: ${stats.ratingCounts.Dat} (${stats.ratingPercentages.Dat}%) | Chưa đạt: ${stats.ratingCounts.ChuaDat} (${stats.ratingPercentages.ChuaDat}%)`
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'BangDiemToan');

  // Đặt độ rộng cột
  ws['!cols'] = colWidths;

  const defaultFileName = `SoDiem_MonToan_${classroom.name.replace(/\s+/g, '_')}_${classroom.semester}.xlsx`;
  let fileName = defaultFileName;
  if (opts.customFileName && opts.customFileName.trim()) {
    const raw = opts.customFileName.trim();
    fileName = raw.endsWith('.xlsx') ? raw : `${raw}.xlsx`;
  }

  XLSX.writeFile(wb, fileName);
}


export function exportMonthlyReportToExcel(
  classroom: ClassRoom,
  students: Student[],
  scores: StudentScore[],
  disciplines: DisciplineRecord[],
  month: number,
  year: number,
  weights: GradeWeights
) {
  // Lọc nề nếp trong tháng
  const monthDisciplines = disciplines.filter((d) => {
    const dDate = new Date(d.date);
    return dDate.getMonth() + 1 === month && dDate.getFullYear() === year;
  });

  const headers = [
    'STT',
    'Mã HS',
    'Họ và Tên',
    'Điểm danh (Vắng)',
    'Đi trễ (lần)',
    'Quên BTVN (lần)',
    'Quên máy tính (lần)',
    'Lên bảng / Điểm cộng tháng',
    'ĐTB Toán hiện tại',
    'Đánh giá tháng',
  ];

  const rows = students.map((st) => {
    const stDisc = monthDisciplines.filter((d) => d.studentId === st.id);
    const absentCount = stDisc.filter((d) => d.attendance === 'vang_p' || d.attendance === 'vang_kp').length;
    const lateCount = stDisc.filter((d) => d.attendance === 'di_tre').length;
    const forgotHomeworkCount = stDisc.filter((d) => !d.hasHomework).length;
    const forgotCalcCount = stDisc.filter((d) => !d.hasCalculator).length;
    
    // Điểm cộng trong tháng
    const monthlyBonus = stDisc.reduce((sum, d) => sum + (d.boardScoreAwarded || 0), 0);

    const sc = scores.find((s) => s.studentId === st.id) || {
      studentId: st.id,
      classId: st.classId,
      semester: classroom.semester,
      regularScores: [],
      boardBonusCount: 0,
      boardBonusTotal: 0,
      midtermScore: null,
      finalScore: null,
    };
    const calc = calculateSingleGrade(st, sc, weights);

    let conductNote = 'Chăm ngoan, nề nếp tốt';
    if (forgotHomeworkCount >= 2) conductNote = 'Cần đôn đốc làm BTVN';
    else if (forgotCalcCount >= 2) conductNote = 'Thường xuyên thiếu máy tính';
    else if (absentCount >= 2) conductNote = 'Vắng nhiều buổi, cần lưu ý';
    else if (monthlyBonus >= 1.5) conductNote = 'Tích cực xung phong lên bảng';

    return [
      st.stt,
      st.studentCode,
      st.fullName,
      absentCount > 0 ? `${absentCount} buổi` : '0',
      lateCount > 0 ? `${lateCount} lần` : '0',
      forgotHomeworkCount > 0 ? `${forgotHomeworkCount} lần` : '0',
      forgotCalcCount > 0 ? `${forgotCalcCount} lần` : '0',
      `+${monthlyBonus}`,
      calc.finalAvg !== null ? calc.finalAvg : 'Chưa có',
      conductNote,
    ];
  });

  const worksheetData = [
    [`BÁO CÁO ĐỊNH KỲ THÁNG ${month}/${year} - MÔN TOÁN - ${classroom.name.toUpperCase()}`],
    [`Theo dõi nề nếp, chuẩn bị dụng cụ học tập & học lực bộ môn`],
    [],
    headers,
    ...rows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `BaoCao_T${month}`);

  const fileName = `BaoCao_Thang${month}_${year}_${classroom.name.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
