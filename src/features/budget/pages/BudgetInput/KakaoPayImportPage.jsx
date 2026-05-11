import React, { Component } from "react";
import * as XLSX from "xlsx";
import { addTransactions, fetchBudgetData } from "../../../../api/budgetApi";
import { DropDown, DatePicker, UIFeedbackContext } from "../../components";
import "./KakaoPayImportPage.scss";

class KakaoPayImportPage extends Component {
  static contextType = UIFeedbackContext;

  constructor(props) {
    super(props);
    this.state = {
      rows: [],
      period: "",
      isSubmitting: false,
    };
    this.fileInputRef = React.createRef();
  }

  parseAmount(str) {
    if (!str || str === "-") return 0;
    const cleaned = str.replace(/원$/, "").replace(/,/g, "");
    return parseInt(cleaned, 10) || 0;
  }

  parseDate(str) {
    if (!str) return "";
    // "2026-03-31 21:17:42" → "2026-03-31"
    return str.slice(0, 10);
  }

  handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = evt.target.result;
      const wb = XLSX.read(data, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

      if (!rawData.length || rawData[0][0] !== "날짜") {
        alert("카카오페이 거래내역 형식의 파일이 아닙니다.");
        return;
      }

      // 기간 계산 (첫 번째 ~ 마지막 날짜)
      const rows = [];
      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row[0] || !row[2]) continue;

        const amount = this.parseAmount(row[2]);
        if (amount === 0) continue;

