import React, { Component } from "react";
import { addTransactions } from "../../../../api/budgetApi";
import { getToday } from "../../../../shared/utils/date";
import DropDown from "../../../../features/budget/components/dropdown/DropDown";
import { UIFeedbackContext } from "../../../../features/budget/components/UIFeedback";
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
    this.setState((prev) => ({
      rows: [...prev.rows, this.createEmptyRow()],
    }));
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
              {/* 줄 1: 번호 + 카테고리 + 삭제 */}
              <div className="row-line row-top">
                <span className="row-num">{idx + 1}</span>
                <div className="cell-category">
                  <DropDown
                    name="category"
                    options={categories}
                    value={row.category}
                    onChange={(e) => this.updateRow(row.id, "category", e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => this.removeRow(row.id)}
                  disabled={rows.length <= 1}
                >
                  ✕
                </button>
              </div>

              {/* 줄 2: 지출/수입 + 금액 + 날짜 */}
              <div className="row-line row-mid">
                <button
                  type="button"
                  className={`type-badge ${row.type}`}
                  onClick={() => this.toggleType(row.id)}
                >
                  {row.type === "expense" ? "지출" : "수입"}
                </button>
                <input
                  type="number"
                  className="amount-input"
                  placeholder="0"
                  value={row.amount}
                  onChange={(e) => this.updateRow(row.id, "amount", e.target.value)}
                />
                <input
                  type="date"
                  className="date-input"
                  value={row.date}
                  onChange={(e) => this.updateRow(row.id, "date", e.target.value)}
                />
              </div>

              {/* 줄 3: 메모 */}
              <input
                type="text"
                className="memo-input"
                placeholder="메모 (선택)"
                value={row.memo}
                onChange={(e) => this.updateRow(row.id, "memo", e.target.value)}
              />

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
