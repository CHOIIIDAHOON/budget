import React, { Component } from "react";
import { fetchGroupMembers, fetchMonthlyBalances, saveMonthlyBalance } from "@/api/budgetApi";
import { NumericTextBox, DatePicker } from "@/features/budget/components";
import { formatKoreanAmount } from "@/shared/utils/number";
import "./MonthlyBalancePage.scss";

function getKSTMonth() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, "0")}`;
}

class MonthlyBalancePage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // 개인용
      month: getKSTMonth(),
      amount: "",
      saving: false,
      history: [],
      // 그룹용
      members: [],
      historyMap: {},
    };
  }

  componentDidMount() {
    const { groupId, userId } = this.props;
    if (groupId) this.loadGroup();
    else if (userId) this.loadPersonal();
  }

  componentDidUpdate(prevProps) {
    const { groupId, userId } = this.props;
    if (prevProps.groupId !== groupId || prevProps.userId !== userId) {
      if (groupId) this.loadGroup();
      else if (userId) this.loadPersonal();
    }
  }

  loadPersonal = async () => {
    const { userId } = this.props;
    try {
      const history = await fetchMonthlyBalances(userId, 12);
      const currentMonth = getKSTMonth();
      const current = history.find((h) => h.month === currentMonth);
      this.setState({
        history,
        month: currentMonth,
        amount: current ? String(current.amount) : "",
      });
    } catch (err) {
      console.error("잔액 로딩 실패:", err);
    }
  };

  loadGroup = async () => {
    const { groupId } = this.props;
    try {
      const members = await fetchGroupMembers(groupId);
      const historyMap = {};
      for (const m of members) {
        historyMap[m.id] = await fetchMonthlyBalances(m.id, 12);
      }
      this.setState({ members, historyMap });
    } catch (err) {
      console.error("그룹 잔액 로딩 실패:", err);
    }
  };

  handleMonthChange = (e) => {
    const month = e.target.value;
    const { history } = this.state;
    const found = history.find((h) => h.month === month);
    this.setState({ month, amount: found ? String(found.amount) : "" });
  };

  handleSave = async () => {
    const { userId } = this.props;
    const { month, amount, historyMap } = this.state;
    if (!amount) return;
    this.setState({ saving: true });
    try {
      await saveMonthlyBalance(month, Number(amount), userId);
      const history = await fetchMonthlyBalances(userId, 12);
      this.setState({ saving: false, history, historyMap });
    } catch (err) {
      console.error("저장 실패:", err);
      this.setState({ saving: false });
    }
  };

  getAllMonths() {
    const { historyMap } = this.state;
    const monthSet = new Set();
    Object.values(historyMap).forEach((hist) => hist.forEach((h) => monthSet.add(h.month)));
    return [...monthSet].sort((a, b) => b.localeCompare(a));
  }

  renderPersonal() {
    const { userColor = "#f4a8a8" } = this.props;
    const { month, amount, saving, history } = this.state;
    const sorted = [...history].sort((a, b) => b.month.localeCompare(a.month));

    return (
      <>
        <div className="mbp-card">
          <DatePicker
            name="month"
            value={month}
            onChange={this.handleMonthChange}
            mode="month"
          />
          <NumericTextBox
            name="amount"
            value={amount}
            onChange={(e) => this.setState({ amount: e.target.value })}
            label="잔액 (₩)"
          />
          <button
            className="mbp-save-btn"
            style={{ background: userColor }}
            onClick={this.handleSave}
            disabled={saving || !amount}
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>

        <div className="mbp-history-wrap">
          <h5 className="mbp-history-title">월별 히스토리</h5>
          {sorted.length === 0 ? (
            <p className="mbp-empty">입력된 데이터가 없습니다.</p>
          ) : (
            <table className="mbp-table">
              <thead>
                <tr>
                  <th>월</th>
                  <th>잔액</th>
                  <th>변동</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, idx) => {
                  const prev = sorted[idx + 1];
                  const delta = prev ? row.amount - prev.amount : null;
                  return (
                    <tr key={row.month}>
                      <td>{row.month}</td>
                      <td className="mbp-td-right">{formatKoreanAmount(row.amount)}</td>
                      <td className={delta === null ? "mbp-delta-none" : delta >= 0 ? "mbp-delta-plus" : "mbp-delta-minus"}>
                        {delta === null ? "-" : delta >= 0 ? `+${formatKoreanAmount(delta)}` : `-${formatKoreanAmount(Math.abs(delta))}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </>
    );
  }

  renderGroup() {
    const { members, historyMap } = this.state;
    const months = this.getAllMonths();

    return (
      <div className="mbp-history-wrap">
        <h5 className="mbp-history-title">월별 잔액 현황</h5>
        {months.length === 0 ? (
          <p className="mbp-empty">입력된 데이터가 없습니다.</p>
        ) : (
          <table className="mbp-table">
            <thead>
              <tr>
                <th>월</th>
                {members.map((m) => <th key={m.id}>{m.username}</th>)}
                <th>합계</th>
                <th>변동</th>
              </tr>
            </thead>
            <tbody>
              {months.map((month, rowIdx) => {
                const amounts = members.map((m) => {
                  const h = historyMap[m.id]?.find((r) => r.month === month);
                  return h ? Number(h.amount) : null;
                });
                const total = amounts.reduce((s, a) => s + (a ?? 0), 0);
                const prevMonth = months[rowIdx + 1];
                let delta = null;
                if (prevMonth) {
                  const prevTotal = members.reduce((s, m) => {
                    const h = historyMap[m.id]?.find((r) => r.month === prevMonth);
                    return s + (h ? Number(h.amount) : 0);
                  }, 0);
                  delta = total - prevTotal;
                }
                return (
                  <tr key={month}>
                    <td>{month}</td>
                    {amounts.map((amt, i) => (
                      <td key={members[i].id} className="mbp-td-right">
                        {amt !== null ? formatKoreanAmount(amt) : "-"}
                      </td>
                    ))}
                    <td className="mbp-td-right mbp-bold">{formatKoreanAmount(total)}</td>
                    <td className={delta === null ? "mbp-delta-none" : delta >= 0 ? "mbp-delta-plus" : "mbp-delta-minus"}>
                      {delta === null ? "-" : delta >= 0 ? `+${formatKoreanAmount(delta)}` : `-${formatKoreanAmount(Math.abs(delta))}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  render() {
    const { groupId } = this.props;
    return (
      <div className="mbp-container">
        {groupId ? this.renderGroup() : this.renderPersonal()}
      </div>
    );
  }
}

export default MonthlyBalancePage;