        rows.push({
          id: Date.now() + Math.random(),
          checked: true,
          date: this.parseDate(row[0]),
          memo: row[1] || "",
          amount,
          category: "",
          isDuplicate: false,
        });
      }

      if (rows.length === 0) {
        alert("가져올 거래 내역이 없습니다.");
        return;
      }

      const dates = rows.map((r) => r.date).filter(Boolean);
      const minDate = dates.reduce((a, b) => (a < b ? a : b));
      const maxDate = dates.reduce((a, b) => (a > b ? a : b));
      const period = minDate === maxDate ? minDate : `${minDate} ~ ${maxDate}`;

      // 중복 체크
      try {
        const { userId, groupId } = this.props;
        const existing = await fetchBudgetData({ userId, groupId });
        const inRange = existing.filter(
          (tx) => tx.date >= minDate && tx.date <= maxDate
        );

        const round1000 = (n) => Math.round(n / 1000) * 1000;
        const checkedRows = rows.map((row) => {
          const isDuplicate = inRange.some(
            (tx) =>
              tx.date === row.date &&
              round1000(Math.abs(Number(tx.amount))) ===
                round1000(Math.abs(row.amount))
          );
          return { ...row, isDuplicate, checked: !isDuplicate };
        });

        this.setState({ rows: checkedRows, period });
      } catch {
        this.setState({ rows, period });
      }
    };
    reader.readAsBinaryString(file);
  };

  updateRow = (id, field, value) => {
    this.setState((prev) => ({
      rows: prev.rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    }));
  };

  toggleCheck = (id) => {
    this.setState((prev) => ({
      rows: prev.rows.map((r) =>
        r.id === id ? { ...r, checked: !r.checked } : r
      ),
    }));
  };

  toggleAll = (checked) => {
    this.setState((prev) => ({
      rows: prev.rows.map((r) => ({ ...r, checked })),
    }));
  };

  getValidRows() {
    return this.state.rows.filter((r) => r.checked && r.category);
  }

  getCheckedRows() {
    return this.state.rows.filter((r) => r.checked);
  }

  handleSubmit = async () => {
    const { userId, groupId } = this.props;
    const validRows = this.getValidRows();

    if (validRows.length === 0) {
      alert("카테고리가 선택된 체크 항목이 없습니다.");
      return;
    }

    const transactions = validRows.map((r) => ({
      category: r.category,
      amount: r.amount, // 부호 그대로 (음수=지출, 양수=수입)
      memo: r.memo,
      date: r.date,
    }));

    this.setState({ isSubmitting: true });
    try {
      const result = await addTransactions(transactions, userId, groupId);
      if (result.status === "success") {
        this.context.showPopup(
          `${validRows.length}건 가져오기 완료!`,
          this.props.userColor ?? null
        );
        this.setState({ rows: [], period: "" });
        if (this.fileInputRef.current) this.fileInputRef.current.value = "";
      } else {
        alert("실패: " + (result.message || "알 수 없는 오류"));
      }
    } catch (err) {
      console.error("에러 발생:", err);
      alert("오류가 발생했습니다.");
    } finally {
      this.setState({ isSubmitting: false });
    }
  };

  render() {
    const { categories, userColor = "#f4a8a8", hoverColor = "#f19191" } =
      this.props;
    const { rows, period, isSubmitting } = this.state;
    const checkedCount = this.getCheckedRows().length;
    const validCount = this.getValidRows().length;
    const allChecked = rows.length > 0 && rows.every((r) => r.checked);

    return (
      <div className="kakaopay-container">
        <div
          className="upload-area"
          onClick={() => this.fileInputRef.current?.click()}
        >
          <input
            ref={this.fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={this.handleFileChange}
            style={{ display: "none" }}
          />
          📂 카카오페이 거래내역 엑셀 파일 선택
        </div>

        {period && <p className="period-text">조회기간: {period}</p>}

        {rows.length > 0 && (
          <>
            <label className="check-all">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={(e) => this.toggleAll(e.target.checked)}
              />
              전체 선택 ({checkedCount}/{rows.length})
            </label>

            <div className="import-table">
              {rows.map((row, idx) => (
                <div
                  key={row.id}
                  className={`import-row${!row.checked ? " unchecked" : ""}${row.isDuplicate ? " duplicate" : ""}`}
                >
                  <span className="row-num">{idx + 1}</span>
                  {row.isDuplicate && (
                    <span className="duplicate-badge">중복 의심</span>
                  )}

                  {/* 줄1: 체크 + 카테고리 + 날짜 */}
                  <div className="row-line row-top">
                    <input
                      type="checkbox"
                      className="row-check"
                      checked={row.checked}
                      onChange={() => this.toggleCheck(row.id)}
                    />
                    <div className="cell-category">
                      <DropDown
                        name="category"
                        options={categories}
                        value={row.category}
                        onChange={(e) =>
                          this.updateRow(row.id, "category", e.target.value)
                        }
                        label="카테고리"
                      />
                    </div>
                    <DatePicker
                      name="date"
                      value={row.date}
                      size="sm"
                      onChange={(e) =>
                        this.updateRow(row.id, "date", e.target.value)
                      }
                      labelText="날짜"
                    />
                  </div>

                  {/* 줄2: 금액 + 메모 */}
                  <div className="row-line row-mid">
                    <div className="float-wrap amount-wrap">
                      <input
                        type="text"
                        className={`amount-input${row.amount > 0 ? " income" : ""}`}
                        value={Math.abs(row.amount).toLocaleString()}
                        readOnly
                        placeholder=" "
                      />
                      <label className="float-label">
                        {row.amount > 0 ? "수입" : "금액"}
                      </label>
                    </div>
                    <div className="float-wrap memo-wrap">
                      <input
                        type="text"
                        className="memo-input"
                        placeholder=" "
                        value={row.memo}
                        onChange={(e) =>
                          this.updateRow(row.id, "memo", e.target.value)
                        }
                      />
                      <label className="float-label">사용처</label>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="import-btn"
              onClick={this.handleSubmit}
              disabled={isSubmitting || validCount === 0}
              style={{
                background:
                  validCount > 0
                    ? `linear-gradient(135deg, ${userColor} 0%, ${hoverColor} 100%)`
                    : undefined,
              }}
            >
              {isSubmitting ? "저장 중..." : `${validCount}건 가져오기`}
            </button>
          </>
        )}
      </div>
    );
  }
}

export default KakaoPayImportPage;
