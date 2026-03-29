import React, { Component } from "react";
import * as XLSX from "xlsx";
import { addTransactions, fetchBudgetData } from "../../../../api/budgetApi";
import { DropDown, DatePicker, UIFeedbackContext } from "../../components";
import "./DongbaekImportPage.scss";

class DongbaekImportPage extends Component {
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
    return parseInt(str.replace(/,/g, ""), 10) || 0;
  }

  parseDate(str) {
    if (!str) return "";
    return str.replace(/\./g, "-");
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

      let headerIdx = -1;
      let period = "";
      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (row[1] === "거래일련번호") headerIdx = i;
        if (row[1] === "조회기간" && row[2]) period = row[2];
      }

      if (headerIdx === -1) {
        alert("동백전 거래내역 형식의 파일이 아닙니다.");
        return;
      }

      const rows = [];
      for (let i = headerIdx + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row[1] || !row[3]) continue;
        if (row[2] !== "결제" && row[2] !== "충전") continue;

        const totalAmount = this.parseAmount(row[5]);
        const cashback = this.parseAmount(row[8]);
        const netAmount = totalAmount - cashback;

        rows.push({
          id: Date.now() + Math.random(),
          checked: true,
          date: this.parseDate(row[3]),
          memo: row[10] || "",
          totalAmount,
          cashback,
          netAmount,
          category: "",
          isDuplicate: false,
        });
      }

      if (rows.length === 0) {
        alert("가져올 거래 내역이 없습니다.");
        return;
      }

      // 기존 거래와 중복 체크 (date + amount 기준)
      try {
        const { userId, groupId } = this.props;
        const existing = await fetchBudgetData({ userId, groupId });
        const dates = rows.map((r) => r.date).filter(Boolean);
        const minDate = dates.reduce((a, b) => (a < b ? a : b));
        const maxDate = dates.reduce((a, b) => (a > b ? a : b));
        const inRange = existing.filter(
          (tx) => tx.date >= minDate && tx.date <= maxDate
        );

        const round1000 = (n) => Math.round(n / 1000) * 1000;
        const checkedRows = rows.map((row) => {
          const isDuplicate = inRange.some(
            (tx) =>
              tx.date === row.date &&
              round1000(Math.abs(Number(tx.amount))) === round1000(row.netAmount)
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
      amount: -Math.abs(r.netAmount),
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
    const { categories, userColor = "#f4a8a8", hoverColor = "#f19191" } = this.props;
    const { rows, period, isSubmitting } = this.state;
    const checkedCount = this.getCheckedRows().length;
    const validCount = this.getValidRows().length;
    const allChecked = rows.length > 0 && rows.every((r) => r.checked);

    return (
      <div className="dongbaek-container">

        <div className="upload-area" onClick={() => this.fileInputRef.current?.click()}>
          <input
            ref={this.fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={this.handleFileChange}
            style={{ display: "none" }}
          />
          📂 동백전 거래내역 엑셀 파일 선택
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
                        onChange={(e) => this.updateRow(row.id, "category", e.target.value)}
                        label="카테고리"
                      />
                    </div>
                    <DatePicker
                      name="date"
                      value={row.date}
                      size="sm"
                      onChange={(e) => this.updateRow(row.id, "date", e.target.value)}
                      labelText="날짜"
                    />
                  </div>

                  {/* 줄2: 금액 + 메모 */}
                  <div className="row-line row-mid">
                    <div className="float-wrap amount-wrap">
                      <input
                        type="text"
                        className="amount-input"
                        value={row.netAmount.toLocaleString()}
                        readOnly
                        placeholder=" "
                      />
                      <label className="float-label">
                        {row.cashback > 0
                          ? `${row.totalAmount.toLocaleString()} - ${row.cashback.toLocaleString()}`
                          : "금액"}
                      </label>
                    </div>
                    <div className="float-wrap memo-wrap">
                      <input
                        type="text"
                        className="memo-input"
                        placeholder=" "
                        value={row.memo}
                        onChange={(e) => this.updateRow(row.id, "memo", e.target.value)}
                      />
                      <label className="float-label">가맹점명</label>
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
                background: validCount > 0
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

export default DongbaekImportPage;
