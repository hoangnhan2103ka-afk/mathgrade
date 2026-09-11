import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Chưa cấu hình GEMINI_API_KEY trong hệ thống. Vui lòng thêm khóa trong Settings > Secrets.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function isAuthError(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.code;
  const msg = typeof err.message === "string" ? err.message : JSON.stringify(err);
  return (
    status === 401 ||
    msg.includes("401") ||
    msg.includes("UNAUTHENTICATED") ||
    msg.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED") ||
    msg.includes("invalid authentication credentials")
  );
}

// Danh sách mô hình AI theo thứ tự ưu tiên độ ổn định và tốc độ phản hồi
const RECOMMENDED_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.8-flash",
  "gemini-2.5-flash",
];

async function generateWithGeminiFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
    preferredModels?: string[];
  }
) {
  const models = params.preferredModels || RECOMMENDED_MODELS;
  let lastError: any = null;

  for (const model of models) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      if (res && res.text) {
        return { response: res, modelUsed: model };
      }
    } catch (err: any) {
      lastError = err;

      // Nếu là lỗi xác thực 401 UNAUTHENTICATED (do token/key không hợp lệ), dừng ngay lập tức
      // không lặp vô ích qua các mô hình khác để tránh spam log lỗi
      if (isAuthError(err)) {
        console.warn(
          `Lỗi xác thực Gemini API (401 UNAUTHENTICATED) với mô hình ${model}: Khóa GEMINI_API_KEY chưa hợp lệ hoặc chưa cấp quyền Generative Language.`
        );
        throw new Error(
          "Khóa Gemini API (GEMINI_API_KEY) hiện tại chưa được xác thực hoặc không hợp lệ (mã lỗi 401: ACCESS_TOKEN_TYPE_UNSUPPORTED). Vui lòng cấu hình khóa API hợp lệ trong mục Settings > Secrets của AI Studio."
        );
      }

      const is503OrRateLimit =
        err?.status === 503 ||
        err?.status === 429 ||
        err?.message?.includes("503") ||
        err?.message?.includes("UNAVAILABLE") ||
        err?.message?.includes("high demand") ||
        err?.message?.includes("RESOURCE_EXHAUSTED");

      if (is503OrRateLimit) {
        console.info(`Mô hình ${model} đang bận (${err.status || 503}), tự động chuyển sang mô hình dự phòng kế tiếp...`);
      } else {
        console.warn(`Lỗi gọi mô hình ${model}:`, err.message || err);
      }
    }
  }

  throw lastError || new Error("Không thể nhận phản hồi từ các mô hình AI.");
}

/**
 * Trích xuất dự phòng danh sách học sinh từ nội dung văn bản / CSV nếu AI chưa sẵn sàng
 */
