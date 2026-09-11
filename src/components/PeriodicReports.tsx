import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  TrendingUp, 
  AlertTriangle, 
  Award, 
  Calendar, 
  CheckCircle, 
  Clock, 
  FileText, 
  Sparkles,
  Users
} from 'lucide-react';
import { 
  ClassRoom, 
  Student, 
  StudentScore, 
  DisciplineRecord, 
  GradeWeights,
  TeacherProfile
} from '../types';
import { computeClassStats, calculateSingleGrade } from '../utils/gradeCalculations';
import { exportMonthlyReportToExcel, exportGradeBookToExcel } from '../utils/exportUtils';

interface PeriodicReportsProps {
  classroom: ClassRoom;
  students: Student[];
  scores: StudentScore[];
  disciplines: DisciplineRecord[];
  weights: GradeWeights;
  teacher?: TeacherProfile;
  onOpenExportModal?: () => void;
}

export const PeriodicReports: React.FC<PeriodicReportsProps> = ({
  classroom,
  students,
  scores,
  disciplines,
  weights,
  teacher,
  onOpenExportModal,
}) => {
  const [reportType, setReportType] = useState<'monthly' | 'semester'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<number>(10); // Mặc định tháng 10
  const [selectedYear, setSelectedYear] = useState<number>(2024);

  // Thống kê chung cả kỳ
  const stats = useMemo(() => {
    return computeClassStats(students, scores, weights);
  }, [students, scores, weights]);

  // Lọc dữ liệu nề nếp theo tháng được chọn
  const monthDisciplines = useMemo(() => {
    return disciplines.filter((d) => {
      const dDate = new Date(d.date);
      return dDate.getMonth() + 1 === selectedMonth && dDate.getFullYear() === selectedYear;
    });
  }, [disciplines, selectedMonth, selectedYear]);

  // Thống kê nề nếp tháng
  const monthDisciplineSummary = useMemo(() => {
    let absent = 0;
    let late = 0;
    let forgotHomework = 0;
    let forgotCalc = 0;
    let totalBonusPoints = 0;

    monthDisciplines.forEach((d) => {
      if (d.attendance === 'vang_p' || d.attendance === 'vang_kp') absent++;
      if (d.attendance === 'di_tre') late++;
      if (!d.hasHomework) forgotHomework++;
      if (!d.hasCalculator) forgotCalc++;
      if (d.boardScoreAwarded) totalBonusPoints += d.boardScoreAwarded;
    });

    return { absent, late, forgotHomework, forgotCalc, totalBonusPoints };
  }, [monthDisciplines]);

  // Học sinh cần phụ đạo toán
  const strugglingStudents = useMemo(() => {
    return students
      .map((st) => {
        const sc = scores.find((s) => s.studentId === st.id) || {
          studentId: st.id,
          classId: classroom.id,
          semester: classroom.semester,
          regularScores: [],
          boardBonusCount: 0,
          boardBonusTotal: 0,
          midtermScore: null,
          finalScore: null,
        };
        const calc = calculateSingleGrade(st, sc, weights);
        const stMonthDisc = monthDisciplines.filter((d) => d.studentId === st.id);
        const forgotHW = stMonthDisc.filter((d) => !d.hasHomework).length;
        const forgotCalc = stMonthDisc.filter((d) => !d.hasCalculator).length;

        return {
          student: st,
          calc,
          score: sc,
          forgotHW,
          forgotCalc,
          needsHelp: (calc.finalAvg !== null && calc.finalAvg < 5.0) || forgotHW >= 2 || forgotCalc >= 2,
        };
      })
      .filter((item) => item.needsHelp);
  }, [students, scores, classroom, weights, monthDisciplines]);

  // Xuất file Excel báo cáo
  const handleExportExcel = () => {
    if (reportType === 'monthly') {
      exportMonthlyReportToExcel(
        classroom,
        students,
        scores,
        disciplines,
        selectedMonth,
        selectedYear,
        weights
      );
    } else {
      if (onOpenExportModal) {
        onOpenExportModal();
      } else {
        exportGradeBookToExcel(classroom, students, scores, weights);
      }
    }
  };

  // Kích hoạt in báo cáo trang A4
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Bộ Chọn Báo Cáo */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs no-print flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">
              Báo Cáo Định Kỳ & Thống Kê Điểm Môn Toán
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Lớp {classroom.name} • Năm học {classroom.schoolYear} • Hệ số tính điểm theo Thông tư 22
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Chọn Loại Báo Cáo */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium">
            <button
              type="button"
              onClick={() => setReportType('monthly')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                reportType === 'monthly'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Báo Cáo Theo Tháng
            </button>
            <button
              type="button"
              onClick={() => setReportType('semester')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                reportType === 'semester'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Báo Cáo Học Kỳ
            </button>
          </div>

          {/* Chọn tháng nếu là monthly */}
          {reportType === 'monthly' && (
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent outline-hidden cursor-pointer text-slate-800"
              >
                {[9, 10, 11, 12, 1, 2, 3, 4, 5].map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>
              <span className="text-slate-400">/</span>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-14 bg-transparent outline-hidden"
              />
            </div>
          )}

          {/* Nút Xuất Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Excel Báo Cáo</span>
          </button>

          {/* Nút In ấn / In PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>In Báo Cáo (A4)</span>
          </button>
        </div>
      </div>

      {/* 2. KHU VỰC BÁO CÁO CÓ THỂ IN ẤN (PRINT VIEW) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs print:border-none print:shadow-none print:p-0">
        {/* Tiêu ngữ chuẩn văn bản GD Việt Nam */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6">
          <div className="flex justify-between items-start text-xs sm:text-sm">
            <div className="text-left">
              <div className="font-bold uppercase tracking-wider text-slate-900">SỞ GIÁO DỤC VÀ ĐÀO TẠO</div>
              <div className="font-semibold text-slate-800 uppercase">
                {teacher?.schoolName || 'TRƯỜNG THPT CHUYÊN & CHẤT LƯỢNG CAO'}
              </div>
              <div className="text-slate-500 text-xs">
                {teacher?.department ? `${teacher.department.toUpperCase()} • ` : ''}MÔN: {teacher?.subject?.toUpperCase() || 'TOÁN HỌC'}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold uppercase text-slate-900">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div className="font-medium text-slate-700">Độc lập - Tự do - Hạnh phúc</div>
              <div className="text-slate-500 text-xs italic mt-1">
                Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
              </div>
            </div>
          </div>

          <div className="text-center mt-6">
            <h1 className="text-xl sm:text-2xl font-extrabold uppercase tracking-wide text-slate-900">
              {reportType === 'monthly'
                ? `BÁO CÁO ĐỊNH KỲ THÁNG ${selectedMonth}/${selectedYear} - BỘ MÔN TOÁN`
                : `BÁO CÁO TỔNG HỢP HỌC LỰC MÔN TOÁN - ${classroom.semester === 'HK1' ? 'HỌC KỲ I' : 'HỌC KỲ II'}`}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
              Lớp: <span className="font-bold text-slate-900">{classroom.name}</span> • Sĩ số: <span className="font-bold text-slate-900">{students.length}</span> học sinh • Năm học: <span className="font-bold text-slate-900">{classroom.schoolYear}</span>
            </p>
          </div>
        </div>

        {/* Thống kê tỷ lệ phân loại học lực Môn Toán */}
        <div className="mb-6 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-l-4 border-indigo-600 pl-2">
            I. Thống Kê Phân Loại Học Lực Môn Toán
          </h3>

          {/* Biểu đồ thanh tỷ lệ phân loại */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="h-5 w-full bg-slate-200 rounded-full flex overflow-hidden">
              <div 
                style={{ width: `${stats.ratingPercentages.XuatSac}%` }} 
                className="bg-purple-600 transition-all" 
                title={`Xuất sắc: ${stats.ratingPercentages.XuatSac}%`} 
              />
              <div 
                style={{ width: `${stats.ratingPercentages.Gioi}%` }} 
                className="bg-emerald-600 transition-all" 
                title={`Giỏi: ${stats.ratingPercentages.Gioi}%`} 
              />
              <div 
                style={{ width: `${stats.ratingPercentages.Kha}%` }} 
                className="bg-blue-600 transition-all" 
                title={`Khá: ${stats.ratingPercentages.Kha}%`} 
              />
              <div 
                style={{ width: `${stats.ratingPercentages.Dat}%` }} 
                className="bg-amber-500 transition-all" 
                title={`Đạt: ${stats.ratingPercentages.Dat}%`} 
              />
              <div 
                style={{ width: `${stats.ratingPercentages.ChuaDat}%` }} 
                className="bg-rose-600 transition-all" 
                title={`Chưa đạt: ${stats.ratingPercentages.ChuaDat}%`} 
              />
            </div>

            {/* Chú thích & Tỷ lệ chi tiết */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 text-xs">
              <div className="p-2 bg-white rounded-lg border border-purple-200">
                <div className="flex items-center space-x-1.5 text-purple-700 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                  <span>Xuất sắc (≥ 9.0)</span>
                </div>
                <div className="text-base font-extrabold text-slate-900 mt-1">
                  {stats.ratingCounts.XuatSac} HS <span className="text-xs text-slate-400 font-normal">({stats.ratingPercentages.XuatSac}%)</span>
                </div>
              </div>

              <div className="p-2 bg-white rounded-lg border border-emerald-200">
                <div className="flex items-center space-x-1.5 text-emerald-700 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <span>Giỏi (8.0 - 8.9)</span>
                </div>
                <div className="text-base font-extrabold text-slate-900 mt-1">
                  {stats.ratingCounts.Gioi} HS <span className="text-xs text-slate-400 font-normal">({stats.ratingPercentages.Gioi}%)</span>
                </div>
              </div>

              <div className="p-2 bg-white rounded-lg border border-blue-200">
                <div className="flex items-center space-x-1.5 text-blue-700 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span>Khá (6.5 - 7.9)</span>
                </div>
                <div className="text-base font-extrabold text-slate-900 mt-1">
                  {stats.ratingCounts.Kha} HS <span className="text-xs text-slate-400 font-normal">({stats.ratingPercentages.Kha}%)</span>
                </div>
              </div>

              <div className="p-2 bg-white rounded-lg border border-amber-200">
                <div className="flex items-center space-x-1.5 text-amber-700 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Đạt (5.0 - 6.4)</span>
                </div>
                <div className="text-base font-extrabold text-slate-900 mt-1">
                  {stats.ratingCounts.Dat} HS <span className="text-xs text-slate-400 font-normal">({stats.ratingPercentages.Dat}%)</span>
                </div>
              </div>

              <div className="p-2 bg-white rounded-lg border border-rose-200">
                <div className="flex items-center space-x-1.5 text-rose-700 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                  <span>Chưa đạt (&lt; 5.0)</span>
                </div>
                <div className="text-base font-extrabold text-slate-900 mt-1">
                  {stats.ratingCounts.ChuaDat} HS <span className="text-xs text-slate-400 font-normal">({stats.ratingPercentages.ChuaDat}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tổng hợp tình hình nề nếp trong giờ Toán */}
        <div className="mb-6 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-l-4 border-indigo-600 pl-2">
            II. Tình Hình Nề Nếp & Chuyên Cần Trong Tiết Toán
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 block">Số lượt nghỉ / vắng</span>
              <span className="text-base font-bold text-slate-900 mt-0.5 block">
                {monthDisciplineSummary.absent} lượt
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 block">Số lượt vào trễ</span>
              <span className="text-base font-bold text-slate-900 mt-0.5 block">
                {monthDisciplineSummary.late} lượt
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 block">Số lần quên BTVN</span>
              <span className="text-base font-bold text-amber-900 mt-0.5 block">
                {monthDisciplineSummary.forgotHomework} lượt
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 block">Quên máy tính Casio</span>
              <span className="text-base font-bold text-blue-900 mt-0.5 block">
                {monthDisciplineSummary.forgotCalc} lượt
              </span>
            </div>
          </div>
        </div>

        {/* Danh sách học sinh cần phụ đạo toán */}
        <div className="mb-6 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-rose-800 border-l-4 border-rose-600 pl-2">
            III. Danh Sách Học Sinh Cần Phụ Đạo & Kế Hoạch Bồi Dưỡng
          </h3>

          {strugglingStudents.length === 0 ? (
            <p className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
              ✓ Toàn bộ học sinh trong lớp đều đạt điểm chuẩn và thực hiện tốt nề nếp môn Toán.
            </p>
          ) : (
            <table className="w-full text-left text-xs border border-slate-200 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="py-2 px-3 w-12 text-center">STT</th>
                  <th className="py-2 px-3 w-20">Mã HS</th>
                  <th className="py-2 px-4 min-w-[140px]">Họ và Tên</th>
                  <th className="py-2 px-3 text-center">ĐTB Hiện Tại</th>
                  <th className="py-2 px-3 text-center">Số Lần Quên BTVN</th>
                  <th className="py-2 px-3 text-center">Quên Máy Tính</th>
                  <th className="py-2 px-4 min-w-[180px]">Kế Hoạch / Biện Pháp Khắc Phục</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {strugglingStudents.map(({ student, calc, forgotHW, forgotCalc }, index) => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-center text-slate-500">{index + 1}</td>
                    <td className="py-2 px-3 font-mono">{student.studentCode}</td>
                    <td className="py-2 px-4 font-bold text-slate-900">{student.fullName}</td>
                    <td className="py-2 px-3 text-center font-bold text-rose-600">
                      {calc.finalAvg !== null ? calc.finalAvg.toFixed(2) : '--'}
                    </td>
                    <td className="py-2 px-3 text-center">{forgotHW} lần</td>
                    <td className="py-2 px-3 text-center">{forgotCalc} lần</td>
                    <td className="py-2 px-4 text-slate-700">
                      {calc.finalAvg !== null && calc.finalAvg < 5.0
                        ? 'Kèm thêm phương pháp giải Đại số & Hình học; liên hệ PHHS'
                        : 'Nhắc nhở chuẩn bị đầy đủ bài tập và máy tính trước khi vào tiết'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Chữ ký & Phê duyệt chuẩn */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-2 text-center text-xs sm:text-sm">
          <div>
            <div className="font-bold uppercase text-slate-800">GIÁO VIÊN CHỦ NHIỆM</div>
            <div className="text-slate-400 italic mt-0.5">(Ký và ghi rõ họ tên)</div>
            <div className="h-16" />
          </div>
          <div>
            <div className="font-bold uppercase text-slate-800">GIÁO VIÊN BỘ MÔN TOÁN</div>
            <div className="text-slate-400 italic mt-0.5">(Ký và ghi rõ họ tên)</div>
            <div className="h-16 flex items-end justify-center">
              <span className="font-bold text-slate-900">{teacher?.fullName || ''}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
