import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import React from "react";
import "./BudgetReceiptCard.scss";

/**
 * 예산 요약 카드 — 영수증 스타일
 *
 * Props:
 *   selMonth        {string}   선택된 월 (YYYY-MM)
 *   summary         {object}   { budget: number, spent: number }
 *   summaryLoading  {boolean}  로딩 여부
 *   expanded        {boolean}  카테고리 펼침 여부
 *   catSummary      {Array}    카테고리별 지출 요약
 *   totalIncome     {number}   월 총 수입
 *   totalExpense    {number}   월 총 지출 (개인지출 포함)
 *   netProfit       {number}   순이익
 *   groupId         {string}   그룹 ID (없으면 개인 컨텍스트)
 *   userColor       {string}   테마 색상
 *   hoverColor      {string}   테마 호버 색상
 *   checkedMembers  {object}   { memberId: boolean }
 *   selCatCode      {string}   선택된 카테고리 코드
 *   onExpandToggle  {function} 펼침/접기 토글 콜백
 *   onAllMembersCheck {function} 전체 멤버 체크 콜백
 *   onCatSelect     {function} 카테고리 선택 콜백
 */
export default function BudgetReceiptCard({
  selMonth,
  summary,
  summaryLoading,
  expanded,
  catSummary,
  totalIncome,
  totalExpense,
  netProfit,
  groupId,
  userColor,
  checkedMembers,
  selCatCode,
  onExpandToggle,
  onAllMembersCheck,
  onCatSelect,
}) {
  const allChecked =
    Object.keys(checkedMembers).length === 0
      ? true
      : Object.values(checkedMembers).every((v) => v);

  return (
    <div className="receipt-wrapper">
      <div
        className="receipt-card"
        style={{ "--receipt-accent": userColor || "#f4a8a8" }}
      >
        {/* ── 헤더 ── */}
        <div className="receipt-header">
          <div className="receipt-title">예산 요약</div>
          <div className="receipt-month">{selMonth}</div>
        </div>

        <div className="receipt-divider-solid" />

        {summaryLoading ? (
          <div className="receipt-loading">
            <div className="receipt-spinner" />
          </div>
        ) : (
          <>
            {/* ── 예산 ── */}
            <div className="receipt-row">
              <span className="receipt-label">예산</span>
              <span className="receipt-amount budget">
                {summary.budget.toLocaleString()}원
              </span>
            </div>

            {/* ── 수입 (그룹만) ── */}
            {groupId && (
              <div className="receipt-row">
                <span className="receipt-label">수입</span>
                <span className="receipt-amount income">
                  +{totalIncome.toLocaleString()}원
                </span>
              </div>
            )}

            {/* ── 지출 ── */}
            <div className="receipt-row">
              <span className="receipt-label">지출</span>
              <div className="receipt-amount-col">
                <span className="receipt-amount expense">
                  -{totalExpense.toLocaleString()}원
                </span>
                {groupId && (
                  <label
                    className="receipt-checkbox-label"
                    style={{ "--checkbox-color": userColor || "#f4a8a8" }}
                  >
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={(e) => onAllMembersCheck(e.target.checked)}
                    />
                    <span>개인지출 포함</span>
                  </label>
                )}
              </div>
            </div>

            {/* ── 순이익 (그룹만) ── */}
            {groupId && (
              <>
                <div className="receipt-divider-double" />
                <div className="receipt-row net-row">
                  <span className="receipt-label-net">순이익</span>
                  <span
                    className={`receipt-amount-net ${
                      netProfit >= 0 ? "positive" : "negative"
                    }`}
                  >
                    {netProfit >= 0 ? "+" : "-"}
                    {Math.abs(netProfit).toLocaleString()}원
                  </span>
                </div>
              </>
            )}

            {/* ── 토글 버튼 ── */}
            <div className="receipt-toggle">
              <button onClick={onExpandToggle}>
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </button>
            </div>

            {/* ── 카테고리별 요약 ── */}
            <div className={`receipt-categories${expanded ? " open" : ""}`}>
              {catSummary.length === 0 ? (
                <p className="receipt-empty">지출 내역이 없습니다.</p>
              ) : (
                <ul className="receipt-cat-list">
                  {catSummary
                    .slice()
                    .sort((a, b) => b.total - a.total)
                    .map((catData, idx) => {
                      const pct =
                        summary.spent > 0
                          ? Math.round((catData.total / summary.spent) * 100)
                          : 0;
                      const isSelected = selCatCode === catData.category;
                      return (
                        <li
                          key={idx}
                          className={`receipt-cat-item${isSelected ? " selected" : ""}`}
                          onClick={() => onCatSelect(catData.category)}
                          style={
                            isSelected
                              ? { backgroundColor: userColor || "#d1e7ff" }
                              : {}
                          }
                        >
                          <span className="receipt-cat-name">{catData.name}</span>
                          <span className="receipt-cat-amount">
                            {catData.total.toLocaleString()}원{" "}
                            <span className="receipt-cat-pct">({pct}%)</span>
                          </span>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