function parseTextRosterFallback(text: string, grade: string = "10") {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const students: any[] = [];
  const defaultYear = 2024 - (parseInt(grade, 10) || 10) - 5;
  let detectedClass = "";

  // Tìm tên lớp trong các dòng đầu
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const m = lines[i].match(/\b(10A\d+|11A\d+|12A\d+|10[A-Z]\d*|11[A-Z]\d*|12[A-Z]\d*)\b/i);
    if (m) {
      detectedClass = m[1].toUpperCase();
      break;
    }
  }

  // Lọc và duyệt qua các dòng dữ liệu
  let currentStt = 1;
  for (const line of lines) {
    if (line.startsWith("[TÀI LIỆU") || line.startsWith("Tổng số") || line.startsWith("---")) continue;

    // Dạng 1: "Hàng X: cell1 | cell2 | cell3..."
    let cleanLine = line;
    if (/^Hàng\s+\d+:\s*/i.test(cleanLine)) {
      cleanLine = cleanLine.replace(/^Hàng\s+\d+:\s*/i, "");
    }

    const cells = cleanLine.includes("|")
      ? cleanLine.split("|").map((c) => c.trim())
      : cleanLine.includes("\t")
      ? cleanLine.split("\t").map((c) => c.trim())
      : cleanLine.split(",").map((c) => c.trim());

    if (cells.length < 2) continue;

    // Bỏ qua dòng tiêu đề
    const combinedStr = cells.join(" ").toLowerCase();
    if (
      combinedStr.includes("họ và tên") ||
      combinedStr.includes("họ tên") ||
      combinedStr.includes("ngày sinh") ||
      combinedStr.includes("giới tính") ||
      combinedStr.includes("học sinh") ||
      combinedStr.includes("stt")
    ) {
      continue;
    }

    // Tìm ô có họ tên tiếng Việt
    let fullName = "";
    let gender = "Nam";
    let dob = `${defaultYear}-01-01`;
    let hasCustomDob = false;
    let phone: string | undefined = undefined;

    // Phân tích các ô
    for (let c = 0; c < cells.length; c++) {
      const cell = cells[c];
      if (!cell) continue;

      // Tìm ngày sinh (YYYY-MM-DD hoặc DD/MM/YYYY hoặc DD-MM-YYYY hoặc DD.MM.YYYY)
      if (!hasCustomDob) {
        const isoMatch = cell.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
        if (isoMatch) {
          dob = `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
          hasCustomDob = true;
          continue;
        }

        const dmyMatch = cell.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
        if (dmyMatch) {
          let d = parseInt(dmyMatch[1], 10);
          let m = parseInt(dmyMatch[2], 10);
          const y = dmyMatch[3];
          if (d <= 12 && m > 12) {
            const temp = d;
            d = m;
            m = temp;
          }
          dob = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          hasCustomDob = true;
          continue;
        }

        const dmy2Match = cell.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/);
        if (dmy2Match) {
          const d = dmy2Match[1].padStart(2, "0");
          const m = dmy2Match[2].padStart(2, "0");
          const yy = parseInt(dmy2Match[3], 10);
          const y = yy < 50 ? 2000 + yy : 1900 + yy;
          dob = `${y}-${m}-${d}`;
          hasCustomDob = true;
          continue;
        }

        const dmOnlyMatch = cell.match(/^(\d{1,2})[\/\-\.](\d{1,2})$/);
        if (dmOnlyMatch) {
          dob = `${defaultYear}-${dmOnlyMatch[2].padStart(2, "0")}-${dmOnlyMatch[1].padStart(2, "0")}`;
          hasCustomDob = true;
          continue;
        }

        const yearMatch = cell.match(/\b(19\d{2}|20\d{2})\b/);
        if (yearMatch && !cell.includes(" ") && cell.length === 4) {
          dob = `${yearMatch[1]}-01-01`;
          hasCustomDob = true;
          continue;
        }
      }

      // Giới tính
      if (/^(Nam|Nữ|Nu)$/i.test(cell)) {
        gender = /^N/i.test(cell) && !/^Nam$/i.test(cell) ? "Nữ" : "Nam";
        continue;
      }

      // Số điện thoại (chuẩn hóa đầu số di động 10 số, nhận diện Bố/Mẹ nếu có)
      if (!phone) {
        const mobileRegex = /(?<!\d)(?:(?:\+?84|0)[\s\.-]?)?([35789](?:[\s\.-]?\d){8})(?!\d)/g;
        const matches: { num: string; label: string }[] = [];
        let pMatch: RegExpExecArray | null;
        while ((pMatch = mobileRegex.exec(cell)) !== null) {
          const core = '0' + pMatch[1].replace(/[\s\.-]/g, '');
          const prefix = cell.substring(Math.max(0, pMatch.index - 15), pMatch.index);
          const suffix = cell.substring(mobileRegex.lastIndex, Math.min(cell.length, mobileRegex.lastIndex + 15));
          const lMatch = (prefix + ' ' + suffix).match(/(?:^|[^\p{L}\p{N}])(bố|mẹ|ba|má|phụ huynh|ph|cha)(?:$|[^\p{L}\p{N}])/iu);
          const label = lMatch ? lMatch[1].trim().charAt(0).toUpperCase() + lMatch[1].trim().slice(1) : '';
          matches.push({ num: core, label });
        }

        if (matches.length > 0) {
          phone = matches.map(item => item.label ? `${item.num} (${item.label})` : item.num).join(' / ');
          continue;
        }

        const digits = cell.replace(/[^\d]/g, "");
        if (digits.length >= 9 && digits.length <= 11 && !/^(19|20)\d{2}/.test(digits)) {
          phone = digits.startsWith("0") ? digits : "0" + digits;
          continue;
        }
      }

      // Nhận diện họ tên (chứa chữ cái tiếng Việt, độ dài >= 4)
      if (!fullName && /[a-zA-ZÀ-ỹ]{2,}/.test(cell) && cell.length >= 4 && !/^\d+$/.test(cell)) {
        // Kiểm tra nếu ô kế tiếp là Tên (họ tên tách rời)
        if (c + 1 < cells.length && /^[a-zA-ZÀ-ỹ]{2,10}$/.test(cells[c + 1]) && !/^(Nam|Nữ)$/i.test(cells[c + 1])) {
          fullName = `${cell} ${cells[c + 1]}`.trim();
          c++;
        } else {
          fullName = cell.trim();
        }
      }
    }

    if (fullName && fullName.length > 2) {
      students.push({
        stt: currentStt,
        studentCode: `HS${grade}${String(currentStt).padStart(2, "0")}`,
        fullName,
        gender: gender === "Nữ" ? "Nữ" : "Nam",
        dateOfBirth: dob,
        parentPhone: phone,
      });
      currentStt++;
    }
  }

  return {
    classNameDetected: detectedClass,
    students,
  };
}

/**
 * Sinh lời nhận xét sư phạm bám sát Thông tư 22/2021/TT-BGDĐT khi AI chưa kết nối
 */
function generatePedagogicalComment(params: {
  student: any;
  score?: any;
  disciplineSummary?: any;
  classroom?: any;
  commentStyle?: string;
}) {
  const { student, score, disciplineSummary, classroom, commentStyle = "hoc_ba" } = params;
  const fullName = student?.fullName || "Học sinh";
  const nameParts = fullName.split(" ");
  const firstName = nameParts[nameParts.length - 1] || fullName;
  const gender = student?.gender === "Nữ" ? "em" : "em";

  // Ước tính điểm trung bình môn
  let avg = 7.5;
  if (typeof score?.calculatedAvg === "number") {
    avg = score.calculatedAvg;
  } else if (typeof score?.finalScore === "number" && typeof score?.midtermScore === "number") {
    avg = Math.round(((score.midtermScore * 2 + score.finalScore * 3) / 5) * 10) / 10;
  } else if (typeof score?.finalScore === "number") {
    avg = score.finalScore;
  } else if (typeof score?.midtermScore === "number") {
    avg = score.midtermScore;
  }

  const bonusCount = score?.boardBonusCount || 0;
  const absentOrLate = disciplineSummary?.absentOrLateCount || 0;
  const forgotHW = disciplineSummary?.forgotHomeworkCount || 0;
  const forgotCalc = disciplineSummary?.forgotCalculatorCount || 0;
  const notTakingNotes = disciplineSummary?.notTakingNotesCount || 0;

  // Xây dựng lời nhận xét theo từng phong cách
  let comment = "";
  const tags: string[] = [];

  if (avg >= 9.0) {
    tags.push("Học lực xuất sắc", "Tư duy toán tốt");
    if (commentStyle === "so_lien_lac") {
      comment = `Kính gửi phụ huynh: Em ${fullName} học tập xuất sắc môn Toán, tiếp thu bài nhanh và giải tốt các bài toán nâng cao. ${
        bonusCount > 0 ? `Em rất tích cực xung phong lên bảng (${bonusCount} lần được điểm thưởng). ` : ""
      }Gia đình tiếp tục động viên để em duy trì phong độ và bồi dưỡng thêm năng khiếu toán học.`;
    } else if (commentStyle === "khuyen_khich") {
      comment = `${firstName} có tố chất tư duy toán học rất sắc bén và phong độ học tập tuyệt vời! Hãy tiếp tục tự tin thử sức với các bài toán vận dụng cao và kỳ thi học sinh giỏi sắp tới nhé!`;
    } else if (commentStyle === "chi_tiet") {
      comment = `Học lực xuất sắc (ĐTB: ${avg}đ). Khả năng tư duy logic và biến đổi đại số, hình học rất chắc chắn. Ý thức học tập gương mẫu, bài làm tự luận trình bày khoa học, sạch đẹp. Tiếp tục phát huy thế mạnh để đạt thành tích cao hơn nữa.`;
    } else {
      // hoc_ba
      comment = `Tiếp thu bài xuất sắc, năng lực tư duy toán học vượt trội. Kỹ năng tính toán và giải toán vận dụng cao thành thạo, bài làm sạch đẹp. Ý thức học tập và kỷ luật nề nếp rất tốt.`;
    }
  } else if (avg >= 8.0) {
    tags.push("Học lực giỏi", "Nắm chắc kiến thức");
    if (commentStyle === "so_lien_lac") {
      comment = `Kính gửi phụ huynh: Em ${fullName} đạt kết quả giỏi môn Toán (ĐTB: ${avg}đ), nắm chắc kiến thức và chăm chỉ nghe giảng. ${
        forgotHW > 0 ? `Lưu ý nhắc nhở em hoàn thành bài tập về nhà đầy đủ hơn. ` : ""
      }Rất mong gia đình cùng đồng hành khích lệ em đạt kết quả cao hơn.`;
    } else if (commentStyle === "khuyen_khich") {
      comment = `${firstName} học rất tốt môn Toán và luôn có ý thức phấn đấu cao. Chỉ cần chú ý thêm một chút ở các bước biến đổi chi tiết, em hoàn toàn có thể chạm tới mức điểm tối đa!`;
    } else if (commentStyle === "chi_tiet") {
      comment = `Học lực giỏi (ĐTB: ${avg}đ). Nắm vững kiến thức trọng tâm đại số và hình học. Thao tác máy tính Casio thành thạo. ${
        bonusCount > 0 ? `Có tinh thần xây dựng bài sôi nổi (${bonusCount} lần lên bảng). ` : ""
      }Cần rèn luyện thêm tính cẩn thận trong các câu hỏi vận dụng.`;
    } else {
      comment = `Học lực giỏi, nắm vững kiến thức trọng tâm môn Toán. Kỹ năng vận dụng và trình bày bài giải tự luận tốt. Có tinh thần tự giác học tập và xây dựng bài tích cực.`;
    }
  } else if (avg >= 6.5) {
    tags.push("Học lực khá", "Có tiến bộ");
    if (commentStyle === "so_lien_lac") {
      comment = `Kính gửi phụ huynh: Em ${fullName} có học lực khá môn Toán, nắm được phương pháp giải các dạng toán cơ bản. ${
        forgotHW > 0 ? `Kính mong phụ huynh đôn đốc em làm BTVN trước khi đến lớp. ` : ""
      }${forgotCalc > 0 ? `Nhắc em mang máy tính cầm tay đầy đủ. ` : ""}Em hoàn toàn có khả năng tiến bộ lên mức giỏi nếu rèn luyện thêm.`;
    } else if (commentStyle === "khuyen_khich") {
      comment = `${firstName} tiếp thu bài khá tốt và đã có nhiều tiến bộ! Hãy chăm chỉ làm thêm bài tập rèn luyện và mạnh dạn hỏi thầy cô khi gặp bài khó, em sẽ bứt phá mạnh mẽ hơn.`;
    } else if (commentStyle === "chi_tiet") {
      comment = `Học lực khá (ĐTB: ${avg}đ). Đã giải quyết tốt các bài toán mức độ nhận biết và thông hiểu. Cần rèn thêm kỹ năng vẽ hình không gian và biến đổi hệ phương trình. Chú ý chuẩn bị bài kỹ trước giờ học.`;
    } else {
      comment = `Học lực khá, nắm được kiến thức và phương pháp giải toán cơ bản. Có ý thức học tập và lắng nghe bài giảng. Cần rèn luyện thêm kỹ năng tính toán và nâng cao khả năng tự học.`;
    }
  } else if (avg >= 5.0) {
    tags.push("Đạt yêu cầu", "Cần cố gắng");
    if (commentStyle === "so_lien_lac") {
      comment = `Kính gửi phụ huynh: Kết quả môn Toán của em ${fullName} ở mức đạt yêu cầu cơ bản. Để theo kịp chương trình, kính mong phụ huynh phối hợp sát sao nhắc nhở em làm bài tập và ôn lại công thức mỗi ngày.`;
    } else if (commentStyle === "khuyen_khich") {
      comment = `${firstName} cần nỗ lực nhiều hơn nhé! Đừng ngại trao đổi với thầy cô và bạn bè khi chưa hiểu bài. Cố gắng thêm từng ngày, em nhất định sẽ tiến bộ rõ rệt!`;
    } else if (commentStyle === "chi_tiet") {
      comment = `Học lực mức đạt (ĐTB: ${avg}đ). Đã nắm được một số dạng toán cơ bản nhưng thao tác biến đổi còn chậm, dễ nhầm lẫn dấu và công thức. Cần làm lại các bài tập sách giáo khoa và ghi chép bài đầy đủ.`;
    } else {
      comment = `Đạt yêu cầu kiến thức môn Toán cơ bản. Cần dành thêm thời gian ôn tập lý thuyết, rèn luyện kỹ năng giải toán tự luận và hoàn thành bài tập về nhà đầy đủ.`;
    }
  } else {
    tags.push("Cần phụ đạo", "Chưa đạt");
    if (commentStyle === "so_lien_lac") {
      comment = `Kính gửi phụ huynh: Em ${fullName} đang gặp nhiều khó khăn ở môn Toán (kết quả chưa đạt). Kính đề nghị gia đình sớm phối hợp với giáo viên bộ môn để có kế hoạch kèm cặp, phụ đạo giúp em củng cố kiến thức.`;
    } else if (commentStyle === "khuyen_khich") {
      comment = `${firstName} hãy kiên trì và không nản lòng. Thầy luôn sẵn sàng giải đáp và hướng dẫn lại các bài toán em chưa rõ. Hãy cố gắng bắt đầu lại từ những bài tập cơ bản nhất nhé!`;
    } else {
      comment = `Kiến thức môn Toán còn nhiều lỗ hổng, kỹ năng tính toán còn yếu. Cần nghiêm túc chấn chỉnh ý thức học tập, tập trung nghe giảng trên lớp và tham gia phụ đạo để theo kịp chương trình.`;
    }
  }

  // Bổ sung ghi chú nề nếp nếu có vi phạm đáng chú ý
  if (notTakingNotes > 0) {
    comment += ` Cần lưu ý ghi chép bài đầy đủ, cẩn thận hơn vào vở học.`;
    tags.push("Cần chép bài đủ");
  }
  if (bonusCount >= 2) {
    tags.push("Hăng hái phát biểu");
  }

  return { comment, tags };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API kiểm tra trạng thái
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Đường dẫn lưu trữ dữ liệu đồng bộ đám mây đa thiết bị
  const SYNC_FILE_PATH = path.join(process.cwd(), "app_sync_data.json");

  // API: Đọc dữ liệu đồng bộ từ máy chủ (dành cho đa thiết bị)
  app.get("/api/sync", (_req, res) => {
    try {
      if (fs.existsSync(SYNC_FILE_PATH)) {
        const fileData = fs.readFileSync(SYNC_FILE_PATH, "utf-8");
        const parsed = JSON.parse(fileData);
        return res.json({
          success: true,
          exists: true,
          data: parsed.data || null,
          lastUpdated: parsed.lastUpdated || null,
          deviceId: parsed.deviceId || null,
        });
      }
      return res.json({
        success: true,
        exists: false,
        data: null,
        lastUpdated: null,
      });
    } catch (err: any) {
      console.error("Lỗi đọc dữ liệu đồng bộ:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // API: Ghi và cập nhật dữ liệu đồng bộ lên máy chủ
  app.post("/api/sync", (req, res) => {
    try {
      const { data, lastUpdated = Date.now(), deviceId = "unknown", forceClear = false } = req.body;
      if (!data) {
        return res.status(400).json({ success: false, error: "Thiếu dữ liệu đồng bộ" });
      }

      // Bảo vệ: Nếu dữ liệu gửi lên bị rỗng danh sách lớp mà máy chủ đã có lớp, không cho phép ghi đè mất dữ liệu trừ khi forceClear
      if (fs.existsSync(SYNC_FILE_PATH) && !forceClear) {
        try {
          const currentFile = fs.readFileSync(SYNC_FILE_PATH, "utf-8");
          const existing = JSON.parse(currentFile);
          if (existing?.data?.classes?.length > 0 && (!data.classes || data.classes.length === 0)) {
            console.warn("Cảnh báo: Từ chối ghi đè dữ liệu rỗng lên máy chủ đang có danh sách lớp.");
            return res.json({
              success: true,
              skipped: true,
              message: "Dữ liệu hiện tại trên máy chủ được bảo vệ",
              lastUpdated: existing.lastUpdated,
            });
          }
        } catch {
          // Bỏ qua nếu file hiện tại không parse được
        }
      }

      const payload = {
        data,
        lastUpdated,
        deviceId,
        savedAt: new Date().toISOString(),
      };

      fs.writeFileSync(SYNC_FILE_PATH, JSON.stringify(payload, null, 2), "utf-8");
      return res.json({
        success: true,
        lastUpdated,
        savedAt: payload.savedAt,
      });
    } catch (err: any) {
      console.error("Lỗi ghi dữ liệu đồng bộ:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // API: Xóa dữ liệu đồng bộ trên máy chủ
  app.post("/api/sync/reset", (_req, res) => {
    try {
      if (fs.existsSync(SYNC_FILE_PATH)) {
        fs.unlinkSync(SYNC_FILE_PATH);
      }
      return res.json({ success: true, message: "Đã xóa dữ liệu đồng bộ trên máy chủ" });
    } catch (err: any) {
      console.error("Lỗi xóa dữ liệu đồng bộ:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // API: Khôi phục dữ liệu mặc định chuẩn của Thầy Hoàng Duy Nhân (Lớp 10A5, 10A6, 10A7)
  app.post("/api/sync/restore-default", (_req, res) => {
    try {
      const defaultDataPath = path.join(process.cwd(), "src", "data", "defaultMasterData.json");
      let masterPayload: any = null;

      if (fs.existsSync(defaultDataPath)) {
        masterPayload = JSON.parse(fs.readFileSync(defaultDataPath, "utf-8"));
      } else if (fs.existsSync(SYNC_FILE_PATH)) {
        masterPayload = JSON.parse(fs.readFileSync(SYNC_FILE_PATH, "utf-8"));
      }

      if (masterPayload?.data) {
        masterPayload.lastUpdated = Date.now();
        masterPayload.savedAt = new Date().toISOString();
        fs.writeFileSync(SYNC_FILE_PATH, JSON.stringify(masterPayload, null, 2), "utf-8");
        return res.json({
          success: true,
          data: masterPayload.data,
          lastUpdated: masterPayload.lastUpdated,
        });
      }

      return res.status(404).json({ success: false, error: "Không tìm thấy dữ liệu gốc mẫu" });
    } catch (err: any) {
      console.error("Lỗi khôi phục dữ liệu gốc:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // API: AI Đọc danh sách lớp từ ảnh chụp hoặc dữ liệu file Excel/text với độ chính xác cao
  app.post("/api/ai/parse-roster", async (req, res) => {
    try {
      const { imageBase64, mimeType, fileContent, grade = "10" } = req.body;

      if (!imageBase64 && !fileContent) {
        return res.status(400).json({ error: "Vui lòng cung cấp hình ảnh hoặc nội dung danh sách học sinh." });
      }

      const ai = getGeminiClient();

      const systemInstruction = `Bạn là chuyên gia số hóa hồ sơ giáo dục và phân tích bảng biểu học sinh hàng đầu tại Việt Nam.
Nhiệm vụ của bạn là đọc và trích xuất chính xác 100% danh sách học sinh từ ảnh chụp (bảng danh sách in/viết tay, sổ điểm) hoặc từ bảng dữ liệu Excel/CSV (vnEdu, SMAS, CSDL ngành Bộ GD&ĐT).

QUY TẮC BẮT BUỘC ĐỂ TRÁNH ĐỌC SAI THÔNG TIN HỌC SINH:
1. HỌ VÀ TÊN (RẤT QUAN TRỌNG):
- Trong phần lớn danh sách trường học Việt Nam, họ tên thường tách thành 2 cột: Cột "Họ và đệm" (hoặc "Họ và chữ đệm", "Họ lót") và Cột "Tên".
- BẠN PHẢI GHÉP 2 CỘT NÀY LẠI THÀNH Họ và tên đầy đủ: fullName = [Họ và chữ đệm] + " " + [Tên]. Ví dụ: "Nguyễn Hoàng" và "An" -> "Nguyễn Hoàng An"; "Trần Thị Mai" và "Anh" -> "Trần Thị Mai Anh".
- Tuyệt đối không được bỏ sót phần họ hoặc phần tên của học sinh.
- Viết hoa chữ cái đầu theo chuẩn chính tả tiếng Việt.

2. GIỚI TÍNH:
- Nếu bảng có 2 cột "Nam" và "Nữ" riêng biệt: Xem dấu đánh dấu (dấu 'x', 'X', '1', 'v', 'V' hoặc có chữ) ở cột nào để gán tương ứng là "Nam" hoặc "Nữ".
- Nếu chỉ có 1 cột "Nữ": Dòng nào có đánh dấu 'x' thì là "Nữ", dòng để trống thì là "Nam".
- Nếu không có cột giới tính hoặc không rõ: Suy đoán dựa trên tên đệm tiếng Việt (Ví dụ: Thị, Nhi, Linh, Lan, Mai, Thảo, Ngọc, Châu, Nga, Hân, Vy... là "Nữ"; Văn, Hoàng, Đức, Minh, Tuấn, Duy, Huy, Nam, Phong... là "Nam").

3. NGÀY THÁNG NĂM SINH (DATE OF BIRTH):
- Trích xuất chính xác ngày tháng năm sinh của từng học sinh.
- Chuẩn hóa bắt buộc về định dạng ISO: YYYY-MM-DD (Ví dụ: "2009-03-15").
- Nếu ngày sinh tách thành nhiều cột riêng (ví dụ: cột "Ngày sinh" ghi "15/03" và cột "Năm sinh" ghi "2009", hoặc 3 cột "Ngày", "Tháng", "Năm"): BẮT BUỘC ghép lại thành ngày đầy đủ "2009-03-15", bổ sung số 0 đứng trước nếu ngày/tháng có 1 chữ số.
- Nếu định dạng DD/MM/YYYY hoặc DD-MM-YYYY hoặc DD.MM.YYYY (ví dụ: 15/03/2009, 05/07/2009, 5/3/2009), chuyển về YYYY-MM-DD.
- Nếu năm sinh chỉ có 2 chữ số (ví dụ: 15/03/09), với khối lớp ${grade} quy về thế kỷ 21 (ví dụ: 2009-03-15).
- Nếu chỉ có năm sinh (ví dụ: "2009" hoặc "2008"), ghi là "2009-01-01".
- Nếu là số serial Excel (như 39888): quy đổi sang đúng ngày tương ứng (ví dụ: "2009-03-16").

4. SỐ ĐIỆN THOẠI LIÊN HỆ (PHỤ HUYNH / GIA ĐÌNH):
- Ưu tiên trích xuất đúng cột SĐT phụ huynh, điện thoại liên hệ gia đình.
- Số điện thoại di động Việt Nam có 10 chữ số (đầu số 03x, 05x, 07x, 08x, 09x).
- Nếu bảng Excel làm mất số 0 đầu tiên (ví dụ: 987654321), tự động thêm 0 thành "0987654321".
- Nếu có mã quốc gia (+84 hoặc 84), chuyển thành 0 (Ví dụ: +84987654321 hoặc 84987654321 -> "0987654321").
- Nếu trong ô có 2 số điện thoại hoặc có nhãn bố/mẹ (ví dụ: "0987654321 / 0912345678" hoặc "Bố: 0987654321 - Mẹ: 0912345678"), chuẩn hóa định dạng "0987654321 (Bố) / 0912345678 (Mẹ)" hoặc "0987654321 / 0912345678".
- Tuyệt đối không nhầm số điện thoại với số CCCD/định danh (12 số), mã học sinh hay ngày sinh.

5. TÊN LỚP VÀ LỌC BỎ DÒNG RÁC:
- Tự động phát hiện tên lớp trong tiêu đề (ví dụ: "10A5", "10A6", "10A7", "10/5"...) gán vào classNameDetected.
- Loại bỏ các dòng tiêu đề phụ, dòng tổng số học sinh, chữ ký hiệu trưởng, người lập biểu.

Yêu cầu định dạng trả về: Chuỗi JSON hợp lệ tuân thủ đúng Schema.`;

      let contents: any;

      if (imageBase64) {
        const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");
        contents = {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || "image/jpeg",
              },
            },
            {
              text: `Hãy đọc kỹ danh sách học sinh trong ảnh chụp này và trích xuất toàn bộ học sinh chính xác theo các quy tắc tiếng Việt. Khối lớp: ${grade}.`,
            },
          ],
        };
      } else {
        contents = `Dưới đây là nội dung bảng danh sách học sinh trích xuất từ file (Excel/CSV):\n\n${fileContent}\n\nHãy phân tích chính xác từng dòng theo các quy tắc tiếng Việt (đặc biệt ghép cột Họ đệm và Tên, chuẩn hóa giới tính và ngày sinh). Khối lớp: ${grade}.`;
      }

      const { response, modelUsed } = await generateWithGeminiFallback(ai, {
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              classNameDetected: {
                type: Type.STRING,
                description: "Tên lớp phát hiện được từ tài liệu (ví dụ: 10A5, 10A6, 10A7), hoặc rỗng nếu không có",
              },
              students: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    stt: { type: Type.INTEGER },
                    studentCode: { type: Type.STRING },
                    fullName: { type: Type.STRING },
                    gender: { type: Type.STRING, description: "'Nam' hoặc 'Nữ'" },
                    dateOfBirth: { type: Type.STRING, description: "Định dạng YYYY-MM-DD" },
                    parentPhone: { type: Type.STRING },
                    notes: { type: Type.STRING },
                  },
                  required: ["fullName"],
                },
              },
            },
            required: ["students"],
          },
        },
      });

      console.log(`Đã phân tích danh sách lớp thành công với mô hình ${modelUsed}`);

      const rawJson = response.text || "{}";
      const parsed = JSON.parse(rawJson);

      // Chuẩn hóa và làm sạch dữ liệu sau khi AI trả về
      if (Array.isArray(parsed.students)) {
        const defaultYear = 2024 - (parseInt(grade, 10) || 10) - 5;
        parsed.students = parsed.students
          .filter((st: any) => st && st.fullName && String(st.fullName).trim().length > 1)
          .map((st: any, idx: number) => {
            let phone = st.parentPhone ? String(st.parentPhone).replace(/[^\d+]/g, "").trim() : undefined;
            if (phone && /^9\d{8}$/.test(phone)) {
              phone = "0" + phone;
            }
            return {
              stt: st.stt || idx + 1,
              studentCode: st.studentCode || `HS${grade}${String(idx + 1).padStart(2, "0")}`,
              fullName: String(st.fullName).trim(),
              gender: st.gender === "Nữ" ? "Nữ" : "Nam",
              dateOfBirth: st.dateOfBirth && /^\d{4}-\d{2}-\d{2}$/.test(st.dateOfBirth) ? st.dateOfBirth : `${defaultYear}-01-01`,
              parentPhone: phone,
              notes: st.notes ? String(st.notes).trim() : undefined,
            };
          });
      }

      res.json(parsed);
    } catch (err: any) {
      console.warn("Lỗi AI Parse Roster:", err.message || err);

      // Nếu có nội dung text/Excel gửi lên, tự động kích hoạt bộ phân tích dự phòng thông minh
      if (req.body?.fileContent) {
        console.info("Kích hoạt bộ phân tích bảng điểm dự phòng cho tệp dữ liệu...");
        const fallbackResult = parseTextRosterFallback(req.body.fileContent, req.body.grade || "10");
        if (fallbackResult.students && fallbackResult.students.length > 0) {
          return res.json({
            ...fallbackResult,
            fallbackUsed: true,
            notice: "Dữ liệu được trích xuất trực tiếp thành công từ bảng tính.",
          });
        }
      }

      // Xử lý thông báo lỗi người dùng thân thiện, rõ ràng
      let friendlyError = err.message || "Không thể phân tích dữ liệu danh sách bằng AI.";
      if (isAuthError(err)) {
        friendlyError =
          "Khóa Gemini API (GEMINI_API_KEY) hiện tại chưa được xác thực hoặc không hợp lệ (mã lỗi 401: ACCESS_TOKEN_TYPE_UNSUPPORTED). Vui lòng cấu hình khóa API hợp lệ trong mục Settings > Secrets của AI Studio, hoặc chuyển sang nhập bằng tệp Excel để sử dụng ngay mà không cần kết nối AI.";
      }

      res.status(isAuthError(err) ? 401 : 500).json({
        error: friendlyError,
      });
    }
  });

  // API: AI Tạo lời nhận xét học sinh cá nhân
  app.post("/api/ai/student-comment", async (req, res) => {
    const { student, score, disciplineSummary, classroom, commentStyle = "hoc_ba" } = req.body;

    if (!student) {
      return res.status(400).json({ error: "Thiếu dữ liệu học sinh." });
    }

    try {
      const ai = getGeminiClient();

      const prompt = `Bạn là giáo viên bộ môn Toán giàu kinh nghiệm tại trường THPT Việt Nam.
Hãy viết lời nhận xét đánh giá học sinh môn Toán bám sát chuẩn đánh giá học sinh theo Thông tư 22/2021/TT-BGDĐT.

Thông tin học sinh:
- Họ tên: ${student.fullName} (Mã: ${student.studentCode}, Giới tính: ${student.gender})
- Lớp: ${classroom?.name || "Lớp học"} (Khối: ${classroom?.grade || "10"})
- Điểm kiểm tra thường xuyên (ĐTX): ${score?.regularScores?.length ? score.regularScores.join(", ") : "Chưa có"}
- Điểm giữa kỳ (ĐGK): ${score?.midtermScore !== null && score?.midtermScore !== undefined ? score.midtermScore : "Chưa có"}
- Điểm cuối kỳ (ĐCK): ${score?.finalScore !== null && score?.finalScore !== undefined ? score.finalScore : "Chưa có"}
- Số lần lên bảng giải bài tập: ${score?.boardBonusCount || 0} lần (Điểm cộng tích lũy: +${score?.boardBonusTotal || 0}đ)
- Tình hình nề nếp tiết học Toán:
  + Số buổi vắng/trễ: ${disciplineSummary?.absentOrLateCount || 0}
  + Số lần không ghi bài / lười chép bài: ${disciplineSummary?.notTakingNotesCount || 0}
  + Số lần quên làm BTVN: ${disciplineSummary?.forgotHomeworkCount || 0}
  + Số lần quên mang máy tính cầm tay Casio: ${disciplineSummary?.forgotCalculatorCount || 0}
  + Điểm tích cực nổi bật: ${disciplineSummary?.positiveNotes || "Chăm chú lắng nghe"}
  + Điểm cần lưu ý: ${disciplineSummary?.negativeNotes || "Cần cố gắng duy trì"}

Phong cách nhận xét yêu cầu: "${commentStyle}"
(Tùy chọn:
- "hoc_ba": Lời nhận xét chuẩn ghi học bạ / sổ theo dõi đánh giá học sinh (ngắn gọn, cô đọng, văn phong sư phạm chuẩn mực, 2-3 câu nêu rõ năng lực toán học, ý thức học tập và định hướng rèn luyện).
- "so_lien_lac": Lời nhắn gửi phụ huynh qua Sổ liên lạc điện tử / Zalo (gần gũi, tôn trọng, thông báo tình hình học tập và đề xuất phụ huynh phối hợp đôn đốc).
- "khuyen_khich": Lời nhận xét mang tính truyền cảm hứng, khích lệ nỗ lực vượt khó môn Toán.
- "chi_tiet": Đánh giá toàn diện cả tư duy đại số, hình học và kỹ năng giải toán máy tính).

Yêu cầu:
Trả về JSON gồm 2 trường:
1. "comment": Đoạn văn nhận xét hoàn chỉnh, tự nhiên, mang đậm tính sư phạm và tình cảm của người thầy.
2. "tags": Danh sách 2-4 cụm từ khóa tóm tắt ngắn (ví dụ: ["Tư duy hình học tốt", "Chăm phát biểu", "Cần rèn luyện đại số"]).`;

      const { response, modelUsed } = await generateWithGeminiFallback(ai, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              comment: { type: Type.STRING },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ["comment", "tags"],
          },
        },
      });

      console.log(`Đã tạo nhận xét học sinh ${student.fullName} thành công với mô hình ${modelUsed}`);

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (err: any) {
      console.warn("AI nhận xét chưa sẵn sàng, tự động kích hoạt bộ sinh nhận xét sư phạm Thông tư 22:", err.message || err);
      const fallbackComment = generatePedagogicalComment({
        student,
        score,
        disciplineSummary,
        classroom,
        commentStyle,
      });
      res.json({
        ...fallbackComment,
        isFallback: true,
        notice: "Nhận xét được tạo tự động theo chuẩn sư phạm Thông tư 22 dựa trên kết quả học tập và nề nếp của học sinh.",
      });
    }
  });

  // API: AI Tạo nhận xét hàng loạt cho cả lớp
  app.post("/api/ai/batch-student-comments", async (req, res) => {
    const { studentsWithData, classroom, commentStyle = "hoc_ba" } = req.body;

    if (!studentsWithData || !Array.isArray(studentsWithData) || studentsWithData.length === 0) {
      return res.status(400).json({ error: "Danh sách học sinh trống." });
    }

    try {
      const ai = getGeminiClient();

      const summaryList = studentsWithData.slice(0, 50).map((item: any) => ({
        id: item.student.id,
        stt: item.student.stt,
        fullName: item.student.fullName,
        gender: item.student.gender,
        avgScore: item.calculatedAvg,
        midterm: item.score?.midtermScore,
        final: item.score?.finalScore,
        boardBonus: item.score?.boardBonusCount || 0,
        forgotHW: item.disciplineSummary?.forgotHomeworkCount || 0,
        forgotCalc: item.disciplineSummary?.forgotCalculatorCount || 0,
      }));

      const prompt = `Bạn là giáo viên bộ môn Toán lớp ${classroom?.name || ""}.
Hãy tạo lời nhận xét ngắn gọn, sắc bén, đúng thực tế và đúng chuẩn sư phạm Thông tư 22 cho danh sách học sinh sau đây (tối đa 2-3 câu cho mỗi em, tránh rập khuôn giống hệt nhau):
${JSON.stringify(summaryList, null, 2)}

Phong cách nhận xét: "${commentStyle}".
Mỗi học sinh phải có lời nhận xét cá nhân hóa dựa trên kết quả học tập (điểm TB, thi giữa kỳ, cuối kỳ) và nề nếp (lên bảng phát biểu, làm BTVN, chuẩn bị máy tính).`;

      const { response, modelUsed } = await generateWithGeminiFallback(ai, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              results: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    studentId: { type: Type.STRING },
                    comment: { type: Type.STRING },
                  },
                  required: ["studentId", "comment"],
                },
              },
            },
            required: ["results"],
          },
        },
      });

      console.log(`Đã tạo nhận xét hàng loạt thành công cho ${summaryList.length} học sinh với mô hình ${modelUsed}`);

      const parsed = JSON.parse(response.text || '{"results": []}');
      res.json(parsed);
    } catch (err: any) {
      console.warn("AI nhận xét hàng loạt chưa sẵn sàng, tự động kích hoạt bộ sinh nhận xét sư phạm Thông tư 22:", err.message || err);
      const results = studentsWithData.map((item: any) => {
        const itemComment = generatePedagogicalComment({
          student: item.student,
          score: item.score,
          disciplineSummary: item.disciplineSummary,
          classroom,
          commentStyle,
        });
        return {
          studentId: item.student.id,
          comment: itemComment.comment,
        };
      });

      res.json({
        results,
        isFallback: true,
        notice: "Đã tạo nhận xét sư phạm đồng loạt cho cả lớp bám sát Thông tư 22 và kết quả học tập.",
      });
    }
  });

  // Tích hợp Vite middleware cho môi trường phát triển, static files cho production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Máy chủ Quản Lý Học Sinh Môn Toán đang chạy tại http://0.0.0.0:${PORT}`);
  });
}

startServer();
