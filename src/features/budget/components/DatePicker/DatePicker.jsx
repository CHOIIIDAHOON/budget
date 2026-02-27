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

function DatePicker({ name, value, onChange, onFocus, onBlur, labelText }) {
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

  const containerRef = useRef(null);
  const wrapperRef = useRef(null);
  const calendarRef = useRef(null);
  const inputRef = useRef(null);

  const open = () => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setCalendarStyle({
      position: "fixed",
      visibility: "hidden",
      width: rect.width,
      top: rect.bottom + 4,
      left: rect.left,
    });
    setIsOpen(true);
  };

  const close = (e) => {
    setIsOpen(false);
    onBlur && onBlur(e);
  };

  useLayoutEffect(() => {
    if (!isOpen || !calendarRef.current || !wrapperRef.current) return;

    const trigger = wrapperRef.current.getBoundingClientRect();
    const calH = calendarRef.current.offsetHeight;
    const calW = trigger.width;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const GAP = 4;
    const MARGIN = 8;

    let top = trigger.bottom + GAP;
    if (top + calH > vh - MARGIN) {
      const topAbove = trigger.top - calH - GAP;
      top = topAbove >= MARGIN ? topAbove : Math.max(MARGIN, vh - calH - MARGIN);
    }

    let left = trigger.left;
    if (left + calW > vw - MARGIN) {
      left = Math.max(MARGIN, vw - calW - MARGIN);
    }

    setCalendarStyle({ position: "fixed", top, left, width: calW, visibility: "visible" });
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

  useEffect(() => {
    if (!isOpen) return;
    const closeOnScroll = () => setIsOpen(false);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => {
      window.removeEventListener("scroll", closeOnScroll, true);
    };
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

  // 숫자 배열로부터 표시값(한국어) + ISO값 생성 후 상태/콜백 반영
  const updateFromDigits = (digits) => {
    let display = digits;
    if (digits.length > 6) {
      display = `${digits.slice(0, 4)}년 ${digits.slice(4, 6)}월 ${digits.slice(6)}일`;
    } else if (digits.length > 4) {
      display = `${digits.slice(0, 4)}년 ${digits.slice(4)}월`;
    }

    let isoFormatted = digits;
    if (digits.length > 6) {
      isoFormatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
    } else if (digits.length > 4) {
      isoFormatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    }

    setDisplayValue(display);
    onChange({ target: { name, value: isoFormatted } });

    let cursorPos = digits.length;
    if (digits.length > 6) cursorPos += 3; // 년 + 월 + 일
    else if (digits.length > 4) cursorPos += 2; // 년 + 월

    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(cursorPos, cursorPos);
      }
    });
  };

  const handleTextChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    updateFromDigits(digits);
  };

  // Backspace: 한국어 구분자(년/월/일)를 건너뛰고 숫자만 삭제
  const handleKeyDown = (e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const currentDigits = displayValue.replace(/\D/g, "");
      updateFromDigits(currentDigits.slice(0, -1));
    }
  };

  const selectedParts = value ? value.split("-").map(Number) : null;

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

  const today = new Date();

  const calendar = isOpen && createPortal(
    <div className="date-calendar" ref={calendarRef} style={calendarStyle} tabIndex={-1} onMouseDown={(e) => e.preventDefault()}>
      <div className="calendar-nav">
        <button type="button" className="calendar-nav-btn" onClick={prevMonth}>‹</button>
        <span className="calendar-title">{viewYear}년 {MONTH_NAMES[viewMonth]}</span>
        <button type="button" className="calendar-nav-btn" onClick={nextMonth}>›</button>
      </div>
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
    </div>,
    document.body
  );

  return (
    <div className="date-section" ref={containerRef}>
      {labelText && (
        <div className="date-header">
          <span className="label-span">{labelText}</span>
        </div>
      )}
      <div ref={wrapperRef} className={`date-input-wrapper${isOpen ? " open" : ""}`}>
        <input
          ref={inputRef}
          className="date-text-input"
          type="text"
          name={name}
          value={displayValue}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onFocus={(e) => { onFocus && onFocus(e); }}
          onBlur={(e) => {
            if (
              !containerRef.current?.contains(e.relatedTarget) &&
              !calendarRef.current?.contains(e.relatedTarget)
            ) {
              close(e);
            }
          }}
          placeholder="YYYY년MM월DD일"
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
