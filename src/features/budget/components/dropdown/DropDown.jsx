import React, { Component } from "react";
import "./DropDown.scss";

class DropDown extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showDropdown: false,
    };
    this.containerRef = React.createRef();
    this.handleClickOutside = this.handleClickOutside.bind(this);
  }

  componentDidMount() {
    document.addEventListener("mousedown", this.handleClickOutside);
  }

  componentWillUnmount() {
    document.removeEventListener("mousedown", this.handleClickOutside);
  }

  handleClickOutside(event) {
    if (
      this.containerRef.current &&
      !this.containerRef.current.contains(event.target)
    ) {
      this.setState({ showDropdown: false });
    }
  }

  render() {
    const { name, options, value, onChange, onFocus, onBlur } = this.props;
    const { showDropdown } = this.state;
    const selectedOption = options.find((opt) => opt.code === value);

    return (
      <div className="custom-select-container" ref={this.containerRef}>
        <div
          className={`custom-select ${showDropdown ? "open" : ""}`}
          tabIndex={0}
          onClick={() =>
            this.setState((prev) => ({ showDropdown: !prev.showDropdown }))
          }
          onFocus={onFocus}
          onBlur={onBlur}
        >
          <div className="custom-select__selected">
            {selectedOption ? (
              <span className="selected-text">
                {selectedOption.description}
              </span>
            ) : (
              <span className="placeholder">-- 선택하세요 --</span>
            )}
          </div>
          <div className="custom-select__arrow">
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
              <path
                d="M1 1L6 6L11 1"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        {showDropdown && (
          <div className="custom-select__dropdown">
            <div className="dropdown-options">
              {options.map((opt) => (
                <div
                  key={opt.code}
                  className={`dropdown-option ${
                    value === opt.code ? "selected" : ""
                  }`}
                  onClick={() => {
                    onChange({ target: { name, value: opt.code } });
                    this.setState({ showDropdown: false });
                  }}
                >
                  <span className="option-text">{opt.description}</span>
                  {value === opt.code && (
                    <svg
                      className="check-icon"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M13.5 4.5L6 12L2.5 8.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default DropDown;
