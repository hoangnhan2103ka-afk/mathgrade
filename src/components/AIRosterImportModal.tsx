import React, { useState, useRef } from 'react';
import {
  X,
  Sparkles,
  Upload,
  Image as ImageIcon,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Plus,
  Trash2,
  Layers,
  ArrowRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ClassRoom, Student } from '../types';
import { parseRosterWithAI, ParsedStudentItem } from '../services/aiService';
import {
  parseExcelRoster,
  prepareExcelTextForAI,
  parseExcelDate,
  normalizeVietnamesePhone,
  formatDisplayDate,
  isValidVietnamesePhone
} from '../utils/excelRosterParser';

interface AIRosterImportModalProps {
  classroom: ClassRoom;
  existingStudents: Student[];
  onImportSuccess: (
    students: Omit<Student, 'id' | 'classId'>[],
    mode: 'append' | 'replace'
  ) => void;
  onClose: () => void;
}

export const AIRosterImportModal: React.FC<AIRosterImportModalProps> = ({
  classroom,
  existingStudents,
  onImportSuccess,
  onClose,
}) => {
  const [importType, setImportType] = useState<'image' | 'excel'>('excel');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Lưu trữ dữ liệu Excel phân tích sẵn cục bộ
  const [excelRawBuffer, setExcelRawBuffer] = useState<ArrayBuffer | null>(null);
  const [excelTextPreview, setExcelTextPreview] = useState<string | null>(null);
  const [sheetList, setSheetList] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [localParsedStudents, setLocalParsedStudents] = useState<ParsedStudentItem[] | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);

  // Danh sách học sinh sau khi xác nhận xem trước
  const [parsedStudents, setParsedStudents] = useState<ParsedStudentItem[] | null>(null);
  const [detectedClassName, setDetectedClassName] = useState<string>('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Xử lý khi người dùng chọn file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

  const processSelectedFile = (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
    setInfoNotice(null);
    setParsedStudents(null);
    setLocalParsedStudents(null);

    const isImg = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp)$/i.test(file.name);

    if (isImg) {
      setImportType('image');
      setExcelRawBuffer(null);
      setExcelTextPreview(null);
      setSheetList([]);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImportType('excel');
      setImagePreview(null);

      // Đọc file Excel / CSV dạng ArrayBuffer để xử lý đa dạng
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const buffer = ev.target?.result as ArrayBuffer;
          setExcelRawBuffer(buffer);

          // Phân tích thông minh trực tiếp file Excel
          const parseResult = parseExcelRoster(buffer, classroom.grade);
          setSheetList(parseResult.sheetNames);
          setSelectedSheet(parseResult.activeSheet);
          setLocalParsedStudents(parseResult.students);

          if (parseResult.classNameDetected) {
            setDetectedClassName(parseResult.classNameDetected);
          }

          // Chuẩn bị văn bản bảng có định dạng sạch và chuyển đổi ngày tháng cho AI Gemini
          try {
            const data = new Uint8Array(buffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[parseResult.activeSheet] || workbook.Sheets[workbook.SheetNames[0]];
            const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });
            const structuredText = prepareExcelTextForAI(rows, parseResult.activeSheet);
            setExcelTextPreview(structuredText);
          } catch {
            // Không bắt buộc nếu parse trực tiếp đã thành công
          }
        } catch (err: any) {
          console.warn('Lỗi phân tích Excel cục bộ:', err);
          // Nếu parse cục bộ chưa khớp định dạng, vẫn tạo bảng text fallback cho AI
          try {
            const buffer = ev.target?.result as ArrayBuffer;
            const data = new Uint8Array(buffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.SheetNames[0];
            setSheetList(workbook.SheetNames);
            setSelectedSheet(firstSheet);
            const worksheet = workbook.Sheets[firstSheet];
            const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', blankrows: false });
            const structuredText = prepareExcelTextForAI(rows, firstSheet);
            setExcelTextPreview(structuredText);
            setInfoNotice('Đã tải tệp Excel. Bạn có thể bấm "✨ Đọc bằng AI (Gemini)" để trích xuất chuẩn xác.');
          } catch (e2) {
            setErrorMessage('Không thể đọc dữ liệu từ tệp này. Vui lòng kiểm tra lại định dạng tệp (.xlsx, .xls, .csv).');
          }
        }
      };
      reader.onerror = () => {
        setErrorMessage('Lỗi khi đọc tệp từ thiết bị.');
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Đổi sheet khi file Excel có nhiều trang tính
  const handleSheetChange = (sheetName: string) => {
    if (!excelRawBuffer) return;
    setSelectedSheet(sheetName);
    setErrorMessage(null);
    try {
      const parseResult = parseExcelRoster(excelRawBuffer, classroom.grade, sheetName);
      setLocalParsedStudents(parseResult.students);
      if (parseResult.classNameDetected) {
        setDetectedClassName(parseResult.classNameDetected);
      }
      // Cập nhật text cấu trúc cho AI
      const data = new Uint8Array(excelRawBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[sheetName];
      if (worksheet) {
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', blankrows: false });
        setExcelTextPreview(prepareExcelTextForAI(rows, sheetName));
      }
    } catch (err: any) {
      setErrorMessage(err.message || `Không thể phân tích trang tính "${sheetName}".`);
      setLocalParsedStudents(null);
    }
  };

  // Kéo thả file
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  // Áp dụng ngay kết quả trích xuất từ Excel cục bộ (không cần chờ API AI)
  const handleApplyLocalExcel = () => {
    if (!localParsedStudents || localParsedStudents.length === 0) {
      setErrorMessage('Chưa tìm thấy học sinh nào trong tệp Excel.');
      return;
    }
    setParsedStudents(localParsedStudents);
  };

  // Gọi AI Gemini xử lý (Phân tích ảnh hoặc Chuẩn hóa sâu bảng dữ liệu)
  const handleAnalyzeWithAI = async () => {
    if (!selectedFile) {
      setErrorMessage('Vui lòng chọn một file ảnh hoặc tệp Excel danh sách.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setInfoNotice(null);

    try {
      if (importType === 'image' && imagePreview) {
        setLoadingStep('Đang tối ưu hình ảnh và gửi tới Gemini Vision AI...');
        try {
          const result = await parseRosterWithAI({
            imageBase64: imagePreview,
            mimeType: selectedFile.type || 'image/jpeg',
            grade: classroom.grade,
          });

          if (!result.students || result.students.length === 0) {
            throw new Error('AI không nhận diện được học sinh nào từ ảnh. Vui lòng chụp rõ nét hơn hoặc dùng file Excel.');
          }

          setParsedStudents(result.students);
          if (result.classNameDetected) setDetectedClassName(result.classNameDetected);
        } catch (imgErr: any) {
          const msg = imgErr.message || '';
          if (
            msg.includes('401') ||
            msg.includes('UNAUTHENTICATED') ||
            msg.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') ||
            msg.includes('Chưa cấu hình')
          ) {
            throw new Error(
              'Khóa Gemini API (GEMINI_API_KEY) hiện tại chưa được xác thực hoặc không hợp lệ (mã lỗi 401: ACCESS_TOKEN_TYPE_UNSUPPORTED). Thầy/Cô vui lòng cập nhật lại khóa API trong mục Settings > Secrets của AI Studio, hoặc chuyển sang nhập bằng file Excel để đưa danh sách vào hệ thống ngay lập tức mà không cần kết nối AI.'
            );
          }
          throw imgErr;
        }
      } else {
        // Phân tích file Excel bằng AI
        setLoadingStep('AI đang phân tích cấu trúc cột, chuẩn hóa họ tên và giới tính...');

        // Nội dung gửi tới AI: ưu tiên csvText hoặc danh sách đã đọc
        let contentToSend = excelTextPreview;
        if (!contentToSend && localParsedStudents && localParsedStudents.length > 0) {
          contentToSend = localParsedStudents
            .map((s) => `${s.stt}, ${s.fullName}, ${s.gender}, ${s.dateOfBirth}, ${s.parentPhone || ''}`)
            .join('\n');
        }

        if (!contentToSend) {
          throw new Error('Nội dung tệp Excel trống hoặc chưa được nạp.');
        }

        try {
          const result = await parseRosterWithAI({
            fileContent: contentToSend,
            grade: classroom.grade,
          });

          if (result.students && result.students.length > 0) {
            setParsedStudents(result.students);
            if (result.classNameDetected) setDetectedClassName(result.classNameDetected);
            if (result.fallbackUsed) {
              setInfoNotice('Đã trích xuất danh sách thành công trực tiếp từ tệp Excel của bạn.');
            }
          } else if (localParsedStudents && localParsedStudents.length > 0) {
            // Dự phòng nếu AI trả về rỗng nhưng local đã có
            setParsedStudents(localParsedStudents);
            setInfoNotice('Đã trích xuất danh sách thành công trực tiếp từ tệp Excel của bạn.');
          } else {
            throw new Error('AI không nhận diện được danh sách học sinh từ file Excel.');
          }
        } catch (aiErr: any) {
          // Nếu dịch vụ AI gặp sự cố (503/quota/network/401 auth), tự động fallback sang kết quả phân tích Excel cục bộ
          if (localParsedStudents && localParsedStudents.length > 0) {
            console.warn('AI gặp lỗi, chuyển sang kết quả trích xuất Excel cục bộ:', aiErr.message);
            setParsedStudents(localParsedStudents);
            setInfoNotice(
              'Hệ thống đã tự động trích xuất trực tiếp thành công toàn bộ danh sách từ tệp Excel của bạn (không cần kết nối AI)!'
            );
          } else if (excelRawBuffer) {
            try {
              const directParse = parseExcelRoster(excelRawBuffer, classroom.grade, selectedSheet);
              if (directParse.students && directParse.students.length > 0) {
                setParsedStudents(directParse.students);
                if (directParse.classNameDetected) setDetectedClassName(directParse.classNameDetected);
                setInfoNotice(
                  'Hệ thống đã tự động trích xuất trực tiếp thành công toàn bộ danh sách từ tệp Excel!'
                );
                return;
              }
            } catch (errLocal) {
              console.warn('Direct parse failed:', errLocal);
            }
            throw aiErr;
          } else {
            throw aiErr;
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Đã xảy ra lỗi khi phân tích dữ liệu.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const defaultTargetYear = 2024 - (parseInt(classroom.grade, 10) || 10) - 5;

  // Chỉnh sửa trực tiếp từng ô học sinh đã parse
  const handleUpdateParsedStudent = (index: number, field: keyof ParsedStudentItem, value: any) => {
    if (!parsedStudents) return;
    const updated = [...parsedStudents];
    updated[index] = { ...updated[index], [field]: value };
    setParsedStudents(updated);
  };

  // Chuẩn hóa ngày sinh khi rời ô input
  const handleBlurDateOfBirth = (index: number, rawVal: string) => {
    if (!parsedStudents || !rawVal.trim()) return;
    const normalized = parseExcelDate(rawVal, defaultTargetYear);
    handleUpdateParsedStudent(index, 'dateOfBirth', normalized);
  };

  // Chuẩn hóa số điện thoại khi rời ô input
  const handleBlurPhone = (index: number, rawVal: string) => {
    if (!parsedStudents || !rawVal.trim()) return;
    const normalized = normalizeVietnamesePhone(rawVal);
    handleUpdateParsedStudent(index, 'parentPhone', normalized);
  };

  // Chuẩn hóa đồng loạt ngày sinh và số điện thoại toàn bộ bảng
  const handleNormalizeAllData = () => {
    if (!parsedStudents) return;
    const updated = parsedStudents.map((st) => ({
      ...st,
      dateOfBirth: st.dateOfBirth ? parseExcelDate(st.dateOfBirth, defaultTargetYear) : `${defaultTargetYear}-01-01`,
      parentPhone: st.parentPhone ? normalizeVietnamesePhone(st.parentPhone) : undefined,
    }));
    setParsedStudents(updated);
    setInfoNotice('Đã chuẩn hóa toàn bộ ngày sinh (ISO YYYY-MM-DD) và số điện thoại (chuẩn 10 số di động)!');
  };

  // Thêm 1 dòng học sinh mới vào bảng xem trước
  const handleAddNewRow = () => {
    if (!parsedStudents) return;
    const newIdx = parsedStudents.length + 1;
    const newSt: ParsedStudentItem = {
      stt: newIdx,
      studentCode: `HS${classroom.grade}${String(newIdx).padStart(2, '0')}`,
      fullName: '',
      gender: 'Nam',
      dateOfBirth: `${defaultTargetYear}-01-01`,
    };
    setParsedStudents([...parsedStudents, newSt]);
  };

  // Xóa 1 học sinh khỏi danh sách parse
  const handleRemoveParsedStudent = (index: number) => {
    if (!parsedStudents) return;
    setParsedStudents(parsedStudents.filter((_, i) => i !== index));
  };

  // Xác nhận đưa vào lớp
  const handleConfirmImport = () => {
    if (!parsedStudents || parsedStudents.length === 0) return;

    const baseStt = importMode === 'append' ? existingStudents.length : 0;
    const formatted: Omit<Student, 'id' | 'classId'>[] = parsedStudents
      .filter((item) => item.fullName.trim().length > 0)
      .map((item, idx) => {
        const cleanDob = item.dateOfBirth ? parseExcelDate(item.dateOfBirth, defaultTargetYear) : `${defaultTargetYear}-01-01`;
        const cleanPhone = item.parentPhone ? normalizeVietnamesePhone(item.parentPhone) : undefined;
        return {
          stt: importMode === 'append' ? baseStt + idx + 1 : item.stt || idx + 1,
          studentCode: item.studentCode?.trim() || `HS${classroom.grade}${String(baseStt + idx + 1).padStart(2, '0')}`,
          fullName: item.fullName.trim(),
          gender: item.gender === 'Nữ' ? 'Nữ' : 'Nam',
          dateOfBirth: cleanDob,
          parentPhone: cleanPhone || undefined,
          notes: item.notes?.trim() || undefined,
        };
      });

    if (formatted.length === 0) {
      setErrorMessage('Danh sách không có học sinh hợp lệ để lưu.');
      return;
    }

    onImportSuccess(formatted, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-auto">
        {/* Header Modal */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center space-x-2">
                <span>Nhập Danh Sách Lớp Học</span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                  Excel & AI OCR
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Lớp {classroom.name} • Tự động nhận diện từ file Excel/CSV (.xlsx, .xls) hoặc ảnh chụp sổ điểm
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

        {/* Màn hình tải file & Chọn hình thức */}
        {!parsedStudents ? (
          <div className="space-y-4 pt-4">
            {/* Tab chọn định dạng */}
            <div className="flex rounded-xl p-1 bg-slate-100 border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setImportType('excel');
                  setSelectedFile(null);
                  setImagePreview(null);
                  setLocalParsedStudents(null);
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  importType === 'excel'
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Tệp Excel / CSV (.xlsx, .xls, .csv)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setImportType('image');
                  setSelectedFile(null);
                  setLocalParsedStudents(null);
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  importType === 'image'
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <span>Ảnh chụp danh sách (Chụp bảng, giấy in, sổ điểm)</span>
              </button>
            </div>

            {/* Vùng tải file Drag & Drop */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                selectedFile
                  ? 'border-indigo-400 bg-indigo-50/40'
                  : 'border-slate-300 hover:border-indigo-400 bg-slate-50/70 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={
                  importType === 'image'
                    ? 'image/jpeg,image/png,image/webp,image/bmp'
                    : '.xlsx,.xls,.csv,.tsv'
                }
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="space-y-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 text-indigo-600">
                    {importType === 'image' ? (
                      <ImageIcon className="w-6 h-6" />
                    ) : (
                      <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                    )}
                  </div>
                  <div className="text-sm font-bold text-slate-800">{selectedFile.name}</div>
                  <div className="text-xs text-slate-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Bấm để chọn tệp khác
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-200 text-slate-500">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-slate-700">
                    Kéo thả {importType === 'image' ? 'ảnh chụp' : 'file Excel (.xlsx, .xls)'} vào đây hoặc bấm để chọn tệp
                  </div>
                  <p className="text-xs text-slate-500">
                    {importType === 'image'
                      ? 'Hỗ trợ ảnh chụp rõ nét từ điện thoại, scan văn bản hoặc ảnh màn hình'
                      : 'Hỗ trợ xuất từ vnEdu, SMAS, CSDL ngành, hoặc tệp Excel tùy chỉnh mọi bố cục cột'}
                  </p>
                </div>
              )}
            </div>

            {/* Khi file Excel có nhiều Sheet */}
            {importType === 'excel' && sheetList.length > 1 && (
              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs">
                <Layers className="w-4 h-4 text-slate-600 shrink-0" />
                <span className="font-semibold text-slate-700">Chọn trang tính (Sheet):</span>
                <select
                  value={selectedSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {sheetList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Thông báo kết quả trích xuất nhanh từ Excel */}
            {importType === 'excel' && localParsedStudents && localParsedStudents.length > 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs space-y-1.5">
                <div className="flex items-center space-x-2 font-bold text-emerald-800 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Đã đọc thành công {localParsedStudents.length} học sinh từ file Excel!</span>
                </div>
                <p className="text-emerald-700 text-xs">
                  {detectedClassName ? `Phát hiện lớp: ${detectedClassName} • ` : ''}
                  Hệ thống tự động ghép cột Họ đệm + Tên, định dạng Ngày sinh và phân loại Giới tính. Bạn có thể nhấn{' '}
                  <strong className="font-semibold text-emerald-900">"Xem & Sử Dụng Ngay"</strong> để kiểm tra hoặc chọn phân tích thêm bằng AI.
                </p>
              </div>
            )}

            {/* Xem trước ảnh nếu chọn ảnh */}
            {imagePreview && (
              <div className="max-h-48 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center p-2">
                <img
                  src={imagePreview}
                  alt="Xem trước ảnh"
                  className="max-h-44 object-contain rounded-lg shadow-xs"
                />
              </div>
            )}

            {/* Thông báo thông tin */}
            {infoNotice && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs rounded-xl flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>{infoNotice}</span>
              </div>
            )}

            {/* Thông báo lỗi nếu có */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Nút hành động */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>

              <div className="flex items-center space-x-2">
                {/* Nút xem trực tiếp kết quả Excel nếu đọc thành công */}
                {importType === 'excel' && localParsedStudents && localParsedStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={handleApplyLocalExcel}
                    className="px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>Xem & Sử Dụng Ngay ({localParsedStudents.length} HS)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Nút phân tích / chuẩn hóa bằng AI */}
                <button
                  type="button"
                  onClick={handleAnalyzeWithAI}
                  disabled={!selectedFile || isLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs flex items-center space-x-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{loadingStep || 'Đang xử lý...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>
                        {importType === 'excel' && localParsedStudents
                          ? 'Chuẩn Hóa Sâu Bằng AI'
                          : 'Bắt Đầu Phân Tích Bằng AI'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Màn hình xem trước & chỉnh sửa trực tiếp kết quả trích xuất */
          <div className="space-y-4 pt-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-emerald-900">
                    Đã Trích Xuất Thành Công {parsedStudents.length} Học Sinh!
                  </h4>
                  <p className="text-[11px] text-emerald-700">
                    {detectedClassName ? `Lớp phát hiện: ${detectedClassName} • ` : ''}
                    Nam: {parsedStudents.filter((s) => s.gender === 'Nam').length}, Nữ:{' '}
                    {parsedStudents.filter((s) => s.gender === 'Nữ').length}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleNormalizeAllData}
                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  title="Tự động chuẩn hóa định dạng toàn bộ ngày sinh (ISO) và số điện thoại di động (10 số)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Chuẩn hóa ngày/SĐT</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddNewRow}
                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm dòng</span>
                </button>
                <button
                  type="button"
                  onClick={() => setParsedStudents(null)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Chọn tệp khác</span>
                </button>
              </div>
            </div>

            {/* Thông báo thông tin */}
            {infoNotice && (
              <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-lg flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{infoNotice}</span>
              </div>
            )}

            {/* Bảng xem trước & chỉnh sửa trực tiếp */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-2.5 w-10 text-center">STT</th>
                    <th className="py-2 px-2 w-24">Mã HS</th>
                    <th className="py-2 px-3 min-w-[140px]">Họ và Tên</th>
                    <th className="py-2 px-2 w-20 text-center">Giới tính</th>
                    <th className="py-2 px-2 w-32">Ngày sinh (ISO)</th>
                    <th className="py-2 px-2 min-w-[120px]">SĐT Phụ huynh</th>
                    <th className="py-2 px-2 min-w-[120px]">Ghi chú</th>
                    <th className="py-2 px-1 w-8 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {parsedStudents.map((st, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-1.5 px-2.5 text-center text-slate-500 font-medium">
                        {st.stt || idx + 1}
                      </td>
                      <td className="py-1 px-2">
                        <input
                          type="text"
                          value={st.studentCode}
                          onChange={(e) => handleUpdateParsedStudent(idx, 'studentCode', e.target.value)}
                          className="w-full font-mono text-[11px] px-1 py-0.5 border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded-sm bg-transparent outline-hidden"
                        />
                      </td>
                      <td className="py-1 px-2">
                        <input
                          type="text"
                          value={st.fullName}
                          onChange={(e) => handleUpdateParsedStudent(idx, 'fullName', e.target.value)}
                          className="w-full font-bold text-xs px-1.5 py-0.5 border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded-sm bg-transparent outline-hidden text-slate-900"
                        />
                      </td>
                      <td className="py-1 px-1 text-center">
                        <select
                          value={st.gender}
                          onChange={(e) => handleUpdateParsedStudent(idx, 'gender', e.target.value as 'Nam' | 'Nữ')}
                          className="text-[11px] font-medium px-1 py-0.5 border border-slate-200 rounded-sm bg-white"
                        >
                          <option value="Nam">Nam</option>
                          <option value="Nữ">Nữ</option>
                        </select>
                      </td>
                      <td className="py-1 px-2">
                        <input
                          type="text"
                          value={st.dateOfBirth}
                          placeholder="YYYY-MM-DD hoặc DD/MM/YYYY"
                          onChange={(e) => handleUpdateParsedStudent(idx, 'dateOfBirth', e.target.value)}
                          onBlur={(e) => handleBlurDateOfBirth(idx, e.target.value)}
                          className="w-full text-[11px] px-1 py-0.5 border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded-sm bg-transparent outline-hidden font-mono"
                          title="Nhập DD/MM/YYYY hoặc YYYY-MM-DD, hệ thống sẽ tự chuẩn hóa"
                        />
                        {st.dateOfBirth && (
                          <div className="text-[10px] text-slate-400 font-medium px-1 truncate">
                            Hiển thị: {formatDisplayDate(st.dateOfBirth)}
                          </div>
                        )}
                      </td>
                      <td className="py-1 px-2">
                        <input
                          type="text"
                          value={st.parentPhone || ''}
                          placeholder="09... / Bố: 09..."
                          onChange={(e) => handleUpdateParsedStudent(idx, 'parentPhone', e.target.value)}
                          onBlur={(e) => handleBlurPhone(idx, e.target.value)}
                          className="w-full text-[11px] px-1 py-0.5 border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded-sm bg-transparent outline-hidden font-mono"
                          title="Nhập số điện thoại, hệ thống tự chuẩn hóa 10 số và giữ nhãn Bố/Mẹ"
                        />
                        {st.parentPhone && (
                          <div className="flex items-center space-x-1 text-[10px] px-1">
                            {isValidVietnamesePhone(st.parentPhone) ? (
                              <span className="text-emerald-600 font-medium flex items-center space-x-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5 inline" />
                                <span>Hợp lệ</span>
                              </span>
                            ) : (
                              <span className="text-amber-600 font-medium">Cần kiểm tra</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-1 px-2">
                        <input
                          type="text"
                          value={st.notes || ''}
                          placeholder="Ghi chú..."
                          onChange={(e) => handleUpdateParsedStudent(idx, 'notes', e.target.value)}
                          className="w-full text-[11px] px-1 py-0.5 border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded-sm bg-transparent outline-hidden"
                        />
                      </td>
                      <td className="py-1 px-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveParsedStudent(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-sm cursor-pointer"
                          title="Xóa dòng"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Chọn hình thức lưu */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <span className="font-bold text-slate-700 block">Lựa chọn chế độ thêm vào lớp:</span>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center space-x-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Thêm tiếp vào danh sách hiện tại (Sĩ số hiện tại: {existingStudents.length})</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer font-medium text-rose-700">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <span>Thay thế toàn bộ danh sách học sinh của lớp</span>
                </label>
              </div>
            </div>

            {/* Nút hành động cuối */}
            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setParsedStudents(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Xác Nhận Đưa {parsedStudents.length} Học Sinh Vào Lớp</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
