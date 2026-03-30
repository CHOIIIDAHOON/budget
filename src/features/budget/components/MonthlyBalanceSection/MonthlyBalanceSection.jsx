import React, { Component } from "react";
import { fetchGroupMembers, fetchMonthlyBalances, saveMonthlyBalance } from "@/api/budgetApi";
import { NumericTextBox, DatePicker } from "@/features/budget/components";
import "./MonthlyBalanceSection.scss";

function getKSTMonth() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, "0")}`;
}

class MonthlyBalanceSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      members: [],
      // { [userId]: { month, amount, memo, history, saving, historyOpen } }
      memberStates: {},
    };
  }

  componentDidMount() {
    const { groupId } = this.props;
    if (groupId) this.loadMembers();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.groupId !== this.props.groupId && this.props.groupId) {
      this.loadMembers();
    }
  }

  loadMembers = async () => {
    const { groupId } = this.props;
    try {
      const members = await fetchGroupMembers(groupId);
      const memberStates = {};
      for (const m of members) {
        const history = await fetchMonthlyBalances(m.id, 12);
        memberStates[m.id] = {
          month: getKSTMonth(),
          amount: "",
          memo: "",
          saving: false,
          historyOpen: false,
          history,
        };
        // 현재 월 잔액이 있으면 초기값으로 세팅
        const current = history.find((h) => h.month === getKSTMonth());
        if (current) {
          memberStates[m.id].amount = String(current.amount);
          memberStates[m.id].memo = current.memo || "";
        }
      }
      this.setState({ members, memberStates });
    } catch (err) {
      console.error("멤버 로딩 실패:", err);
    }
  };

  handleFieldChange = (userId, e) => {
    const { name, value } = e.target;
    this.setState((prev) => ({
      memberStates: {
        ...prev.memberStates,
        [userId]: { ...prev.memberStates[userId], [name]: value },
      },
    }));
  };

  handleMonthChange = async (userId, e) => {
    const { value: month } = e.target;
    this.setState((prev) => ({
      memberStates: {
        ...prev.memberStates,
        [userId]: { ...prev.memberStates[userId], month, amount: "", memo: "" },
      },
    }));
    // 해당 월 데이터 로드
    const history = this.state.memberStates[userId]?.history || [];
    const found = history.find((h) => h.month === month);
    if (found) {
      this.setState((prev) => ({
        memberStates: {
          ...prev.memberStates,
          [userId]: {
            ...prev.memberStates[userId],
            month,
            amount: String(found.amount),
            memo: found.memo || "",
          },
        },
      }));
    }
  };

  handleSave = async (userId) => {
    const ms = this.state.memberStates[userId];
    if (!ms || ms.amount === "") return;

    this.setState((prev) => ({
      memberStates: {
        ...prev.memberStates,
        [userId]: { ...prev.memberStates[userId], saving: true },
      },
    }));

    try {
      await saveMonthlyBalance(ms.month, Number(ms.amount), userId, ms.memo);
      const history = await fetchMonthlyBalances(userId, 12);
      this.setState((prev) => ({
        memberStates: {
          ...prev.memberStates,
          [userId]: { ...prev.memberStates[userId], saving: false, history },
        },
      }));
    } catch (err) {
      console.error("저장 실패:", err);
      this.setState((prev) => ({
        memberStates: {
          ...prev.memberStates,
          [userId]: { ...prev.memberStates[userId], saving: false },
        },
      }));
    }
  };

  toggleHistory = (userId) => {
    this.setState((prev) => ({
      memberStates: {
        ...prev.memberStates,
        [userId]: {
          ...prev.memberStates[userId],
          historyOpen: !prev.memberStates[userId].historyOpen,
        },
      },
    }));
  };

  render() {
    const { userColor = "#f4a8a8" } = this.props;
    const { members, memberStates } = this.state;

    if (!members.length) return null;

    return (
      <div className="mbs-container">
        <h4 className="mbs-title">월별 잔액</h4>
        <div className="mbs-members">
          {members.map((member) => {
            const ms = memberStates[member.id];
            if (!ms) return null;

            // 히스토리 내림차순(최신순)
            const sorted = [...ms.history].sort((a, b) => b.month.localeCompare(a.month));

            return (
              <div key={member.id} className="mbs-card">
                <div className="mbs-card-header">
                  <span className="mbs-username" style={{ color: userColor }}>
                    {member.username}
                  </span>
                </div>

                <div className="mbs-form">
                  <DatePicker
                    name="month"
                    value={ms.month}
                    onChange={(e) => this.handleMonthChange(member.id, e)}
                    mode="month"
                  />
                  <NumericTextBox
                    name="amount"
                    value={ms.amount}
                    onChange={(e) => this.handleFieldChange(member.id, e)}
                    label="잔액 (₩)"
                  />
                  <button
                    className="mbs-save-btn"
                    style={{ background: userColor }}
                    onClick={() => this.handleSave(member.id)}
                    disabled={ms.saving}
                  >
                    {ms.saving ? "저장 중..." : "저장"}
                  </button>
                </div>

                <button
                  className="mbs-toggle-btn"
                  onClick={() => this.toggleHistory(member.id)}
                >
                  {ms.historyOpen ? "▲ 히스토리 접기" : "▼ 월별 히스토리"}
                </button>

                {ms.historyOpen && (
                  <div className="mbs-history">
                    {sorted.length === 0 ? (
                      <p className="mbs-empty">데이터 없음</p>
                    ) : (
                      <table className="mbs-table">
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
                                <td className="mbs-amount">
                                  {Number(row.amount).toLocaleString()}원
                                </td>
                                <td
                                  className={
                                    delta === null
                                      ? "mbs-delta-none"
                                      : delta >= 0
                                      ? "mbs-delta-plus"
                                      : "mbs-delta-minus"
                                  }
                                >
                                  {delta === null
                                    ? "-"
                                    : delta >= 0
                                    ? `+${delta.toLocaleString()}`
                                    : delta.toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

export default MonthlyBalanceSection;
