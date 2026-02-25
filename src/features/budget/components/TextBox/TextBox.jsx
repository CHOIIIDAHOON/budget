import React, { useState, useRef } from "react";
import "./TextBox.scss";

function TextBox({
  name,
  value,
  onChange,
  onFocus,
  onBlur,
  autoCompleteOptions = [],
  autoComplete,
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  // 2글자 이상 입력 시 autoCompleteOptions에서 입력값 포함 항목만 최대 5개 추출
  const hintList =
    value && value.trim().length >= 2
      ? autoCompleteOptions
          .filter((s) => s.toLowerCase().includes(value.toLowerCase()))
          .slice(0, 5)
      : [];

  // 포커스 시 자동완성 드롭다운 표시
  const handleFocus = (e) => {
    setShowSuggestions(true);
    onFocus && onFocus(e);
  };

  // 블러 시 약간의 딜레이 후 드롭다운 숨김 (항목 클릭 이벤트가 먼저 처리될 수 있도록)
  const handleBlur = (e) => {
    setTimeout(() => setShowSuggestions(false), 150);
    onBlur && onBlur(e);
  };

  // 자동완성 항목 선택 시 값 반영 후 드롭다운 닫고 input에 포커스 복원
  const handleSuggestionSelect = (suggestion) => {
    onChange({ target: { name, value: suggestion } });
    setShowSuggestions(false);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className="wrapper">
      <input
        name={name}
        value={value}
        onChange={onChange}
        ref={inputRef}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoComplete={autoComplete || "off"}
      />
      {showSuggestions && hintList.length > 0 && (
        <div className="suggestions">
          {hintList.map((suggestion, index) => (
            <div
              key={index}
              className="suggestion-item"
              onMouseDown={(e) => {
                // blur보다 먼저 실행되도록 기본 동작 차단 후 선택 처리
                e.preventDefault();
                handleSuggestionSelect(suggestion);
              }}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TextBox;
