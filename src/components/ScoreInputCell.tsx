import React, { useState, useEffect, useRef } from 'react';
import { roundTo005 } from '../utils/gradeCalculations';
import { X } from 'lucide-react';

interface ScoreInputCellProps {
  value: number | null | undefined;
  onChange: (val: number | null) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  ariaLabel?: string;
}

/**
 * Ô nhập điểm thông minh:
 * - Hỗ trợ nhập 2 chữ số thập phân, tự động làm tròn đến 0,05 khi hoàn tất (onBlur / Enter)
 * - Hỗ trợ cả dấu chấm (.) và dấu phẩy (,) từ bàn phím tiếng Việt / numpad
 * - Bấm phím Mũi tên Lên / Xuống (Arrow Up / Down) để tăng/giảm chính xác 0,05 điểm
 * - Tự động bôi đen (select all) khi focus để nhập đè điểm mới nhanh chóng
 * - Có nút xóa nhanh (x) khi rê chuột vào ô có điểm
 */
export const ScoreInputCell: React.FC<ScoreInputCellProps> = ({
  value,
  onChange,
  onClear,
  placeholder = '-',
  className = '',
  min = 0,
  max = 10,
  disabled = false,
  ariaLabel,
}) => {
  const isFocusedRef = useRef<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Hiển thị giá trị ban đầu dạng chuỗi ngắn gọn nhưng chuẩn xác
  const formatInitialValue = (val: number | null | undefined): string => {
    if (val === null || val === undefined || isNaN(val)) return '';
    const rounded = roundTo005(val);
    return rounded.toString();
  };

  const [text, setText] = useState<string>(() => formatInitialValue(value));

  // Đồng bộ giá trị khi prop value thay đổi từ bên ngoài (hoàn tác, đổi lớp, import...)
  useEffect(() => {
    if (!isFocusedRef.current) {
      setText(formatInitialValue(value));
    }
  }, [value]);

  const commitValue = (rawStr: string) => {
    const trimmed = rawStr.trim();
    if (trimmed === '') {
      if (value !== null && value !== undefined) {
        onChange(null);
      }
      return;
    }

    // Chuẩn hóa dấu phẩy thành dấu chấm
    const normalized = trimmed.replace(',', '.');
    const parsed = parseFloat(normalized);

    if (isNaN(parsed)) {
      // Nếu không phải số hợp lệ, khôi phục lại giá trị hiện tại
      setText(formatInitialValue(value));
      return;
    }

    // Giới hạn trong khoảng [min, max] và làm tròn đến 0.05
    const clamped = Math.max(min, Math.min(max, parsed));
    const rounded = roundTo005(clamped);

    setText(rounded.toString());
    if (rounded !== value) {
      onChange(rounded);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setText('');
      return;
    }

    // Cho phép nhập dấu chấm hoặc phẩy
    const normalized = raw.replace(',', '.');

    // Chỉ cho phép các chữ số và tối đa 1 dấu phân cách
    if (!/^[0-9]*\.?[0-9]*$/.test(normalized)) {
      return;
    }

    // Giới hạn tối đa 2 chữ số ở phần thập phân
    const parts = normalized.split('.');
    if (parts[1] && parts[1].length > 2) {
      return;
    }

    // Nếu người dùng nhập số lớn hơn 10 (ví dụ gõ 12), ngăn chặn
    const parsed = parseFloat(normalized);
    if (!isNaN(parsed) && parsed > max) {
      return;
    }

    // Lưu lại chuỗi người dùng đang gõ (giữ nguyên để không cản trở lúc đang gõ '8.' hay '8,')
    setText(raw);
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    commitValue(text);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = true;
    // Bôi đen toàn bộ để gõ thay thế nhanh
    e.target.select();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const cur = value !== null && value !== undefined ? value : 0;
      const next = Math.min(max, roundTo005(cur + 0.05));
      setText(next.toString());
      onChange(next);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const cur = value !== null && value !== undefined ? value : 0;
      const prev = Math.max(min, roundTo005(cur - 0.05));
      setText(prev.toString());
      onChange(prev);
    } else if (e.key === 'Escape') {
      setText(formatInitialValue(value));
      e.currentTarget.blur();
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setText('');
    if (onClear) {
      onClear();
    } else {
      onChange(null);
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const hasValue = value !== null && value !== undefined;

  return (
    <div className="relative inline-flex items-center justify-center group/cell">
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        value={text}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-14 text-center py-1 text-xs sm:text-sm font-semibold border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-md bg-transparent transition-all outline-hidden ${className}`}
      />
      {hasValue && !disabled && (
        <button
          type="button"
          tabIndex={-1}
          onClick={handleClear}
          title="Xóa điểm"
          className="absolute -top-1 -right-1 hidden group-hover/cell:flex items-center justify-center w-3.5 h-3.5 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors shadow-2xs z-10 cursor-pointer"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
};
