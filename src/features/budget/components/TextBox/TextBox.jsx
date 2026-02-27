import React, { Component } from "react";
import "./TextBox.scss";

class TextBox extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showSuggestions: false,
      isFocused: false,
    };
    this.inputRef = React.createRef();
    this.suppressNextFocus = false;
  }

  get hintList() {
    const { value = "", autoCompleteOptions = [] } = this.props;
    if (!value || value.trim().length < 2) return [];
    return autoCompleteOptions
      .filter((s) => s.toLowerCase().includes(value.toLowerCase()))
      .slice(0, 5);
  }

  handleFocus = (e) => {
    if (this.suppressNextFocus) {
      this.suppressNextFocus = false;
      return;
    }
    this.setState({ showSuggestions: true, isFocused: true });
    this.props.onFocus && this.props.onFocus(e);
  };

  handleBlur = (e) => {
    setTimeout(() => this.setState({ showSuggestions: false }), 150);
    this.setState({ isFocused: false });
    this.props.onBlur && this.props.onBlur(e);
  };

  handleSuggestionSelect = (suggestion) => {
    const { name, onChange } = this.props;
    onChange({ target: { name, value: suggestion } });
    this.setState({ showSuggestions: false });
    if (this.inputRef.current) {
      this.suppressNextFocus = true;
      this.inputRef.current.focus();
    }
  };

  render() {
    const { name, value = "", onChange, autoComplete, label } = this.props;
    const { showSuggestions, isFocused } = this.state;
    const hasValue = value.trim().length > 0;
    const isFloating = hasValue || isFocused;
    const hintList = this.hintList;

    return (
      <div className={`textbox-section${label ? " has-label" : ""}`}>
        <div
          className={`textbox-wrapper${isFocused ? " focused" : ""}${hasValue ? " has-value" : ""}`}
        >
          {label && (
            <label className={`floating-label${isFloating ? " floating" : ""}`}>
              {label}
            </label>
          )}
          <input
            name={name}
            value={value}
            onChange={onChange}
            ref={this.inputRef}
            onFocus={this.handleFocus}
            onBlur={this.handleBlur}
            autoComplete={autoComplete || "off"}
          />
        </div>
        {showSuggestions && hintList.length > 0 && (
          <div className="suggestions">
            {hintList.map((suggestion, index) => (
              <div
                key={index}
                className="suggestion-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  this.handleSuggestionSelect(suggestion);
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
}

export default TextBox;
