import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { createPortal } from "react-dom";
import "./DatePicker.scss";

const MONTH_NAMES = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const DAY_NAMES = ["일","월","화","수","목","금","토"];

// ISO YYYY-MM-DD (or partial) → 한국어 표시 형식
function isoToDisplay(iso) {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length === 3) return `${parts[0]}년${parts[1]}월${parts[2]}일`;
  if (parts.length === 2) return `${parts[0]}년${parts[1]}월`;
  return parts[0];
}

// mode: "date" (기본, YYYY-MM-DD) | "month" (년월만, YYYY-MM)
function DatePicker({ name, value, onChange, onFocus, onBlur, labelText, mode = "date" }) {
  const isMonthMode = mode === "month";

  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => {
    if (value) return parseInt(value.split("-")[0]);
    return new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    if (value) return parseInt(value.split("-")[1]) - 1;
    return new Date().getMonth();
  });
  const [calendarStyle, setCalendarStyle] = useState({});
  const [displayValue, setDisplayValue] = useState(() => isoToDisplay(value));

  const isFloating = displayValue !== "" || isOpen;

  const containerRef = useRef(null);
  const wrapperRef = useRef(null);
  const calendarRef = useRef(null);
  const inputRef = useRef(null);

  const open = () => {
    setCalendarStyle({
      position: "fixed",
      visibility: "hidden",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    });
    setIsOpen(true);
  };

  const close = (e) => {
    setIsOpen(false);
    onBlur && onBlur(e);
  };

  useLayoutEffect(() => {
    if (!isOpen || !calendarRef.current) return;
    setCalendarStyle({
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      visibility: "visible",
    });
    requestAnimationFrame(() => {
      calendarRef.current?.focus();
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e) => {
      if (
        !containerRef.current?.contains(e.target) &&
        !calendarRef.current?.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isOpen]);

  // value prop 변경 시 viewYear/viewMonth 및 displayValue 동기화
  useEffect(() => {
    if (value) {
      const parts = value.split("-");
      if (parts.length >= 2 && !isNaN(parseInt(parts[0])) && !isNaN(parseInt(parts[1]))) {
        setViewYear(parseInt(parts[0]));
        setViewMonth(parseInt(parts[1]) - 1);
      }
    }
    setDisplayValue(isoToDisplay(value));
  }, [value]);

  // digits 개수 → display 내 커서 위치
  // date mode: "" / "2" / "2026년" / "2026년0월" / "2026년02월" / "2026년02월15일"
  // month mode: "" / "2" / "2026년" / "2026년0월" / "2026년02월"
  const DIGIT_CURSOR = isMonthMode
    ? [0, 1, 2, 3, 5, 7, 8]
    : [0, 1, 2, 3, 5, 7, 8, 10, 11];
  const MAX_DIGITS = isMonthMode ? 6 : 8;

  // 숫자 배열로부터 표시값(한국어) + ISO값 생성 후 상태/콜백 반영
  const updateFromDigits = (digits) => {
    let display;
    let isoFormatted = digits;

    if (!isMonthMode && digits.length >= 7) {
      display = `${digits.slice(0, 4)}년${digits.slice(4, 6)}월${digits.slice(6)}일`;
      isoFormatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
    } else if (digits.length >= 5) {
      display = `${digits.slice(0, 4)}년${digits.slice(4)}월`;
      isoFormatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    } else if (digits.length === 4) {
      display = `${digits}년`;
    } else {
      display = digits;
    }

    setDisplayValue(display);
    onChange({ target: { name, value: isoFormatted } });

    const cursorPos = DIGIT_CURSOR[digits.length] ?? display.length;
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(cursorPos, cursorPos);
      }
    });
  };

  // 모든 키 입력을 여기서 처리 (숫자/Backspace/Delete)
  const handleKeyDown = (e) => {
    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      const digits = displayValue.replace(/\D/g, "");
      if (digits.length < MAX_DIGITS) updateFromDigits(digits + e.key);
    } else if (e.key === "Backspace") {
      e.preventDefault();
      const digits = displayValue.replace(/\D/g, "");
      updateFromDigits(digits.slice(0, -1));
    } else if (e.key === "Delete") {
      e.preventDefault();
      updateFromDigits("");
    }
  };

  const handleTextChange = () => {};

  const handlePaste = (e) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, MAX_DIGITS);
    if (digits) updateFromDigits(digits);
  };

  const selectedParts = value ? value.split("-").map(Number) : null;

  // ── date mode용 ─────────────────────────────────────────────
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDay = (year, month) => new Date(year, month, 1).getDay();

  const handleDayClick = (day) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange({ target: { name, value: `${viewYear}-${mm}-${dd}` } });
    setIsOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDay(viewYear, viewMonth);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // ── month mode용 ─────────────────────────────────────────────
  const handleMonthClick = (m) => {
    const mm = String(m).padStart(2, "0");
    onChange({ target: { name, value: `${viewYear}-${mm}` } });
    setIsOpen(false);
  };

  const today = new Date();

  const calendar = isOpen && createPortal(
    <>
      <div className="date-calendar-backdrop" onMouseDown={() => setIsOpen(false)} />
      <div className="date-calendar" ref={calendarRef} style={calendarStyle} tabIndex={-1} onMouseDown={(e) => e.preventDefault()}>
        <div className="calendar-nav">
          {isMonthMode ? (
            <>
              <button type="button" className="calendar-nav-btn" onClick={() => setViewYear((y) => y - 1)}>‹</button>
              <span className="calendar-title">{viewYear}년</span>
              <button type="button" className="calendar-nav-btn" onClick={() => setViewYear((y) => y + 1)}>›</button>
            </>
          ) : (
            <>
              <button type="button" className="calendar-nav-btn" onClick={prevMonth}>‹</button>
              <span className="calendar-title">{viewYear}년 {MONTH_NAMES[viewMonth]}</span>
              <button type="button" className="calendar-nav-btn" onClick={nextMonth}>›</button>
            </>
          )}
        </div>

        {isMonthMode ? (
          <div className="calendar-month-grid">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const isSelected = selectedParts && selectedParts[0] === viewYear && selectedParts[1] === m;
              const isCurrent = m === today.getMonth() + 1 && viewYear === today.getFullYear();
              return (
                <div
                  key={m}
                  className={[
                    "calendar-month-item",
                    isSelected ? "selected" : "",
                    isCurrent && !isSelected ? "today" : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() => handleMonthClick(m)}
                >
                  {m}월
                </div>
              );
            })}
          </div>
        ) : (
          <div className="calendar-grid">
            {DAY_NAMES.map((d, i) => (
              <div
                key={d}
                className={`calendar-day-name${i === 0 ? " sunday" : i === 6 ? " saturday" : ""}`}
              >
                {d}
              </div>
            ))}
            {cells.map((day, i) => {
              const col = i % 7;
              const isSelected =
                day !== null &&
                selectedParts !== null &&
                day === selectedParts[2] &&
                viewYear === selectedParts[0] &&
                viewMonth + 1 === selectedParts[1];
              const isToday =
                day !== null &&
                day === today.getDate() &&
                viewYear === today.getFullYear() &&
                viewMonth === today.getMonth();
              return (
                <div
                  key={i}
                  className={[
                    "calendar-cell",
                    day === null ? "empty" : "",
                    isSelected ? "selected" : "",
                    isToday && !isSelected ? "today" : "",
                    col === 0 ? "sunday" : col === 6 ? "saturday" : "",
                  ].filter(Boolean).join(" ")}
                  onClick={day !== null ? () => handleDayClick(day) : undefined}
                >
                  {day}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>,
    document.body
  );

  return (
    <div className={`date-section${labelText ? " has-label" : ""}`} ref={containerRef}>
      <div
        ref={wrapperRef}
        className={[
          "date-input-wrapper",
          isOpen ? "open" : "",
          displayValue ? "has-value" : "",
          labelText ? "has-label" : "",
        ].filter(Boolean).join(" ")}
      >
        {labelText && (
          <label className={`floating-label${isFloating ? " floating" : ""}`}>
            {labelText}
          </label>
        )}
        <input
          ref={inputRef}
          className="date-text-input"
          type="text"
          name={name}
          value={displayValue}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={(e) => { onFocus && onFocus(e); }}
          onBlur={(e) => {
            if (
              !containerRef.current?.contains(e.relatedTarget) &&
              !calendarRef.current?.contains(e.relatedTarget)
            ) {
              close(e);
            }
          }}
          placeholder={isMonthMode ? "YYYY년MM월" : "YYYY년MM월DD일"}
        />
        <button
          type="button"
          className="date-icon-btn"
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => (isOpen ? setIsOpen(false) : open())}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </button>
      </div>
      {calendar}
    </div>
  );
}

export default DatePicker;
