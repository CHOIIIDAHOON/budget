import React from "react";
import {
  fetchBudgetData,
  fetchFixedCosts,
  fetchGroupMembers,
  fetchPersonalExpensesForGroupMembers,
} from "@/api";
import "./SavingsSimulator.scss";

export default class SavingsSimulator extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      groupTxs: [],
      fixedCosts: [],
      members: [],
      memberAvgExpenses: {},

      fixedCostReductions: {},
      memberReductions: {},
      targetMonths: 12,
    };
  }

  componentDidMount() {
    this.loadData();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.groupId !== this.props.groupId) {
      this.loadData();
    }
  }

  loadData = async () => {
    const { groupId } = this.props;
    if (!groupId) return;
    this.setState({ loading: true });

    try {
      const [groupTxs, fixedCosts, members] = await Promise.all([
        fetchBudgetData({ groupId }),
        fetchFixedCosts(null, groupId),
        fetchGroupMembers(groupId),
      ]);

      const memberIds = members.map((m) => m.id);
      const now = new Date();
      const recentMonths = [];
      for (let i = 0; i < 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        recentMonths.push(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        );
      }

      const expensesByMonth = await Promise.all(
        recentMonths.map((m) =>
          fetchPersonalExpensesForGroupMembers(m, memberIds)
        )
      );

      const memberAvgExpenses = {};
      for (const userId of memberIds) {
        const monthsWithData = expensesByMonth.filter(
          (m) => m[userId] != null && m[userId] > 0
        );
        memberAvgExpenses[userId] =
          monthsWithData.length > 0
            ? Math.round(
                monthsWithData.reduce((sum, m) => sum + (m[userId] || 0), 0) /
                  monthsWithData.length
              )
            : 0;
      }

      const memberReductions = {};
      members.forEach((m) => {
        memberReductions[m.id] = 0;
      });

      this.setState({
        groupTxs,
        fixedCosts,
        members,
        memberAvgExpenses,
        memberReductions,
        loading: false,
      });
    } catch (err) {
      console.error("시뮬레이터 로딩 실패:", err);
      this.setState({ loading: false });
    }
  };

  getMonthlyStats = () => {
    const { groupTxs } = this.state;

    const byMonth = {};
    groupTxs.forEach((tx) => {
      const month = tx.date.slice(0, 7);
      if (!byMonth[month]) byMonth[month] = { income: 0, expense: 0 };
      const amt = Number(tx.amount);
      if (amt > 0) byMonth[month].income += amt;
      else byMonth[month].expense += -amt;
    });

    const months = Object.keys(byMonth).sort().slice(-6);
    if (months.length === 0)
      return { income: 0, expense: 0, saving: 0, dataMonths: 0 };

    const data = months.map((m) => byMonth[m]);
    const n = data.length;
    const avgIncome = Math.round(
      data.reduce((s, m) => s + m.income, 0) / n
    );
    const avgExpense = Math.round(
      data.reduce((s, m) => s + m.expense, 0) / n
    );

    return {
      income: avgIncome,
      expense: avgExpense,
      saving: avgIncome - avgExpense,
      dataMonths: n,
    };
  };

  toggleFixedCost = (id, amount) => {
    this.setState((prev) => {
      const next = { ...prev.fixedCostReductions };
      if (id in next) {
        delete next[id];
      } else {
        next[id] = Number(amount);
      }
      return { fixedCostReductions: next };
    });
  };

  setFixedCostReduction = (id, value) => {
    const num = Math.max(0, Number(value) || 0);
    this.setState((prev) => ({
      fixedCostReductions: { ...prev.fixedCostReductions, [id]: num },
    }));
  };

  setMemberReduction = (userId, value) => {
    this.setState((prev) => ({
      memberReductions: { ...prev.memberReductions, [userId]: Number(value) },
    }));
  };

  render() {
    const {
      loading,
      fixedCosts,
      members,
      memberAvgExpenses,
      fixedCostReductions,
      memberReductions,
      targetMonths,
    } = this.state;

    if (loading) {
      return <div className="sim-loading">데이터 불러오는 중...</div>;
    }

    const { income, expense, saving, dataMonths } = this.getMonthlyStats();

    const fixedReduction = Object.values(fixedCostReductions).reduce(
      (sum, v) => sum + v,
      0
    );

    const memberReduction = Object.values(memberReductions).reduce(
      (sum, v) => sum + v,
      0
    );
    const totalMonthlyGain = fixedReduction + memberReduction;
    const improvedSaving = saving + totalMonthlyGain;

    const fmt = (n) => Math.abs(Math.round(n)).toLocaleString();
    const isPos = (n) => n >= 0;

    return (
      <div className="sim-container">
        {/* 현재 월 평균 */}
        <div className="sim-section">
          <div className="sim-section-title">
            📊 현재 월 평균
            {dataMonths > 0 && (
              <span className="sim-subtitle"> (최근 {dataMonths}개월 기준)</span>
            )}
          </div>
          <div className="sim-stat-row">
            <span className="sim-label">수입</span>
            <span className="sim-value sim-income">+{fmt(income)}원</span>
          </div>
          <div className="sim-stat-row">
            <span className="sim-label">지출</span>
            <span className="sim-value sim-expense">-{fmt(expense)}원</span>
          </div>
          <div className="sim-stat-row sim-saving-row">
            <span className="sim-label">월 저축</span>
            <span className={`sim-value ${isPos(saving) ? "sim-positive" : "sim-negative"}`}>
              {isPos(saving) ? "+" : "-"}{fmt(saving)}원
            </span>
          </div>
        </div>

        {/* 기간 선택 + 예상 저축 */}
        <div className="sim-section">
          <div className="sim-section-title">🗓️ 기간별 예상 저축</div>
          <div className="sim-period-btns">
            {[6, 12, 24].map((m) => (
              <button
                key={m}
                className={`sim-period-btn ${targetMonths === m ? "sim-period-btn-active" : ""}`}
                onClick={() => this.setState({ targetMonths: m })}
              >
                {m}개월
              </button>
            ))}
          </div>
          <div className="sim-projection">
            <div className="sim-proj-label">현재 패턴대로라면</div>
            <div className={`sim-proj-value ${isPos(saving) ? "sim-positive" : "sim-negative"}`}>
              {isPos(saving) ? "+" : "-"}{fmt(saving * targetMonths)}원
            </div>
          </div>
        </div>

        {/* 고정비 절감 */}
        {fixedCosts.length > 0 && (
          <div className="sim-section">
            <div className="sim-section-title">🔧 고정비 절감 시뮬레이션</div>
            <div className="sim-section-desc">체크 후 절감액을 직접 수정할 수 있어요</div>
            {fixedCosts.map((fc) => {
              const checked = fc.id in fixedCostReductions;
              return (
                <div key={fc.id} className={`sim-fixed-item${checked ? " sim-fixed-item-checked" : ""}`}>
                  <input
                    type="checkbox"
                    id={`fc-${fc.id}`}
                    checked={checked}
                    onChange={() => this.toggleFixedCost(fc.id, fc.amount)}
                    className="sim-checkbox"
                  />
                  <label htmlFor={`fc-${fc.id}`} className="sim-fixed-name">
                    {fc.memo || "고정비"}
                  </label>
                  <div className="sim-fixed-right">
                    {checked ? (
                      <input
                        type="number"
                        value={fixedCostReductions[fc.id]}
                        onChange={(e) => this.setFixedCostReduction(fc.id, e.target.value)}
                        className="sim-fixed-input"
                        min={0}
                        max={fc.amount}
                      />
                    ) : (
                      <span className="sim-fixed-amount-static">{fmt(fc.amount)}</span>
                    )}
                    <span className="sim-fixed-unit">원/월</span>
                  </div>
                </div>
              );
            })}
            {fixedReduction > 0 && (
              <div className="sim-reduction-badge">
                → 월 {fmt(fixedReduction)}원 절약 가능
              </div>
            )}
          </div>
        )}

        {/* 멤버별 생활비 절감 */}
        {members.some((m) => (memberAvgExpenses[m.id] || 0) > 0) && (
          <div className="sim-section">
            <div className="sim-section-title">👥 멤버별 생활비 절감</div>
            <div className="sim-section-desc">
              개인 지출 절감 목표를 슬라이더로 설정하세요
            </div>
            {members.map((m) => {
              const current = memberAvgExpenses[m.id] || 0;
              const reduction = memberReductions[m.id] || 0;
              if (current === 0) return null;
              return (
                <div key={m.id} className="sim-member-item">
                  <div className="sim-member-header">
                    <span className="sim-member-name">{m.username}</span>
                    <span className="sim-member-current">
                      월 평균 {fmt(current)}원
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={current}
                    step={10000}
                    value={reduction}
                    onChange={(e) =>
                      this.setMemberReduction(m.id, e.target.value)
                    }
                    className="sim-slider"
                    style={{ "--pct": `${current > 0 ? (reduction / current) * 100 : 0}%` }}
                  />
                  <div className="sim-member-footer">
                    <span>0원</span>
                    <span className={reduction > 0 ? "sim-positive sim-bold" : "sim-muted"}>
                      {reduction > 0 ? `${fmt(reduction)}원 절감` : "절감 없음"}
                    </span>
                    <span>{fmt(current)}원</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 시뮬레이션 결과 */}
        {totalMonthlyGain > 0 && (
          <div className="sim-section sim-result-section">
            <div className="sim-section-title">✨ 절감 후 예상 결과</div>
            <div className="sim-result-row">
              <span className="sim-label">월 추가 절약</span>
              <span className="sim-positive sim-bold">+{fmt(totalMonthlyGain)}원</span>
            </div>
            <div className="sim-result-row">
              <span className="sim-label">개선된 월 저축</span>
              <span className={`sim-bold ${isPos(improvedSaving) ? "sim-positive" : "sim-negative"}`}>
                {isPos(improvedSaving) ? "+" : "-"}{fmt(improvedSaving)}원
              </span>
            </div>
            <div className="sim-result-divider" />
            <div className="sim-result-big">
              <div className="sim-result-period">{targetMonths}개월 뒤 예상</div>
              <div className="sim-result-compare">
                <div className="sim-result-before">
                  현재: {isPos(saving) ? "+" : "-"}{fmt(saving * targetMonths)}원
                </div>
                <div className="sim-result-arrow">↓</div>
                <div className="sim-result-after">
                  {isPos(improvedSaving) ? "+" : "-"}{fmt(improvedSaving * targetMonths)}원
                </div>
              </div>
              <div className="sim-result-gain">
                {fmt(totalMonthlyGain * targetMonths)}원을 더 모을 수 있어요 🎉
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}
