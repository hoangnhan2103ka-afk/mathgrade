import * as XLSX from 'xlsx';
import { ParsedStudentItem } from '../services/aiService';

export interface ExcelParseResult {
  sheetNames: string[];
  activeSheet: string;
  classNameDetected?: string;
  students: ParsedStudentItem[];
  totalRowsRead: number;
}

/**
 * Chuyển đổi giá trị ngày tháng từ Excel (số serial, chuỗi ký tự hoặc Date object) sang định dạng YYYY-MM-DD
 */
export function parseExcelDate(val: any, defaultYear: number = 2009): string {
  if (val === undefined || val === null || val === '') {
    return `${defaultYear}-01-01`;
  }

  // Nếu là Date object do thư viện XLSX parse ra
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return `${defaultYear}-01-01`;
    // Ưu tiên đọc theo UTC nếu XLSX tạo từ UTC serial
    const uy = val.getUTCFullYear();
    const um = String(val.getUTCMonth() + 1).padStart(2, '0');
    const ud = String(val.getUTCDate()).padStart(2, '0');
    if (uy >= 1970 && uy <= 2035) {
      return `${uy}-${um}-${ud}`;
    }
    const ly = val.getFullYear();
    const lm = String(val.getMonth() + 1).padStart(2, '0');
    const ld = String(val.getDate()).padStart(2, '0');
    return `${ly}-${lm}-${ld}`;
  }

  // Số trong Excel
  if (typeof val === 'number') {
    // Nếu chỉ là năm sinh thuần túy (VD: 2008, 2009, 2010...)
    if (val >= 1990 && val <= 2035) {
      return `${val}-01-01`;
    }
    // Số serial ngày tháng của Excel (VD: 39888 -> khoảng năm 2009)
    if (val >= 25569 && val <= 60000) {
      try {
        const dObj = XLSX.SSF.parse_date_code(val);
        if (dObj && dObj.y > 1900 && dObj.y < 2100) {
          return `${dObj.y}-${String(dObj.m).padStart(2, '0')}-${String(dObj.d).padStart(2, '0')}`;
        }
      } catch {
        try {
          const utcDays = Math.floor(val - 25569);
          const date = new Date(utcDays * 86400 * 1000);
          if (!isNaN(date.getTime()) && date.getUTCFullYear() > 1980 && date.getUTCFullYear() < 2035) {
            const y = date.getUTCFullYear();
            const m = String(date.getUTCMonth() + 1).padStart(2, '0');
            const d = String(date.getUTCDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
          }
        } catch {
          // Bỏ qua
        }
      }
    }
  }

  let s = String(val).replace(/\u00a0/g, ' ').trim();
  if (!s) return `${defaultYear}-01-01`;

  // Dạng có kèm ngoặc đã giải mã: "39888 (2009-03-15)"
  const parenMatch = s.match(/\((\d{4}-\d{2}-\d{2})\)/);
  if (parenMatch) return parenMatch[1];

  // Cắt bỏ phần giờ phút nếu có (VD: "15/03/2009 00:00:00" hoặc "2009-03-15T00:00:00.000Z")
  s = s.replace(/T\d{2}:\d{2}.*$/, '').replace(/\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?.*$/, '').trim();

  // Định dạng YYYY-MM-DD hoặc YYYY/MM/DD hoặc YYYY.MM.DD
  const ymdMatch = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Định dạng DD/MM/YYYY hoặc DD-MM-YYYY hoặc DD.MM.YYYY
  const dmyMatch = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    let d = parseInt(dmyMatch[1], 10);
    let m = parseInt(dmyMatch[2], 10);
    const y = dmyMatch[3];
    // Kiểm tra hoán đổi nếu file bị đảo MM/DD/YYYY
    if (d <= 12 && m > 12) {
      const temp = d;
      d = m;
      m = temp;
    }
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // Định dạng 2 chữ số năm: DD/MM/YY hoặc DD-MM-YY (VD: 15/03/09 -> 2009-03-15)
  const dmy2Match = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/);
  if (dmy2Match) {
    const d = dmy2Match[1].padStart(2, '0');
    const m = dmy2Match[2].padStart(2, '0');
    const yy = parseInt(dmy2Match[3], 10);
    const y = yy < 50 ? 2000 + yy : 1900 + yy;
    return `${y}-${m}-${d}`;
  }

  // Văn bản tự nhiên: "ngày 15 tháng 3 năm 2009" hoặc "15 thg 3, 2009"
  const vnMatch = s.match(/(?:ngày\s+)?(\d{1,2})\s*(?:tháng|thg|\/|-)\s*(\d{1,2})\s*(?:năm|\/|-)?\s*(\d{4})/i);
  if (vnMatch) {
    return `${vnMatch[3]}-${vnMatch[2].padStart(2, '0')}-${vnMatch[1].padStart(2, '0')}`;
  }

  // Chỉ có Ngày và Tháng: DD/MM (VD: "15/03") -> ghép với defaultYear
  const dmOnly = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})$/);
  if (dmOnly) {
    return `${defaultYear}-${dmOnly[2].padStart(2, '0')}-${dmOnly[1].padStart(2, '0')}`;
  }

  // Chỉ có năm sinh: YYYY (VD: "2009")
  const yearOnlyMatch = s.match(/^(\d{4})$/);
  if (yearOnlyMatch) {
    return `${yearOnlyMatch[1]}-01-01`;
  }

  return `${defaultYear}-01-01`;
}

