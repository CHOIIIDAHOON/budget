import React from "react";
import "./NumericTextBox.scss";

function NumericTextBox({
  name,
  value,
  onChange,
  onFocus,
  onBlur,
  type,
  onTypeChange,
  onPreset,
  inputRef,
  autoFocus,
}) {
  const formatWithComma = (val) => {
    if (!val) return "";
    return parseInt(val, 10).toLocaleString();
  };

  const handleChange = (e) => {
    const raw = e.target.value.replace(/,/g, "").replace(/\D/g, "");
    onChange({ target: { name, value: raw } });
  };

  return (
    <div className="amount-input-wrapper">
      <div className="amount-row">
        <input
          name={name}
          type="text"
          inputMode="numeric"
          autoFocus={autoFocus}
          ref={inputRef}
          value={formatWithComma(value)}
          onChange={handleChange}
          onFocus={onFocus}
          onBlur={onBlur}
          required
          autoComplete="off"
        />
        <div className="type-tabs">
          {["expense", "income"].map((t) => (
            <button
              key={t}
              type="button"
              className={type === t ? "active" : ""}
              onClick={() => onTypeChange(t)}
            >
              {t === "expense" ? "지출" : "수입"}
            </button>
          ))}
        </div>
      </div>
      <div className="amount-preset-buttons">
        {[100, 1000, 10000, 100000].map((preset) => (
          <button
            key={preset}
            type="button"
            className="amount-preset-btn"
            onClick={() => onPreset(preset)}
          >
            +{preset === 100 ? "1백" : preset === 1000 ? "1천" : preset === 10000 ? "1만" : "10만"}원
          </button>
        ))}
      </div>
    </div>
  );
}

export default NumericTextBox;
