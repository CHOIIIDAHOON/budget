import React, { Component } from "react";
import { addTransaction, fetchMemoSuggestions } from "../../../../api/budgetApi";
import "./BudgetInputPage.scss";
import { darkenColor } from "../../../../shared/utils/color";
import { getToday } from "../../../../shared/utils/date";
import { DropDown, NumericTextBox, TextBox, DatePicker, UIFeedbackContext } from "../../components";
import BudgetBatchInputPage from "./BudgetBatchInputPage";

class BudgetInputPage extends Component {
  static contextType = UIFeedbackContext;

  constructor(props) {
    super(props);
    this.state = {
      form: {
        category: "",
        amount: "",
        memo: "",
        date: getToday(),
      },
      fixDate: false,
      type: "expense",
      recentCategories: [],
      memoSuggestions: [],
      mode: "single",
    };
    this.amountInputRef = React.createRef();
  }

  componentDidMount() {
    this.loadMemoSuggestions();
    this.applyColorVars();
  }

  componentDidUpdate(prevProps) {
    const { userId, groupId, userColor, hoverColor } = this.props;

    if (prevProps.userId !== userId || prevProps.groupId !== groupId) {
      this.loadMemoSuggestions();
    }

    if (prevProps.userColor !== userColor || prevProps.hoverColor !== hoverColor) {
      this.applyColorVars();
    }
  }

  applyColorVars() {
    const { userColor = "#f4a8a8", hoverColor = "#f19191" } = this.props;
    document.documentElement.style.setProperty("--main-color", userColor);
    document.documentElement.style.setProperty("--hover-color", hoverColor);
    document.documentElement.style.setProperty(
      "--active-color",
      darkenColor(userColor, 32)
    );
  }

  async loadMemoSuggestions() {
    const { userId, groupId } = this.props;
    try {
      const suggestions = await fetchMemoSuggestions(userId, groupId);
      this.setState({ memoSuggestions: suggestions });
    } catch (error) {
      console.error("메모 제안 로드 실패:", error);
    }
  }

  handleChange = (e) => {
    const { name, value } = e.target;
    this.setState((prev) => ({ form: { ...prev.form, [name]: value } }));
    if (name === "category" && value) {
      this.setState((prev) => {
        const filtered = prev.recentCategories.filter((c) => c !== value);
        return { recentCategories: [value, ...filtered].slice(0, 3) };
      });
    }
  };

  handleAmountPreset = (amount) => {
    this.setState((prev) => {
      const prevAmount = Number(prev.form.amount.replace(/,/g, "")) || 0;
      const newAmount = prevAmount + amount;
      return { form: { ...prev.form, amount: newAmount.toString() } };
    });
    if (this.amountInputRef.current) {
      this.amountInputRef.current.focus();
    }
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    const { userId, groupId, categories } = this.props;
    const { form, type, fixDate } = this.state;
    const rawAmount = parseInt(form.amount.replace(/,/g, ""), 10);
    const finalAmount = type === "expense" ? rawAmount * -1 : rawAmount;

    console.log("제출 데이터:", {
      form,
      finalAmount,
      userId,
      groupId,
      categories: categories.map((c) => ({
        code: c.code,
        description: c.description,
      })),
    });

    if (!form.category) {
      alert("카테고리를 선택해주세요.");
      return;
    }

    try {
      const result = await addTransaction(
        { ...form, amount: finalAmount },
        userId,
        groupId
      );
      if (result.status === "success") {
        this.context.showPopup("입력 완료!", this.props.userColor ?? null);
        this.setState({
          form: {
            category: "",
            amount: "",
            memo: "",
            date: fixDate ? form.date : getToday(),
          },
          type: "expense",
        });
      } else {
        alert("실패: " + (result.message || "알 수 없는 오류"));
      }
    } catch (err) {
      console.error("에러 발생:", err);
      alert("오류가 발생했습니다. 콘솔을 확인해주세요.");
    }
  };

  render() {
    const { categories, userColor = "#f4a8a8", hoverColor = "#f19191" } = this.props;
    const { form, fixDate, type, memoSuggestions, mode } = this.state;

    return (
      <div>
        <div className="mode-toggle">
          <button
            type="button"
            className={mode === "single" ? "active" : ""}
            onClick={() => this.setState({ mode: "single" })}
          >
            단건
          </button>
          <button
            type="button"
            className={mode === "batch" ? "active" : ""}
            onClick={() => this.setState({ mode: "batch" })}
          >
            다건
          </button>
        </div>

        {mode === "batch" ? (
          <BudgetBatchInputPage
            categories={categories}
            userId={this.props.userId}
            groupId={this.props.groupId}
            userColor={userColor}
            hoverColor={hoverColor}
          />
        ) : (
        <form className="form-container" onSubmit={this.handleSubmit}>
          <DropDown
            name="category"
            options={categories}
            value={form.category}
            onChange={this.handleChange}
            label="대분류코드"
          />
          <div className="amount-type-row">
            <NumericTextBox
              name="amount"
              value={form.amount}
              onChange={this.handleChange}
              inputRef={this.amountInputRef}
              autoFocus
              label="금액"
            />
            <div className="type-tabs">
              {["expense", "income"].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={type === t ? "active" : ""}
                  onClick={() => this.setState({ type: t })}
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
                onClick={() => this.handleAmountPreset(preset)}
              >
                +{preset === 100 ? "1백" : preset === 1000 ? "1천" : preset === 10000 ? "1만" : "10만"}원
              </button>
            ))}
          </div>
          <TextBox
            name="memo"
            value={form.memo}
            onChange={this.handleChange}
            autoCompleteOptions={memoSuggestions}
            label="세부설명"
          />
          <div className="date-wrapper">
            <div className="date-wrapper-header">
              <label className="fix-date-label">
                <input
                  type="checkbox"
                  className="fix-date-checkbox"
                  checked={fixDate}
                  onChange={(e) => this.setState({ fixDate: e.target.checked })}
                />
                <span className="fix-date-text">날짜 고정</span>
              </label>
            </div>
            <DatePicker
              name="date"
              value={form.date}
              onChange={this.handleChange}
              labelText="일자"
            />
          </div>
          <button
            type="submit"
            style={{
              background: `linear-gradient(135deg, ${userColor} 0%, ${hoverColor} 100%)`,
            }}
          >
            추가하기
          </button>
        </form>
        )}

      </div>
    );
  }
}

export default BudgetInputPage;