/**
 * Định dạng ngày sinh ISO (YYYY-MM-DD) sang định dạng hiển thị sư phạm quen thuộc (DD/MM/YYYY)
 */
export function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== 'string') return '--';
  const clean = dateStr.trim();
  if (!clean || clean === '--') return '--';

  // Nếu đã là DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
    const parts = clean.split('/');
    return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
  }

  // Nếu là ISO YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[3].padStart(2, '0')}/${isoMatch[2].padStart(2, '0')}/${isoMatch[1]}`;
  }

  return clean;
}

/**
 * Chuẩn hóa số điện thoại phụ huynh / học sinh (đảm bảo đủ 10 số bắt đầu bằng 0, xử lý nhiều số, nhãn Bố/Mẹ)
 */
export function normalizeVietnamesePhone(val: any): string {
  if (val === undefined || val === null || val === '') return '';
  const rawStr = String(val).replace(/\u00a0/g, ' ').trim();
  if (!rawStr) return '';

  // Regex nhận diện cụm số điện thoại di động Việt Nam (cho phép có dấu cách, chấm, gạch ngang)
  // Các đầu số di động hiện hành: 03, 05, 07, 08, 09 (10 số)
  const mobileRegex = /(?<!\d)(?:(?:\+?84|0)[\s\.-]?)?([35789](?:[\s\.-]?\d){8})(?!\d)/g;
  const landlineRegex = /(?<!\d)(?:(?:\+?84|0)[\s\.-]?)?(2\d(?:[\s\.-]?\d){8})(?!\d)/g;

  const matches: { coreNumber: string; label: string }[] = [];
  let m: RegExpExecArray | null;

  while ((m = mobileRegex.exec(rawStr)) !== null) {
    const coreDigits = '0' + m[1].replace(/[\s\.-]/g, '');
    const startIdx = m.index;
    const endIdx = mobileRegex.lastIndex;

    const prefix = rawStr.substring(Math.max(0, startIdx - 16), startIdx);
    const suffix = rawStr.substring(endIdx, Math.min(rawStr.length, endIdx + 16));

    let label = '';
    const labelMatch = (prefix + ' ' + suffix).match(
      /(?:^|[^\p{L}\p{N}])(bố|mẹ|ba|má|phụ huynh|ph|cha|mẹ hs|bố hs|anh|chị)(?:$|[^\p{L}\p{N}])/iu
    );
    if (labelMatch) {
      const rawLabel = labelMatch[1].trim();
      label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
    }
    matches.push({ coreNumber: coreDigits, label });
  }

  // Nếu không thấy số di động, quét đầu số cố định (02x)
  if (matches.length === 0) {
    while ((m = landlineRegex.exec(rawStr)) !== null) {
      const coreDigits = '0' + m[1].replace(/[\s\.-]/g, '');
      matches.push({ coreNumber: coreDigits, label: '' });
    }
  }

  // Trường hợp không bắt được regex trên nhưng có chuỗi số thuần do Excel cắt số 0
  if (matches.length === 0) {
    const digits = rawStr.replace(/[^\d]/g, '');
    if (/^[35789]\d{8}$/.test(digits)) {
      return '0' + digits;
    }
    if (/^0[35789]\d{8}$/.test(digits)) {
      return digits;
    }
    if (digits.length >= 9 && digits.length <= 11) {
      return digits.startsWith('0') ? digits : '0' + digits;
    }
    return rawStr;
  }

  // Khử trùng lặp số điện thoại
  const unique: { coreNumber: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const item of matches) {
    if (!seen.has(item.coreNumber)) {
      seen.add(item.coreNumber);
      unique.push(item);
    }
  }

  if (unique.length === 1) {
    return unique[0].label ? `${unique[0].coreNumber} (${unique[0].label})` : unique[0].coreNumber;
  }

  return unique
    .map((item) => (item.label ? `${item.coreNumber} (${item.label})` : item.coreNumber))
    .join(' / ');
}

