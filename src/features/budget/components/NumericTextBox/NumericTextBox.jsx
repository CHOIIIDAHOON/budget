import { useState } from "react";
import "./NumericTextBox.scss";
import { formatWithComma, parseAmount } from "../../../../shared/utils/number";

function NumericTextBox({
  name,
  value,
  onChange,
  onFocus,
  onBlur,
  inputRef,
  autoFocus,
  label,
}) {
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (e) => {
    const raw = parseAmount(e.target.value);
    onChange({ target: { name, value: raw } });
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus && onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur && onBlur(e);
  };

  const hasValue = !!(value && String(value).trim() && String(value) !== "0" && value !== "");
  const isFloating = hasValue || isFocused;

  return (
    <div className={`amount-input-wrapper${label ? " has-label" : ""}`}>
      <div className="amount-row">
        <div
          className={`amount-field${isFocused ? " focused" : ""}${hasValue ? " has-value" : ""}`}
          data-value={formatWithComma(value)}
        >
          {label && (
            <label className={`floating-label${isFloating ? " floating" : ""}`}>
              {label}
            </label>
          )}
          <input
            name={name}
            type="text"
            inputMode="numeric"
            autoFocus={autoFocus}
            ref={inputRef}
            value={formatWithComma(value)}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            required
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}

export default NumericTextBox;
