import { Component } from "react";
import {
  fetchGroupMembers,
  fetchMonthlyBalances,
  fetchMonthlyAutoBalances,
  saveMonthlyBalance,
  saveMemberSalary,
  fetchMemberSalaries,
  fetchGroupMonthlySpending,
  fetchGroupMonthlyIncome,
} from "@/api/budgetApi";
import { NumericTextBox, DatePicker } from "@/features/budget/components";
import { UIFeedbackContext } from "@/features/budget/components/UIFeedback";
import { formatKoreanAmount } from "@/shared/utils/number";
import "./MonthlyBalancePage.scss";

function shortMonth(month) {
  if (!month) return month;
  const parts = month.split("-");
  if (parts.length !== 2) return month;
  return `${parts[0].slice(2)}.${parts[1]}`;
}

function getKSTMonth() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, "0")}`;
}

class MonthlyBalancePage extends Component {
  static contextType = UIFeedbackContext;

  constructor(props) {
    super(props);
    this.state = {
      // 개인용
      month: getKSTMonth(),
      amount: "",
      saving: false,
      history: [],
      autoBalances: [],
      // 개인 월급 (salaryGroupId 있을 때)
      personalSalaryInput: "",
      // { month: { amount } }
      personalSalaryMap: {},
      salarySaving: false,
      // 그룹용 (테이블)
      members: [],
      // { month: { userId: { amount } } }
      salaryMap: {},
      // { month: totalIncome }
      groupIncomeMap: {},
      groupSpendingMap: {},
      groupMonths: [],
    };
  }

  componentDidMount() {
    const { groupId, userId } = this.props;
    if (groupId) this.loadGroup();
    else if (userId) this.loadPersonal();
  }

  componentDidUpdate(prevProps) {
    const { groupId, userId, salaryGroupId } = this.props;
    if (
      prevProps.groupId !== groupId ||
      prevProps.userId !== userId ||
      prevProps.salaryGroupId !== salaryGroupId
    ) {
      if (groupId) this.loadGroup();
      else if (userId) this.loadPersonal();
    }
  }

  loadPersonal = async () => {
    const { userId, salaryGroupId } = this.props;
    try {
      const fetches = [
        fetchMonthlyBalances(userId, 12),
        fetchMonthlyAutoBalances(userId, null, 12),
      ];
      if (salaryGroupId) fetches.push(fetchMemberSalaries(salaryGroupId, 12));

      const [history, autoBalances, salaryRows] = await Promise.all(fetches);

      const currentMonth = getKSTMonth();
      const current = history.find((h) => h.month === currentMonth);
      const autoCalc = autoBalances.find((b) => b.month === currentMonth);

      const personalSalaryMap = {};
      if (salaryRows) {
        salaryRows
          .filter((r) => r.user_id === userId)
          .forEach((r) => {
            personalSalaryMap[r.month] = { amount: Number(r.amount) };
          });
      }

      const cur = personalSalaryMap[currentMonth];
      this.setState({
        history,
        autoBalances,
        month: currentMonth,
        amount: current ? String(current.amount) : (autoCalc ? String(autoCalc.remaining) : ""),
        personalSalaryMap,
        personalSalaryInput: cur ? String(cur.amount) : "",
      });
    } catch (err) {
      console.error("잔액 로딩 실패:", err);
    }
  };

  loadGroup = async () => {
    const { groupId } = this.props;
    try {
      const members = await fetchGroupMembers(groupId);

      const [salaryRows, groupSpendingMap, groupIncomeMap] = await Promise.all([
        fetchMemberSalaries(groupId, 12),
        fetchGroupMonthlySpending(groupId, 12),
        fetchGroupMonthlyIncome(groupId, 12),
      ]);

      const salaryMap = {};
      salaryRows.forEach((row) => {
        if (!salaryMap[row.month]) salaryMap[row.month] = {};
        salaryMap[row.month][row.user_id] = { amount: Number(row.amount) };
      });

      const monthSet = new Set([getKSTMonth()]);
      Object.keys(salaryMap).forEach((m) => monthSet.add(m));
      Object.keys(groupSpendingMap).forEach((m) => monthSet.add(m));
      Object.keys(groupIncomeMap).forEach((m) => monthSet.add(m));
      const groupMonths = [...monthSet].sort((a, b) => b.localeCompare(a));

      this.setState({ members, salaryMap, groupIncomeMap, groupSpendingMap, groupMonths });
    } catch (err) {
      console.error("그룹 잔액 로딩 실패:", err);
    }
  };

  handleMonthChange = (e) => {
    const month = e.target.value;
    const { history, autoBalances, personalSalaryMap } = this.state;
    const found = history.find((h) => h.month === month);
    const autoCalc = autoBalances.find((b) => b.month === month);
    const cur = personalSalaryMap[month];
    this.setState({
      month,
      amount: found ? String(found.amount) : (autoCalc ? String(autoCalc.remaining) : ""),
      personalSalaryInput: cur ? String(cur.amount) : "",
    });
  };

  handleSave = async () => {
    const { userId } = this.props;
    const { month, amount } = this.state;
    if (!amount) return;
    this.setState({ saving: true });
    try {
      await saveMonthlyBalance(month, Number(amount), userId);
      const history = await fetchMonthlyBalances(userId, 12);
      this.setState({ saving: false, history });
      this.context.showSnackbar("저장 완료", "잔액이 저장되었습니다.", "✅");
    } catch (err) {
      console.error("저장 실패:", err);
      this.setState({ saving: false });
      this.context.showSnackbar("오류", err.message, "❌");
    }
  };

  handlePersonalSalarySave = async () => {
    const { userId, salaryGroupId } = this.props;
    const { month, personalSalaryInput } = this.state;
    if (!personalSalaryInput) return;
    this.setState({ salarySaving: true });
    try {
      await saveMemberSalary(month, userId, salaryGroupId, Number(personalSalaryInput));
      this.setState((prev) => ({
        salarySaving: false,
        personalSalaryMap: {
          ...prev.personalSalaryMap,
          [month]: { amount: Number(personalSalaryInput) },
        },
      }));
      this.context.showSnackbar("저장 완료", "월급이 저장되었습니다.", "✅");
    } catch (err) {
      console.error("월급 저장 실패:", err);
      this.setState({ salarySaving: false });
      this.context.showSnackbar("오류", err.message, "❌");
    }
  };

  renderPersonal() {
    const { userColor = "#f4a8a8", salaryGroupId } = this.props;
    const {
      month, amount, saving, autoBalances,
      personalSalaryInput, salarySaving,
    } = this.state;
    const sorted = [...autoBalances].sort((a, b) => b.month.localeCompare(a.month));
    const currentCalc = autoBalances.find((b) => b.month === month);

    return (
      <>
        <div className="mbp-card">
          <DatePicker
            name="month"
            value={month}
            onChange={this.handleMonthChange}
            mode="month"
          />
          {currentCalc && (
            <div className="mbp-auto-summary">
              <div className="mbp-auto-row">
                <span className="mbp-auto-label">예산</span>
                <span className="mbp-auto-value">{formatKoreanAmount(currentCalc.budget)}</span>
              </div>
              <div className="mbp-auto-row">
                <span className="mbp-auto-label">지출</span>
                <span className="mbp-auto-value mbp-spent">{formatKoreanAmount(currentCalc.spent)}</span>
              </div>
              <div className="mbp-auto-divider" />
              <div className="mbp-auto-row mbp-auto-row--total">
                <span className="mbp-auto-label">계산 잔액</span>
                <span className={`mbp-auto-value mbp-auto-remaining ${currentCalc.remaining >= 0 ? "mbp-positive" : "mbp-negative"}`}>
                  {formatKoreanAmount(currentCalc.remaining)}
                </span>
              </div>
            </div>
          )}
          <NumericTextBox
            name="amount"
            value={amount}
            onChange={(e) => this.setState({ amount: e.target.value })}
            label="실제 잔액 (₩)"
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

        {salaryGroupId && (
          <div className="mbp-card">
            <p className="mbp-salary-title">우리집 월급</p>
            <NumericTextBox
              name="personalSalary"
              value={personalSalaryInput}
              onChange={(e) => this.setState({ personalSalaryInput: e.target.value })}
              label="월급 (₩)"
            />
            <button
              className="mbp-save-btn"
              style={{ background: userColor }}
              onClick={this.handlePersonalSalarySave}
              disabled={salarySaving || !personalSalaryInput}
            >
              {salarySaving ? "저장 중..." : "월급 저장"}
            </button>
          </div>
        )}

        <div className="mbp-history-wrap">
          <h5 className="mbp-history-title">월별 잔액 내역</h5>
          {sorted.length === 0 ? (
            <p className="mbp-empty">데이터가 없습니다.</p>
          ) : (
            <div className="mbp-table-scroll">
            <table className="mbp-table">
              <thead>
                <tr>
                  <th>월</th>
                  <th>예산</th>
                  <th>지출</th>
                  <th>잔액</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr key={row.month}>
                    <td>{shortMonth(row.month)}</td>
                    <td className="mbp-td-right">{row.budget > 0 ? formatKoreanAmount(row.budget) : "-"}</td>
                    <td className="mbp-td-right mbp-spent-text">{row.spent > 0 ? formatKoreanAmount(row.spent) : "-"}</td>
                    <td className={`mbp-td-right mbp-bold ${row.remaining >= 0 ? "mbp-delta-plus" : "mbp-delta-minus"}`}>
                      {row.budget === 0 && row.spent === 0 ? "-" : formatKoreanAmount(row.remaining)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </>
    );
  }

  renderGroup() {
    const { members, salaryMap, groupIncomeMap, groupSpendingMap, groupMonths } = this.state;

    return (
      <div className="mbp-history-wrap">
        <h5 className="mbp-history-title">월별 현황</h5>
        {groupMonths.length === 0 ? (
          <p className="mbp-empty">데이터가 없습니다.</p>
        ) : (
          <div className="mbp-table-scroll">
          <table className="mbp-table">
            <thead>
              <tr>
                <th>월</th>
                {members.map((m) => (
                  <th key={m.id}>{m.username}<br /><span className="mbp-th-sub">월급</span></th>
                ))}
                <th>기타<br /><span className="mbp-th-sub">수입</span></th>
                <th>우리집<br /><span className="mbp-th-sub">소비</span></th>
                <th>합계<br /><span className="mbp-th-sub">수입</span></th>
                <th>남은돈</th>
              </tr>
            </thead>
            <tbody>
              {groupMonths.map((m) => {
                const salaries = members.map((mem) => salaryMap[m]?.[mem.id]?.amount ?? 0);
                const totalSalary = salaries.reduce((s, a) => s + a, 0);
                const totalGroupIncome = groupIncomeMap[m] ?? 0;
                const otherIncome = totalGroupIncome - totalSalary;
                const groupSpent = groupSpendingMap[m] ?? 0;
                const remaining = totalGroupIncome - groupSpent;
                const hasData = totalGroupIncome > 0 || groupSpent > 0;

                return (
                  <tr key={m}>
                    <td>{shortMonth(m)}</td>
                    {salaries.map((amt, i) => (
                      <td key={members[i].id} className="mbp-td-right">
                        {amt > 0 ? formatKoreanAmount(amt) : "-"}
                      </td>
                    ))}
                    <td className="mbp-td-right">
                      {otherIncome > 0 ? formatKoreanAmount(otherIncome) : "-"}
                    </td>
                    <td className="mbp-td-right mbp-spent-text">
                      {groupSpent > 0 ? formatKoreanAmount(groupSpent) : "-"}
                    </td>
                    <td className="mbp-td-right mbp-bold">
                      {totalGroupIncome > 0 ? formatKoreanAmount(totalGroupIncome) : "-"}
                    </td>
                    <td className={`mbp-td-right mbp-bold ${!hasData ? "" : remaining >= 0 ? "mbp-delta-plus" : "mbp-delta-minus"}`}>
                      {!hasData ? "-" : formatKoreanAmount(remaining)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
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