/**
 * Kiểm tra xem chuỗi có chứa số điện thoại hợp lệ không
 */
export function isValidVietnamesePhone(phone?: string | null): boolean {
  if (!phone) return false;
  return /(?<!\d)0[35789]\d{8}(?!\d)/.test(phone.replace(/[\s\.-]/g, ''));
}

/**
 * Định dạng số điện thoại hiển thị đẹp mắt (0987 654 321)
 */
export function formatPhoneDisplay(phone?: string | null): string {
  if (!phone) return '--';
  const clean = phone.trim();
  // Nếu có dạng đơn 10 chữ số 0xxxxxxxxx
  if (/^0[35789]\d{8}$/.test(clean)) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
  }
  return clean;
}

/**
 * Suy đoán giới tính theo tên đệm người Việt nếu file Excel không ghi rõ
 */
export function inferVietnameseGender(fullName: string): 'Nam' | 'Nữ' {
  const lower = fullName.toLowerCase().trim();

  // Các từ đệm đặc trưng nữ
  const femalePatterns = /\b(thị|nhi|ngọc|hương|hoa|lan|mai|thảo|linh|trang|quỳnh|ngân|hà|hằng|tuyết|yến|diệu|bích|hồng|thu|vân|liên|thoa|nụ|đào|oanh|vy|khánh vy|phương vy|thùy|loan)\b/i;
  // Các từ đệm đặc trưng nam
  const malePatterns = /\b(văn|hữu|đức|quang|minh|hoàng|tuấn|tiến|bảo|duy|huy|nam|phong|thành|hải|khánh|việt|quân|trung|kiên|bách|tùng|đạt|khoa|nghĩa|trọng|công|long|dũng|phúc)\b/i;

  if (/\bthị\b/i.test(lower)) return 'Nữ';
  if (/\bvăn\b/i.test(lower)) return 'Nam';

  if (femalePatterns.test(lower)) return 'Nữ';
  if (malePatterns.test(lower)) return 'Nam';

  return 'Nam';
}

/**
 * Chuẩn bị dữ liệu bảng Excel được định dạng sạch và có chú thích để gửi cho AI Gemini phân tích
 */
