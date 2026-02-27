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
  labelText,
}) {
  const hasHeader = labelText || onFixDateChange;
  return (
    <div className="date-section">
      {hasHeader && (
        <div className="date-header">
          {labelText && <span className="label-span">{labelText}</span>}
          {onFixDateChange && (
            <label className="date-fix-wrapper">
              <input
                type="checkbox"
                className="date-fix-checkbox"
                checked={fixDate}
                onChange={(e) => onFixDateChange(e.target.checked)}
              />
              <span className="label-small">날짜 고정</span>
            </label>
          )}
        </div>
      )}
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
