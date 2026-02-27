/**
 * BudgetSummaryPage — 예산통계 페이지
 *
 * 월별 예산을 설정하고 지출 현황을 시각적으로 확인하는 페이지.
 * - Recharts PieChart(innerRadius)로 도넛 차트 구현 — 내장 애니메이션 활용
 * - 중앙 카운터 숫자는 easeOutCubic RAF 애니메이션으로 독립 동작
 * - NumericTextBox로 예산 금액 입력
 * - DatePicker(mode="month")로 년월 선택
 * - MonthlyChart: 월별 지출 추이 라인 차트
 * - CategoryChart: 카테고리별 지출 바 차트
 */
import React, { Component } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { saveMonthlyBudget, fetchMonthlySummary } from "@/api/budgetApi";
import MonthlyChart from "../../components/MonthlyChart";
import CategoryChart from "../../components/CategoryChart";
import { NumericTextBox, DatePicker } from "../../components";
import "./BudgetSummaryPage.scss";

function getKSTMonth() {
  const now = new Date();
  const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = kstDate.getFullYear();
  const month = String(kstDate.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** 도넛 차트 툴팁 */
function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bsp-donut-tooltip">
      <span className="bsp-donut-tooltip-name">{name}</span>
      <span className="bsp-donut-tooltip-val">{Number(value).toLocaleString()}원</span>
    </div>
  );
}

class BudgetSummaryPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      month: getKSTMonth(),
      budget: "",
      spent: 0,
      loading: false,
      selectedCategory: null,
      animatedPercent: 0,
    };
    this._animFrame = null;
  }

  componentDidMount() {
    const { userId, groupId } = this.props;
    if (userId || groupId) {
      this.loadSummary();
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const { userId, groupId } = this.props;
    const { month, budget, spent } = this.state;

    if (
      prevProps.userId !== userId ||
      prevProps.groupId !== groupId ||
      prevState.month !== month
    ) {
      if (userId || groupId) {
        this.loadSummary();
      }
    }

    const prevPercent =
      Number(prevState.budget) > 0
        ? (prevState.spent / Number(prevState.budget)) * 100
        : 0;
    const newPercent =
      Number(budget) > 0 ? (spent / Number(budget)) * 100 : 0;

    if (Math.abs(prevPercent - newPercent) > 0.01) {
      this.animatePercent(newPercent);
    }
  }

  componentWillUnmount() {
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
  }

  /** 중앙 퍼센트 숫자 easeOutCubic 카운터 애니메이션 */
  animatePercent(target) {
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
    const duration = 1200;
    let startTime = null;
    const startVal = this.state.animatedPercent;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      this.setState({ animatedPercent: startVal + (target - startVal) * ease });
      if (progress < 1) this._animFrame = requestAnimationFrame(step);
    };

    this._animFrame = requestAnimationFrame(step);
  }

  loadSummary = async () => {
    const { userId, groupId } = this.props;
    const { month } = this.state;
    this.setState({ loading: true });
    try {
      const res = await fetchMonthlySummary(month, userId, groupId);
      if (res.status === "success") {
        this.setState({ budget: res.budget.toString(), spent: res.spent });
      } else {
        alert("데이터 불러오기 실패: " + res.message);
      }
    } catch (err) {
      alert("요청 실패: " + err.message);
    } finally {
      this.setState({ loading: false });
    }
  };

  handleChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value });
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    const { userId, groupId } = this.props;
    const { month, budget } = this.state;
    const res = await saveMonthlyBudget(month, budget, userId, groupId);
    if (res.status === "success") {
      alert("예산이 저장되었습니다!");
      this.loadSummary();
    } else {
      alert("저장 실패: " + res.message);
    }
  };

  handleCategoryClick = (category) => {
    this.setState((prev) => ({
      selectedCategory: prev.selectedCategory === category ? null : category,
    }));
  };

  render() {
    const { userId, groupId, userColor = "#f4a8a8" } = this.props;
    const { month, budget, spent, loading, selectedCategory, animatedPercent } =
      this.state;

    const budgetNum = Number(budget);
    const percent = budgetNum > 0 ? (spent / budgetNum) * 100 : 0;
    const isOver = percent > 100;
    const remaining = budgetNum - spent;

    // ── Recharts 도넛 데이터 ──────────────────────────────────
    let donutData, donutColors, hasPadding;
    if (budgetNum <= 0) {
      // 예산 미설정 — 회색 링
      donutData = [{ name: "미설정", value: 1 }];
      donutColors = ["#f0f0f0"];
      hasPadding = false;
    } else if (isOver) {
      // 초과 — 빨간 링 꽉 참
      donutData = [{ name: "초과", value: spent }];
      donutColors = ["#F04452"];
      hasPadding = false;
    } else {
      // 정상 — 사용(color) + 남은(회색)
      donutData = [
        { name: "사용", value: spent },
        { name: "남은", value: remaining },
      ];
      donutColors = [userColor, "#f0f0f0"];
      hasPadding = spent > 0;
    }

    // 월 타이틀 표시
    const [dispYear, dispMonthNum] = month.split("-");
    const monthLabel =
      dispYear && dispMonthNum
        ? `${dispYear}년 ${parseInt(dispMonthNum, 10)}월`
        : month;

    return (
      <div className="bsp-container">
        <h3 className="bsp-title">{monthLabel} 예산 통계</h3>

        {loading ? (
          <div className="bsp-loading">
            <div className="bsp-spinner" />
            <span>불러오는 중...</span>
          </div>
        ) : (
          <div className="bsp-card bsp-progress-card">
            {/* ── 도넛 차트 ─────────────────────────────── */}
            <div className="bsp-chart-area">
              <div className="bsp-circle-wrap">
                <PieChart width={148} height={148}>
                  <Pie
                    data={donutData}
                    cx={74}
                    cy={74}
                    innerRadius={46}
                    outerRadius={68}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    strokeWidth={0}
                    paddingAngle={hasPadding ? 3 : 0}
                    isAnimationActive
                    animationBegin={100}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  >
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={donutColors[i]} />
                    ))}
                  </Pie>
                  {budgetNum > 0 && (
                    <Tooltip content={<DonutTooltip />} />
                  )}
                  {/* 중앙 텍스트 — SVG 좌표계로 정확한 중앙 배치 */}
                  <text
                    x={80}
                    y={80}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                      fontSize: "28px",
                      fontWeight: 800,
                      letterSpacing: "-1.5px",
                      fill: isOver ? "#F04452" : "#191F28",
                      transition: "fill 0.4s ease",
                      fontFamily: "inherit",
                    }}
                  >
                    {Math.round(animatedPercent)}%
                  </text>
                  <text
                    x={80}
                    y={100}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                      fontSize: "11px",
                      fill: "#8b95a1",
                      fontWeight: 500,
                      letterSpacing: "-0.2px",
                      fontFamily: "inherit",
                    }}
                  >
                    사용률
                  </text>
                </PieChart>
              </div>

              {/* 초과 시 pulse 배지 */}
              {isOver && (
                <div className="bsp-over-badge">초과!</div>
              )}
            </div>

            {/* ── 오른쪽: 입력 + 요약 ────────────────────── */}
            <div className="bsp-info-area">
              <form className="bsp-form" onSubmit={this.handleSubmit}>
                <DatePicker
                  name="month"
                  value={month}
                  onChange={this.handleChange}
                  labelText="년월"
                  mode="month"
                />
                <div className="bsp-budget-row">
                  <NumericTextBox
                    name="budget"
                    value={budget}
                    onChange={this.handleChange}
                    label="예산 (₩)"
                  />
                  <button
                    type="submit"
                    className="bsp-save-btn"
                    style={{ background: userColor }}
                  >
                    저장
                  </button>
                </div>
              </form>

              <div className="bsp-summary">
                <div className="bsp-summary-item">
                  <span className="bsp-lbl">사용</span>
                  <span className="bsp-amt bsp-spent">
                    {spent.toLocaleString()}원
                  </span>
                </div>
                <div className="bsp-summary-item" style={{ animationDelay: "0.07s" }}>
                  <span className="bsp-lbl">예산</span>
                  <span className="bsp-amt bsp-budget-amt">
                    {budgetNum.toLocaleString()}원
                  </span>
                </div>
                {!isOver && budgetNum > 0 && (
                  <div className="bsp-summary-item" style={{ animationDelay: "0.14s" }}>
                    <span className="bsp-lbl">남은 금액</span>
                    <span
                      className="bsp-amt bsp-remaining"
                      style={{ color: userColor }}
                    >
                      {remaining.toLocaleString()}원
                    </span>
                  </div>
                )}
              </div>

              {isOver && (
                <div className="bsp-warning">⚠ 예산을 초과했습니다!</div>
              )}
            </div>
          </div>
        )}

        <MonthlyChart userId={userId} groupId={groupId} userColor={userColor} />

        <CategoryChart
          month={month}
          userId={userId}
          groupId={groupId}
          userColor={userColor}
          onCategoryClick={this.handleCategoryClick}
        />

        {selectedCategory && (
          <div className="bsp-selected-category">
            <h4>선택된 카테고리: {selectedCategory}</h4>
            <p>이 카테고리의 상세 정보를 보려면 "월별 보기" 탭에서 확인하세요.</p>
          </div>
        )}
      </div>
    );
  }
}

export default BudgetSummaryPage;