export function prepareExcelTextForAI(rows: any[][], sheetName: string = ''): string {
  if (!rows || rows.length === 0) return '';

  const cleanRows: string[] = [];
  cleanRows.push(`[TÀI LIỆU EXCEL DANH SÁCH LỚP HỌC - TRANG TÍNH: ${sheetName || 'Chính'}]`);
  cleanRows.push(`Tổng số hàng: ${rows.length}`);
  cleanRows.push('---');

  const maxRowsToInclude = Math.min(rows.length, 120);
  for (let r = 0; r < maxRowsToInclude; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const formattedRow = row.map((cell) => {
      if (cell === null || cell === undefined) return '';
      if (typeof cell === 'number') {
        // Kiểm tra nếu là mã ngày tháng Excel
        if (cell > 30000 && cell < 50000) {
          try {
            const dateStr = parseExcelDate(cell);
            return `${cell} (${dateStr})`;
          } catch {
            return String(cell);
          }
        }
      }
      return String(cell).replace(/\r?\n|\r/g, ' ').trim();
    });

    // Chỉ lấy các hàng có ít nhất 1 ô không rỗng
    if (formattedRow.some((c) => c.length > 0)) {
      cleanRows.push(`Hàng ${r + 1}: ${formattedRow.join(' | ')}`);
    }
  }

  return cleanRows.join('\n');
}

/**
 * Phân tích trực tiếp tệp Excel / CSV của các trường phổ thông tại Việt Nam (vnEdu, SMAS, CSDL ngành, Excel mẫu...)
 */
