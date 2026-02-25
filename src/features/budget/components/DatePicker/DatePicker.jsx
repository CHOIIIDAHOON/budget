import React from "react";
import "./DatePicker.scss";

function DatePicker({
  name,
  value,
  onChange,
  onFocus,
  onBlur,
  fixDate,
  onFixDateChange,
}) {
  return (
    <div className="date-section">
      <div className="date-header">
        <span className="label-span">일자</span>
        <label className="date-fix-wrapper">
          <input
            type="checkbox"
            className="date-fix-checkbox"
            checked={fixDate}
            onChange={(e) => onFixDateChange(e.target.checked)}
          />
          <span className="label-small">날짜 고정</span>
        </label>
      </div>
      <input
        name={name}
        type="date"
        className="date-input"
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        required
      />
    </div>
  );
}

export default DatePicker;
