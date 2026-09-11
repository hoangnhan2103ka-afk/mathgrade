import { Student, StudentScore, GradeWeights, CalculatedStudentGrade, AcademicRating } from '../types';

/**
 * Làm tròn điểm số đến 0,05 (bội số của 0,05 với tối đa 2 chữ số thập phân)
 * Quy tắc chuẩn trong kiểm tra, đánh giá giáo dục phổ thông:
 * Ví dụ: 8.23 -> 8.25; 8.22 -> 8.20; 8.05 -> 8.05; 8.12 -> 8.10; 8.13 -> 8.15
 */
export function roundTo005(num: number): number {
  if (isNaN(num)) return 0;
  const rounded = Math.round((num + Number.EPSILON) * 20) / 20;
  return Math.round((rounded + Number.EPSILON) * 100) / 100;
}

export function roundScore(num: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

export function calculateSingleGrade(
  student: Student,
  score: StudentScore,
  weights: GradeWeights
): CalculatedStudentGrade {
  const { 
    regularScores = [], 
    fifteenMinScores = [], 
    boardBonusTotal = 0, 
    midtermScore, 
    finalScore 
  } = score;

  // Tổng hợp tất cả các đầu điểm đánh giá thường xuyên (ĐTX + 15 phút, đều tính hệ số thường xuyên HS1)
  const allRegularScores = [...regularScores, ...fifteenMinScores];

  // 1. Tính điểm thường xuyên trung bình (làm tròn đến 0.05)
  let regularAvg: number | null = null;
  if (allRegularScores.length > 0) {
    const sum = allRegularScores.reduce((acc, curr) => acc + curr, 0);
    regularAvg = roundTo005(sum / allRegularScores.length);
  }

  // 2. Tính điểm cộng lên bảng quy đổi
  let boardBonusApplied = 0;
  if (weights.bonusConversion === 'direct_average') {
    // Quy đổi từ số lần / điểm tích lũy ra điểm cộng trực tiếp vào ĐTB
    boardBonusApplied = Math.min(
      boardBonusTotal * weights.bonusScale,
      weights.maxBonusAllowed
    );
  }

  // 3. Tính Điểm trung bình môn (ĐTBm) theo hệ số
  let finalAvg: number | null = null;

  if (midtermScore !== null && finalScore !== null && allRegularScores.length > 0) {
    // Thông tư 22 / Bộ GD&ĐT:
    // ĐTBm = (Tổng các điểm ĐTX & 15p + 2*ĐGK + 3*ĐCK) / (Số cột ĐTX&15p + 2 + 3)
    const sumRegular = allRegularScores.reduce((acc, curr) => acc + curr, 0);
    const countRegular = allRegularScores.length;

    const numerator = (sumRegular * weights.regularWeight) + 
                      (midtermScore * weights.midtermWeight) + 
                      (finalScore * weights.finalWeight);
                      
    const denominator = (countRegular * weights.regularWeight) + 
                        weights.midtermWeight + 
                        weights.finalWeight;

    if (denominator > 0) {
      let rawAvg = numerator / denominator;
      
      // Áp dụng điểm cộng lên bảng
      if (weights.bonusConversion === 'direct_average') {
        rawAvg += boardBonusApplied;
      }
      
      // Giới hạn điểm tối đa 10.0 và làm tròn đến 0.05 (2 chữ số thập phân)
      finalAvg = roundTo005(Math.min(rawAvg, 10.0));
    }
  } else if (allRegularScores.length > 0 && midtermScore !== null) {
    // Tạm tính khi chưa có điểm thi cuối kỳ (ví dụ giữa kỳ)
    const sumRegular = allRegularScores.reduce((acc, curr) => acc + curr, 0);
    const countRegular = allRegularScores.length;
    const rawAvg = (sumRegular + midtermScore * weights.midtermWeight) / (countRegular + weights.midtermWeight);
    finalAvg = roundTo005(Math.min(rawAvg + boardBonusApplied, 10.0));
  } else if (allRegularScores.length > 0) {
    finalAvg = roundTo005(Math.min((regularAvg || 0) + boardBonusApplied, 10.0));
  }

  // 4. Phân loại học lực môn Toán
  let rating: AcademicRating = 'ChuaDat';
  let ratingLabel = 'Chưa đạt';

  if (finalAvg !== null) {
    if (finalAvg >= 9.0) {
      rating = 'XuatSac';
      ratingLabel = 'Xuất sắc';
    } else if (finalAvg >= 8.0) {
      rating = 'Gioi';
      ratingLabel = 'Giỏi';
    } else if (finalAvg >= 6.5) {
      rating = 'Kha';
      ratingLabel = 'Khá';
    } else if (finalAvg >= 5.0) {
      rating = 'Dat';
      ratingLabel = 'Đạt (TB)';
    } else {
      rating = 'ChuaDat';
      ratingLabel = 'Chưa đạt';
    }
  } else {
    ratingLabel = 'Chưa đủ điểm';
  }

  return {
    student,
    score,
    regularAvg,
    boardBonusApplied,
    finalAvg,
    rating,
    ratingLabel,
    isPassing: finalAvg !== null ? finalAvg >= 5.0 : false,
  };
}

export interface ClassStatistics {
  totalStudents: number;
  scoredStudents: number;
  classAverage: number | null;
  highestScore: number | null;
  lowestScore: number | null;
  passCount: number;
  failCount: number;
  passRate: number;
  ratingCounts: {
    XuatSac: number;
    Gioi: number;
    Kha: number;
    Dat: number;
    ChuaDat: number;
  };
  ratingPercentages: {
    XuatSac: number;
    Gioi: number;
    Kha: number;
    Dat: number;
    ChuaDat: number;
  };
  strugglingStudents: CalculatedStudentGrade[];
  topBonusStudents: CalculatedStudentGrade[];
}

export function computeClassStats(
  students: Student[],
  scores: StudentScore[],
  weights: GradeWeights
): ClassStatistics {
  const calculated = students.map((st) => {
    const sc = scores.find((s) => s.studentId === st.id) || {
      studentId: st.id,
      classId: st.classId,
      semester: 'HK1',
      regularScores: [],
      boardBonusCount: 0,
      boardBonusTotal: 0,
      midtermScore: null,
      finalScore: null,
    };
    return calculateSingleGrade(st, sc, weights);
  });

  const validGrades = calculated.filter((c) => c.finalAvg !== null);
  const total = students.length;
  const scoredCount = validGrades.length;

  let sum = 0;
  let highest: number | null = null;
  let lowest: number | null = null;
  let passCount = 0;

  const ratingCounts = {
    XuatSac: 0,
    Gioi: 0,
    Kha: 0,
    Dat: 0,
    ChuaDat: 0,
  };

  validGrades.forEach((item) => {
    const val = item.finalAvg!;
    sum += val;
    if (highest === null || val > highest) highest = val;
    if (lowest === null || val < lowest) lowest = val;
    if (item.isPassing) passCount++;

    ratingCounts[item.rating]++;
  });

  const classAverage = scoredCount > 0 ? roundTo005(sum / scoredCount) : null;
  const passRate = scoredCount > 0 ? roundScore((passCount / scoredCount) * 100, 1) : 0;

  const ratingPercentages = {
    XuatSac: scoredCount > 0 ? roundScore((ratingCounts.XuatSac / scoredCount) * 100, 1) : 0,
    Gioi: scoredCount > 0 ? roundScore((ratingCounts.Gioi / scoredCount) * 100, 1) : 0,
    Kha: scoredCount > 0 ? roundScore((ratingCounts.Kha / scoredCount) * 100, 1) : 0,
    Dat: scoredCount > 0 ? roundScore((ratingCounts.Dat / scoredCount) * 100, 1) : 0,
    ChuaDat: scoredCount > 0 ? roundScore((ratingCounts.ChuaDat / scoredCount) * 100, 1) : 0,
  };

  // Học sinh cần hỗ trợ (ĐTB < 5.0 hoặc có điểm thi dưới 5)
  const strugglingStudents = calculated.filter(
    (c) => (c.finalAvg !== null && c.finalAvg < 5.0) || (c.score.midtermScore !== null && c.score.midtermScore < 5.0)
  );

  // Học sinh tích cực lên bảng (có điểm cộng >= 1.0)
  const topBonusStudents = [...calculated]
    .filter((c) => c.score.boardBonusTotal > 0)
    .sort((a, b) => b.score.boardBonusTotal - a.score.boardBonusTotal);

  return {
    totalStudents: total,
    scoredStudents: scoredCount,
    classAverage,
    highestScore: highest,
    lowestScore: lowest,
    passCount,
    failCount: scoredCount - passCount,
    passRate,
    ratingCounts,
    ratingPercentages,
    strugglingStudents,
    topBonusStudents,
  };
}