export function parseExcelRoster(
  buffer: ArrayBuffer | Uint8Array,
  targetGrade: string = '10',
  specificSheet?: string
): ExcelParseResult {
  const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });

  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('Tệp Excel không chứa trang tính (sheet) nào.');
  }

  // Chọn trang tính
  let targetSheetName = specificSheet && sheetNames.includes(specificSheet) ? specificSheet : sheetNames[0];

  // Ưu tiên sheet có chứa tên lớp hoặc từ "danh sách"
  if (!specificSheet) {
    const matchedSheet = sheetNames.find((s) => {
      const lower = s.toLowerCase();
      return (
        lower.includes('10a') ||
        lower.includes('10') ||
        lower.includes('danh sách') ||
        lower.includes('ds') ||
        lower.includes('hoc sinh') ||
        lower.includes('lớp')
      );
    });
    if (matchedSheet) {
      targetSheetName = matchedSheet;
    }
  }

  const worksheet = workbook.Sheets[targetSheetName];
  if (!worksheet) {
    throw new Error(`Không tìm thấy trang tính "${targetSheetName}".`);
  }

  // Chuyển đổi sheet thành mảng 2 chiều các ô dữ liệu
  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!rows || rows.length === 0) {
    throw new Error(`Trang tính "${targetSheetName}" không có dữ liệu.`);
  }

  // Phát hiện tên lớp học từ các dòng đầu trang tính
  let detectedClassName = '';
  for (let r = 0; r < Math.min(rows.length, 12); r++) {
    const rowStr = rows[r].join(' ');
    const match = rowStr.match(/lớp\s*[:\-\s]*([0-9]{1,2}\s*[A-Za-z0-9_.-]+)/i);
    if (match) {
      detectedClassName = match[1].replace(/\s+/g, '').toUpperCase();
      break;
    }
  }

  if (!detectedClassName) {
    const sheetClassMatch = targetSheetName.match(/([0-9]{1,2}\s*[A-Za-z0-9_.-]+)/);
    if (sheetClassMatch) {
      detectedClassName = sheetClassMatch[1].replace(/\s+/g, '').toUpperCase();
    }
  }

  // Cấu trúc nhận diện cột
  let headerRowIndex = -1;
  const colMap = {
    stt: -1,
    studentCode: -1,
    fullName: -1,
    firstName: -1, // Họ và đệm
    lastName: -1,  // Tên
    gender: -1,
    genderNam: -1, // Cột riêng Nam
    genderNu: -1,  // Cột riêng Nữ
    dob: -1,       // Cột Ngày sinh (hoặc Ngày tháng)
    dobDay: -1,    // Cột Ngày
    dobMonth: -1,  // Cột Tháng
    dobYear: -1,   // Cột Năm sinh
    parentPhone: -1, // Cột SĐT Phụ huynh
    phone: -1,       // Cột SĐT chung
    notes: -1,
  };

  let maxScore = 0;

  // Quét tìm dòng header (kiểm tra cả dòng đơn và dòng kết hợp 2 tầng như vnEdu)
  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    const currentRow = rows[r].map((c) => String(c).trim().toLowerCase());
    const nextRow = rows[r + 1] ? rows[r + 1].map((c) => String(c).trim().toLowerCase()) : [];

    let score = 0;
    const tempMap = {
      stt: -1,
      studentCode: -1,
      fullName: -1,
      firstName: -1,
      lastName: -1,
      gender: -1,
      genderNam: -1,
      genderNu: -1,
      dob: -1,
      dobDay: -1,
      dobMonth: -1,
      dobYear: -1,
      parentPhone: -1,
      phone: -1,
      notes: -1,
    };

    const maxCols = Math.max(currentRow.length, nextRow.length);
    for (let cIdx = 0; cIdx < maxCols; cIdx++) {
      const cell1 = currentRow[cIdx] || '';
      const cell2 = nextRow[cIdx] || '';
      const combinedCell = `${cell1} ${cell2}`.trim();

      // STT
      if (cell1 === 'stt' || cell1 === 'số tt' || cell1 === 'số thứ tự' || cell1 === 'no' || cell1 === 'no.' || cell2 === 'stt') {
        tempMap.stt = cIdx;
        score += 2;
      }
      // Họ và tên trọn vẹn
      else if (
        cell1 === 'họ và tên' || cell1 === 'họ tên' || cell1 === 'họ và tên học sinh' ||
        cell1 === 'tên học sinh' || cell1 === 'ho va ten' || cell1 === 'ho ten'
      ) {
        tempMap.fullName = cIdx;
        score += 5;
      }
      // Họ và đệm riêng
      else if (
        cell1 === 'họ đệm' || cell1 === 'họ và đệm' || cell1 === 'họ và chữ đệm' ||
        cell1 === 'họ lót' || cell1 === 'họ' || cell2 === 'họ đệm' || cell2 === 'họ và đệm' ||
        cell2 === 'họ và chữ đệm' || cell2 === 'họ' || combinedCell.includes('họ đệm')
      ) {
        tempMap.firstName = cIdx;
        score += 4;
      }
      // Tên riêng
      else if (cell1 === 'tên' || cell1 === 'tên gọi' || cell1 === 'ten' || cell2 === 'tên' || cell2 === 'tên gọi' || cell2 === 'ten') {
        tempMap.lastName = cIdx;
        score += 4;
      }
      // Mã học sinh / định danh
      else if (
        cell1 === 'mã hs' || cell1 === 'mã học sinh' || cell1 === 'mã định danh' ||
        cell1 === 'mã số' || cell1 === 'sbd' || cell1 === 'ma hs' || cell1 === 'ma dinh danh' ||
        cell2 === 'mã hs' || cell2 === 'mã học sinh' || cell2 === 'mã định danh'
      ) {
        tempMap.studentCode = cIdx;
        score += 3;
      }
      // Giới tính
      else if (cell1 === 'giới tính' || cell1 === 'phái' || cell1 === 'gt' || cell1 === 'gioi tinh' || cell2 === 'giới tính') {
        tempMap.gender = cIdx;
        score += 2;
      } else if (cell1 === 'nam' || cell2 === 'nam') {
        tempMap.genderNam = cIdx;
        score += 1;
      } else if (cell1 === 'nữ' || cell1 === 'nu' || cell2 === 'nữ' || cell2 === 'nu') {
        tempMap.genderNu = cIdx;
        score += 1;
      }
      // Ngày sinh & Năm sinh
      else if (
        cell1 === 'năm sinh' || cell1 === 'nam sinh' || cell1 === 'năm' ||
        cell2 === 'năm sinh' || cell2 === 'nam sinh'
      ) {
        tempMap.dobYear = cIdx;
        score += 3;
      } else if (cell1 === 'ngày' || cell2 === 'ngày') {
        tempMap.dobDay = cIdx;
        score += 2;
      } else if (cell1 === 'tháng' || cell2 === 'tháng') {
        tempMap.dobMonth = cIdx;
        score += 2;
      } else if (
        cell1.includes('ngày sinh') || cell1.includes('ngày tháng năm sinh') ||
        cell1.includes('ngày, tháng, năm sinh') || cell1 === 'ns' || cell1 === 'dob' ||
        cell1 === 'ngay sinh' || cell2.includes('ngày sinh') || cell2.includes('ngày tháng')
      ) {
        tempMap.dob = cIdx;
        score += 4;
      }
      // Số điện thoại (Ưu tiên nhận diện cột SĐT Phụ huynh)
      else if (
        cell1.includes('phụ huynh') || cell1.includes('cha mẹ') || cell1.includes('bố') ||
        cell1.includes('mẹ') || cell1.includes('sđt ph') || cell1.includes('đt ph') ||
        cell2.includes('phụ huynh') || cell2.includes('cha mẹ') || cell2.includes('sđt ph')
      ) {
        tempMap.parentPhone = cIdx;
        tempMap.phone = cIdx;
        score += 4;
      } else if (
        cell1.includes('sđt') || cell1.includes('điện thoại') || cell1.includes('phone') ||
        cell1.includes('đt') || cell1.includes('liên hệ') || cell1.includes('liên lạc') ||
        cell1.includes('sdt') || cell1.includes('mobile') || cell1.includes('tel') ||
        cell2.includes('sđt') || cell2.includes('điện thoại')
      ) {
        if (tempMap.phone === -1) {
          tempMap.phone = cIdx;
          score += 3;
        }
      }
      // Ghi chú
      else if (
        cell1.includes('ghi chú') || cell1.includes('hạnh kiểm') || cell1.includes('nơi sinh') ||
        cell1.includes('địa chỉ') || cell1.includes('ghi chu') || cell2.includes('ghi chú')
      ) {
        tempMap.notes = cIdx;
        score += 1;
      }
    }

    const hasNameCol = tempMap.fullName !== -1 || tempMap.firstName !== -1 || tempMap.lastName !== -1;
    if (score > maxScore && hasNameCol) {
      maxScore = score;
      // Nếu hàng kế tiếp (nextRow) chứa từ khóa con của header (như "tên", "nữ", "tháng"), thì header là 2 hàng
      const isTwoRowHeader =
        nextRow.some((c) => c === 'tên' || c === 'nam' || c === 'nữ' || c === 'ngày' || c === 'tháng') &&
        currentRow.some((c) => c.includes('họ') || c.includes('giới tính') || c.includes('ngày sinh'));

      headerRowIndex = isTwoRowHeader ? r + 1 : r;
      Object.assign(colMap, tempMap);
    }
  }

  // Fallback nếu không quét được header rõ ràng
  if (headerRowIndex === -1) {
    for (let r = 0; r < Math.min(rows.length, 15); r++) {
      const row = rows[r];
      const filledCells = row.filter((c) => String(c).trim().length > 0);
      if (filledCells.length >= 2) {
        const nextRow = rows[r + 1];
        if (nextRow && nextRow.some((c) => /^[A-ZÀ-Ỹa-zà-ỹ\s]{3,}$/.test(String(c).trim()))) {
          headerRowIndex = r;
          colMap.fullName = 1;
          colMap.stt = 0;
          break;
        }
      }
    }
  }

  if (headerRowIndex === -1) {
    throw new Error(
      'Không thể xác định cấu trúc cột trong tệp Excel. Vui lòng đảm bảo bảng danh sách có cột "Họ và tên" hoặc "Họ đệm" và "Tên".'
    );
  }

  // Bắt đầu đọc danh sách học sinh từ các dòng bên dưới header
  const students: ParsedStudentItem[] = [];
  const defaultYear = 2024 - (parseInt(targetGrade, 10) || 10) - 5; // Lớp 10 khoảng 2009

  const skipWords = [
    'tổng',
    'tổng số',
    'tổng cộng',
    'giáo viên',
    'hiệu trưởng',
    'người lập',
    'kế toán',
    'ghi chú',
    'thống kê',
    'chữ ký',
    'xác nhận',
    'ban giám hiệu',
    'học sinh giỏi',
  ];

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    // Trích xuất Họ và tên (xử lý ghép 2 cột "Họ và đệm" + "Tên" chuẩn xác theo vnEdu/SMAS)
    let fullName = '';

    if (colMap.firstName !== -1 && colMap.lastName !== -1) {
      const first = String(row[colMap.firstName] || '').trim();
      const last = String(row[colMap.lastName] || '').trim();
      fullName = `${first} ${last}`.trim();
    } else if (colMap.fullName !== -1) {
      fullName = String(row[colMap.fullName] || '').trim();
      // Nếu có cột Tên ngay bên cạnh mà trong cột Họ Tên chưa chứa Tên đó
      if (colMap.lastName !== -1 && row[colMap.lastName]) {
        const last = String(row[colMap.lastName]).trim();
        if (last && !fullName.endsWith(last)) {
          fullName = `${fullName} ${last}`.trim();
        }
      }
    } else if (colMap.firstName !== -1 && row[colMap.firstName]) {
      fullName = String(row[colMap.firstName]).trim();
    } else if (colMap.lastName !== -1 && row[colMap.lastName]) {
      fullName = String(row[colMap.lastName]).trim();
    }

    if (!fullName) continue;

    // Loại trừ dòng tổng kết, thống kê hoặc tiêu đề lặp lại
    const lowerName = fullName.toLowerCase();
    if (skipWords.some((w) => lowerName.startsWith(w) || lowerName.includes('tổng số:'))) {
      continue;
    }
    if (lowerName === 'họ và tên' || lowerName === 'stt' || lowerName === 'tên học sinh' || lowerName === 'họ đệm') {
      continue;
    }
    if (/^\d+$/.test(fullName)) {
      continue;
    }

    // STT
    let stt = students.length + 1;
    if (colMap.stt !== -1 && row[colMap.stt] !== undefined && row[colMap.stt] !== '') {
      const parsedStt = parseInt(String(row[colMap.stt]).trim(), 10);
      if (!isNaN(parsedStt) && parsedStt > 0) {
        stt = parsedStt;
      }
    }

    // Mã học sinh
    let studentCode = `HS${targetGrade}${String(students.length + 1).padStart(2, '0')}`;
    if (colMap.studentCode !== -1 && row[colMap.studentCode]) {
      const c = String(row[colMap.studentCode]).trim();
      if (c && c.length >= 2 && !c.includes(' ')) {
        studentCode = c;
      }
    }

    // Giới tính
    let gender: 'Nam' | 'Nữ' = 'Nam';
    if (colMap.gender !== -1 && row[colMap.gender] !== undefined && row[colMap.gender] !== '') {
      const gStr = String(row[colMap.gender]).trim().toLowerCase();
      if (
        gStr.includes('nữ') ||
        gStr.includes('nu') ||
        gStr === 'f' ||
        gStr === '0' ||
        gStr.includes('gái') ||
        gStr.includes('female')
      ) {
        gender = 'Nữ';
      } else {
        gender = 'Nam';
      }
    } else if (colMap.genderNam !== -1 || colMap.genderNu !== -1) {
      // Trường học thường dùng cột Nam và cột Nữ riêng với dấu x, 1 hoặc v
      const nuVal = colMap.genderNu !== -1 ? String(row[colMap.genderNu] || '').trim().toLowerCase() : '';
      const namVal = colMap.genderNam !== -1 ? String(row[colMap.genderNam] || '').trim().toLowerCase() : '';

      const isNuCell = nuVal === 'x' || nuVal === '1' || nuVal === 'v' || nuVal.includes('nữ');
      const isNamCell = namVal === 'x' || namVal === '1' || namVal === 'v' || namVal.includes('nam');

      if (isNuCell && !isNamCell) {
        gender = 'Nữ';
      } else if (isNamCell && !isNuCell) {
        gender = 'Nam';
      } else if (nuVal.length > 0 && namVal.length === 0) {
        gender = 'Nữ';
      } else {
        gender = inferVietnameseGender(fullName);
      }
    } else {
      gender = inferVietnameseGender(fullName);
    }

    // Ngày sinh học sinh
    let dob = `${defaultYear}-01-01`;
    // Trường hợp 1: Có cả cột Ngày sinh (chứa ngày/tháng vd: 15/03) và cột Năm sinh riêng (vd: 2009)
    if (colMap.dob !== -1 && colMap.dobYear !== -1 && row[colMap.dobYear]) {
      const yRaw = String(row[colMap.dobYear] || '').trim();
      const yMatch = yRaw.match(/\b(19\d{2}|20\d{2})\b/);
      const targetYear = yMatch ? parseInt(yMatch[1], 10) : defaultYear;

      const dobVal = row[colMap.dob];
      if (dobVal !== undefined && dobVal !== null && dobVal !== '') {
        dob = parseExcelDate(dobVal, targetYear);
      } else {
        dob = `${targetYear}-01-01`;
      }
    }
    // Trường hợp 2: Có cột tách riêng Ngày, Tháng, Năm sinh
    else if (colMap.dobYear !== -1 && row[colMap.dobYear] && (colMap.dobDay !== -1 || colMap.dobMonth !== -1)) {
      const yRaw = String(row[colMap.dobYear] || '').trim();
      const yMatch = yRaw.match(/\b(19\d{2}|20\d{2})\b/);
      const yVal = yMatch ? yMatch[1] : String(defaultYear);

      const mRaw = colMap.dobMonth !== -1 && row[colMap.dobMonth] !== undefined ? String(row[colMap.dobMonth]).trim() : '1';
      const dRaw = colMap.dobDay !== -1 && row[colMap.dobDay] !== undefined ? String(row[colMap.dobDay]).trim() : '1';

      const mNum = parseInt(mRaw, 10);
      const dNum = parseInt(dRaw, 10);

      const mStr = !isNaN(mNum) && mNum >= 1 && mNum <= 12 ? String(mNum).padStart(2, '0') : '01';
      const dStr = !isNaN(dNum) && dNum >= 1 && dNum <= 31 ? String(dNum).padStart(2, '0') : '01';
      dob = `${yVal}-${mStr}-${dStr}`;
    }
    // Trường hợp 3: Cột Ngày sinh hoàn chỉnh
    else if (colMap.dob !== -1 && row[colMap.dob] !== undefined && row[colMap.dob] !== '') {
      dob = parseExcelDate(row[colMap.dob], defaultYear);
    }
    // Trường hợp 4: Chỉ có cột Năm sinh
    else if (colMap.dobYear !== -1 && row[colMap.dobYear] !== undefined && row[colMap.dobYear] !== '') {
      dob = parseExcelDate(row[colMap.dobYear], defaultYear);
    }

    // Số điện thoại liên hệ (ưu tiên SĐT Phụ huynh)
    let phone = '';
    const phoneIdx = colMap.parentPhone !== -1 ? colMap.parentPhone : colMap.phone;
    if (phoneIdx !== -1 && row[phoneIdx] !== undefined && row[phoneIdx] !== '') {
      phone = normalizeVietnamesePhone(row[phoneIdx]);
    }

    // Ghi chú
    let notes = '';
    if (colMap.notes !== -1 && row[colMap.notes] !== undefined && row[colMap.notes] !== '') {
      notes = String(row[colMap.notes]).trim();
    }

    students.push({
      stt,
      studentCode,
      fullName,
      gender,
      dateOfBirth: dob,
      parentPhone: phone || undefined,
      notes: notes || undefined,
    });
  }

  if (students.length === 0) {
    throw new Error(
      `Không đọc được học sinh nào từ trang tính "${targetSheetName}". Vui lòng kiểm tra lại nội dung tệp Excel.`
    );
  }

  return {
    sheetNames,
    activeSheet: targetSheetName,
    classNameDetected: detectedClassName || undefined,
    students,
    totalRowsRead: rows.length,
  };
}
