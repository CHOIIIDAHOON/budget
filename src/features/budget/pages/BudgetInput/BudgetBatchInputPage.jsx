import { Component } from "react";
import { addTransactions } from "../../../../api/budgetApi";
import { getToday } from "../../../../shared/utils/date";
import { formatWithComma, parseAmount } from "../../../../shared/utils/number";
import { DropDown, DatePicker, UIFeedbackContext } from "../../components";
import "./BudgetBatchInputPage.scss";

class BudgetBatchInputPage extends Component {
  static contextType = UIFeedbackContext;

  createEmptyRow() {
    return {
      id: Date.now() + Math.random(),
      category: "",
      amount: "",
      memo: "",
      date: getToday(),
      type: "expense",
    };
  }

  constructor(props) {
    super(props);
    this.state = {
      rows: [this.createEmptyRow()],
      isSubmitting: false,
    };
  }

  addRow = () => {
    this.setState((prev) => {
      const lastRow = prev.rows[prev.rows.length - 1];
      const newRow = { ...this.createEmptyRow(), date: lastRow ? lastRow.date : getToday() };
      return { rows: [...prev.rows, newRow] };
    });
  };

  removeRow = (id) => {
    this.setState((prev) => {
      if (prev.rows.length <= 1) return null;
      return { rows: prev.rows.filter((r) => r.id !== id) };
    });
  };

  updateRow = (id, field, value) => {
    this.setState((prev) => ({
      rows: prev.rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    }));
  };

  toggleType = (id) => {
    this.setState((prev) => ({
      rows: prev.rows.map((r) =>
        r.id === id
          ? { ...r, type: r.type === "expense" ? "income" : "expense" }
          : r
      ),
    }));
  };

  getValidRows() {
    return this.state.rows.filter(
      (r) => r.category && r.amount && Number(r.amount) !== 0
    );
  }

  handleSubmitAll = async () => {
    const { userId, groupId } = this.props;
    const validRows = this.getValidRows();

    if (validRows.length === 0) {
      alert("카테고리와 금액을 입력한 항목이 없습니다.");
      return;
    }

    const transactions = validRows.map((r) => {
      const raw = parseInt(r.amount, 10);
      return {
        category: r.category,
        amount: r.type === "expense" ? raw * -1 : raw,
        memo: r.memo,
        date: r.date,
      };
    });

    this.setState({ isSubmitting: true });
    try {
      const result = await addTransactions(transactions, userId, groupId);
      if (result.status === "success") {
        this.context.showPopup(
          `${validRows.length}건 입력 완료!`,
          this.props.userColor ?? null
        );
        this.setState({ rows: [this.createEmptyRow()] });
      } else {
        alert("실패: " + (result.message || "알 수 없는 오류"));
      }
    } catch (err) {
      console.error("에러 발생:", err);
      alert("오류가 발생했습니다. 콘솔을 확인해주세요.");
    } finally {
      this.setState({ isSubmitting: false });
    }
  };

  render() {
    const { categories, userColor = "#f4a8a8", hoverColor = "#f19191" } = this.props;
    const { rows, isSubmitting } = this.state;
    const validCount = this.getValidRows().length;

    return (
      <div className="batch-container">
        <div className="batch-table">
          {rows.map((row, idx) => (
            <div key={row.id} className="batch-row">
              <span className="row-num">{idx + 1}</span>
              <button
                type="button"
                className="remove-btn"
                onClick={() => this.removeRow(row.id)}
                disabled={rows.length <= 1}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 3.5H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M5 3.5V2.5C5 2.224 5.224 2 5.5 2H8.5C8.776 2 9 2.224 9 2.5V3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M3 3.5L3.6 11C3.627 11.55 4.05 12 4.6 12H9.4C9.95 12 10.373 11.55 10.4 11L11 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 6V9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M5.2 6L5.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M8.8 6L8.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
              {/* 줄 1: 지출/수입 + 카테고리 + 날짜 */}
              <div className="row-line row-top">
                <button
                  type="button"
                  className={`type-badge ${row.type}`}
                  onClick={() => this.toggleType(row.id)}
                >
                  {row.type === "expense" ? "지출" : "수입"}
                </button>
                <div className="cell-category">
                  <DropDown
                    name="category"
                    options={categories}
                    value={row.category}
                    onChange={(e) => this.updateRow(row.id, "category", e.target.value)}
                    label="카테고리"
                  />
                </div>
                <DatePicker
                  name="date"
                  value={row.date}
                  onChange={(e) => this.updateRow(row.id, "date", e.target.value)}
                  labelText="날짜"
                />
              </div>

              {/* 줄 2: 금액 + 메모 */}
              <div className="row-line row-mid">
                <div className="float-wrap amount-wrap">
                  <input
                    type="text"
                    inputMode="numeric"
                    className="amount-input"
                    placeholder=" "
                    value={formatWithComma(row.amount)}
                    onChange={(e) => this.updateRow(row.id, "amount", parseAmount(e.target.value))}
                  />
                  <label className="float-label">금액</label>
                </div>
                <div className="float-wrap memo-wrap">
                  <input
                    type="text"
                    className="memo-input"
                    placeholder=" "
                    value={row.memo}
                    onChange={(e) => this.updateRow(row.id, "memo", e.target.value)}
                  />
                  <label className="float-label">메모</label>
                </div>
              </div>

            </div>
          ))}
        </div>

        <button type="button" className="add-row-btn" onClick={this.addRow}>
          + 행 추가
        </button>

        <button
          type="button"
          className="submit-all-btn"
          onClick={this.handleSubmitAll}
          disabled={isSubmitting || validCount === 0}
          style={{
            background:
              validCount > 0
                ? `linear-gradient(135deg, ${userColor} 0%, ${hoverColor} 100%)`
                : undefined,
          }}
        >
          {isSubmitting ? "저장 중..." : `전체 저장 (${validCount}건)`}
        </button>
      </div>
    );
  }
}

export default BudgetBatchInputPage;
