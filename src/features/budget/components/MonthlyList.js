import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import {
  deleteTransaction,
  fetchBudgetData,
  fetchCategories,
  fetchCategorySummary,
  fetchGroupMembers,
  fetchMonthlySummary,
  fetchPersonalExpensesForGroupMembers,
  fetchSharedGroups,
  fetchUsers,
  updateTransaction,
} from "../../../api/budgetApi";
import { getMatchedIcon } from "../../../shared/utils/iconMap";
import EditDialog from "./EditDialog";
import "./MonthlyList.css";

// 상수 정의
const INITIAL_VISIBLE_COUNT = 15;
const LOAD_MORE_COUNT = 15;
const SCROLL_THRESHOLD = 100;
const SCROLL_DELAY = 300;
const HIGHLIGHT_DURATION = 1500;

const MonthlyList = forwardRef(
  ({ userId, groupId, userColor, hoverColor }, ref) => {
    // === 상태 관리 ===
    const [transactions, setTransactions] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState("");
    const [budgetSummary, setBudgetSummary] = useState({ budget: 0, spent: 0 });
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [visibleTransactionCount, setVisibleTransactionCount] = useState(
      INITIAL_VISIBLE_COUNT
    );
    const [categories, setCategories] = useState([]);
    const [categorySummaryList, setCategorySummaryList] = useState([]);
    const [isDetailExpanded, setIsDetailExpanded] = useState(false);
    const [selectedCategoryCode, setSelectedCategoryCode] = useState(null);
    const [memberPersonalExpenses, setMemberPersonalExpenses] = useState({});
    const [groupMemberList, setGroupMemberList] = useState([]);
    const [checkedMemberIds, setCheckedMemberIds] = useState({});
    const [isSummaryLoading, setIsSummaryLoading] = useState(true);
    const [userList, setUserList] = useState([]);
    const [groupList, setGroupList] = useState([]);

    // === 계산된 값 ===
    // 월별 목록 생성 (최신순 정렬)
    const availableMonths = [
      ...new Set(transactions.map((tx) => tx.date?.slice(0, 7))),
    ]
      .sort()
      .reverse();

    // 선택된 월과 카테고리로 필터링된 거래 내역
    const filteredTransactions = transactions
      .filter((tx) => tx.date?.startsWith(selectedMonth))
      .filter((tx) =>
        selectedCategoryCode ? tx.category === selectedCategoryCode : true
      );

    // 현재 월의 모든 거래 내역
    const currentMonthTransactions = transactions.filter((tx) =>
      tx.date?.startsWith(selectedMonth)
    );

    // 현재 월 총 수입 계산
    const calculateTotalIncome = (transactionList) => {
      return transactionList
        .filter((tx) => Number(tx.amount) > 0)
        .reduce((sum, tx) => sum + Number(tx.amount), 0);
    };
    const totalMonthlyIncome = calculateTotalIncome(currentMonthTransactions);

    // 체크된 멤버들의 개인지출 합계 계산
    const calculateIncludedPersonalExpenses = () => {
      return groupMemberList.reduce((sum, member) => {
        return checkedMemberIds[member.id]
          ? sum + (memberPersonalExpenses[member.id] || 0)
          : sum;
      }, 0);
    };
    const includedPersonalExpenseTotal = calculateIncludedPersonalExpenses();

    // 최종 지출 및 순이익 계산
    const totalExpenseWithPersonal = groupId
      ? budgetSummary.spent + includedPersonalExpenseTotal
      : budgetSummary.spent;
    const netProfit = totalMonthlyIncome - totalExpenseWithPersonal;

    // 화면에 표시할 거래 내역 (무한 스크롤 적용)
    const displayedTransactions = filteredTransactions.slice(
      0,
      visibleTransactionCount
    );

    // === 핸들러 함수 ===
    // 거래 삭제 처리
    const handleTransactionDelete = async (transaction) => {
      const isConfirmed = window.confirm("정말 삭제하시겠습니까?");
      if (!isConfirmed) return;

      try {
        await deleteTransaction(transaction.id);
        const updatedTransactions = transactions.filter(
          (tx) => tx.id !== transaction.id
        );
        setTransactions(updatedTransactions);
      } catch (error) {
        console.error("삭제 실패:", error);
        alert("삭제 중 오류가 발생했습니다.");
      }
    };

    // 거래 수정 저장 처리
    const handleTransactionEditSave = async (updatedData) => {
      try {
        await updateTransaction(
          editingTransaction,
          updatedData,
          userId,
          groupId
        );

        const isOwnerChanged =
          updatedData.userId !== editingTransaction.user_id ||
          updatedData.groupId !== editingTransaction.shared_group_id;

        // ✅ 1. 소속이 바뀐 경우 → 현재 리스트에서 제거
        if (isOwnerChanged) {
          setTransactions((prev) =>
            prev.filter((tx) => tx !== editingTransaction)
          );
        }
        // ✅ 2. 소속 유지 → 기존처럼 값만 갱신
        else {
          setTransactions((prev) =>
            prev.map((tx) =>
              tx === editingTransaction
                ? {
                    ...tx,
                    amount:
                      updatedData.type === "expense"
                        ? -Math.abs(updatedData.amount)
                        : Math.abs(updatedData.amount),
                    memo: updatedData.memo,
                    category: updatedData.category,
                    date: updatedData.date,
                    category_name:
                      categories.find((c) => c.code === updatedData.category)
                        ?.description || "카테고리 수정",
                  }
                : tx
            )
          );
        }

        setIsEditDialogOpen(false);

        if (selectedMonth) {
          await refreshSummaryData();
        }
      } catch (error) {
        console.error("수정 실패:", error);
        alert("수정 중 오류가 발생했습니다.");
      }
    };

    // 월 변경 처리
    const handleMonthChange = (month) => {
      setSelectedMonth(month);
      setSelectedCategoryCode(null);
    };

    // 카테고리 선택 처리
    const handleCategorySelect = (categoryCode) => {
      const isCurrentlySelected = selectedCategoryCode === categoryCode;
      setSelectedCategoryCode(isCurrentlySelected ? null : categoryCode);

      // 리스트 영역으로 스크롤
      const listElement = document.querySelector(".list");
      if (listElement) {
        listElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    // 개인지출 포함 전체 체크박스 처리
    const handleAllMembersCheckToggle = (isChecked) => {
      const updatedCheckedState = {};
      const allMembers = [
        ...groupMemberList,
        ...(userId ? [{ id: userId }] : []),
      ];
      allMembers.forEach((member) => {
        updatedCheckedState[member.id] = isChecked;
      });
      setCheckedMemberIds(updatedCheckedState);
    };

    // 요약 데이터 새로고침
    const refreshSummaryData = async () => {
      const [summaryResponse, categoryResponse] = await Promise.all([
        fetchMonthlySummary(selectedMonth, userId, groupId),
        fetchCategorySummary(selectedMonth, userId, groupId),
      ]);
      setBudgetSummary({
        budget: summaryResponse.budget,
        spent: summaryResponse.spent,
      });
      setCategorySummaryList(categoryResponse);
    };

    // 특정 거래로 스크롤
    const scrollToTransaction = (transactionId) => {
      const element = document.getElementById(`tx-${transactionId}`);

      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        element.classList.add("highlight");
        setTimeout(
          () => element.classList.remove("highlight"),
          HIGHLIGHT_DURATION
        );
      } else {
        console.warn("❌ 스크롤 대상 요소가 아직 DOM에 없음:", transactionId);
      }
    };

    // === Effect Hooks ===
    // 사용자 및 그룹 정보 로드
    useEffect(() => {
      const loadUsersAndGroups = async () => {
        try {
          const usersResponse = await fetchUsers();
          setUserList(usersResponse);

          if (userId) {
            const groupsResponse = await fetchSharedGroups(userId);
            setGroupList(groupsResponse);
          }
        } catch (error) {
          console.error("소유자 정보 불러오기 실패", error);
        }
      };

      loadUsersAndGroups();
    }, [userId]);

    // 그룹 멤버 및 개인지출 정보 로드
    useEffect(() => {
      const loadGroupMemberDetails = async () => {
        if (!groupId || !selectedMonth) return;

        try {
          const members = await fetchGroupMembers(groupId);
          const memberIds = members.map((m) => m.id);
          const expenses = await fetchPersonalExpensesForGroupMembers(
            selectedMonth,
            memberIds
          );

          setGroupMemberList(members);
          setMemberPersonalExpenses(expenses);

          // 초기 체크 상태: 모든 멤버 true
          const initialCheckedState = {};
          members.forEach((member) => {
            initialCheckedState[member.id] = true;
          });
          setCheckedMemberIds(initialCheckedState);
        } catch (error) {
          // 로딩 실패 시 조용히 처리
        }
      };

      loadGroupMemberDetails();
    }, [groupId, selectedMonth]);

    // 거래 내역 및 카테고리 로드
    useEffect(() => {
      if (!userId && !groupId) return;

      const loadTransactionsAndCategories = async () => {
        const transactionsResponse = await fetchBudgetData({ userId, groupId });
        setTransactions(transactionsResponse);

        const months = [
          ...new Set(transactionsResponse.map((tx) => tx.date?.slice(0, 7))),
        ]
          .sort()
          .reverse();

        if (months.length > 0) {
          const today = new Date();
          const currentMonth = today.toISOString().slice(0, 7);

          // 현재 달이 있으면 선택, 없으면 최신 달 선택
          setSelectedMonth(
            months.includes(currentMonth) ? currentMonth : months[0]
          );
        }

        const categoriesResponse = await fetchCategories({ userId, groupId });
        setCategories(categoriesResponse);
      };

      loadTransactionsAndCategories();
      setSelectedCategoryCode(null);
    }, [userId, groupId]);

    // 월별 요약 데이터 로드
    useEffect(() => {
      const loadMonthlySummaryData = async () => {
        if (!selectedMonth || (!userId && !groupId)) return;

        // 상태 초기화
        setBudgetSummary({ budget: 0, spent: 0 });
        setCategorySummaryList([]);
        setGroupMemberList([]);
        setMemberPersonalExpenses({});
        setCheckedMemberIds({});
        setIsSummaryLoading(true);

        try {
          const [summaryResponse, categoryResponse] = await Promise.all([
            fetchMonthlySummary(selectedMonth, userId, groupId),
            fetchCategorySummary(selectedMonth, userId, groupId),
          ]);

          setBudgetSummary({
            budget: summaryResponse.budget,
            spent: summaryResponse.spent,
          });
          setCategorySummaryList(categoryResponse);

          // 그룹인 경우 멤버 정보 추가 로드
          if (groupId) {
            const members = await fetchGroupMembers(groupId);
            const memberIds = members.map((m) => m.id);
            const expenses = await fetchPersonalExpensesForGroupMembers(
              selectedMonth,
              memberIds
            );

            setGroupMemberList(members);
            setMemberPersonalExpenses(expenses);

            const initialCheckedState = {};
            members.forEach((member) => {
              initialCheckedState[member.id] = true;
            });
            setCheckedMemberIds(initialCheckedState);
          }
        } catch (error) {
          console.error("로딩 실패", error);
        } finally {
          setIsSummaryLoading(false);
        }
      };

      loadMonthlySummaryData();
    }, [selectedMonth, userId, groupId]);

    // 무한 스크롤 처리
    useEffect(() => {
      const handleScroll = () => {
        const isNearBottom =
          window.innerHeight + window.scrollY >=
          document.body.offsetHeight - SCROLL_THRESHOLD;

        if (isNearBottom) {
          setVisibleTransactionCount((prev) =>
            Math.min(prev + LOAD_MORE_COUNT, filteredTransactions.length)
          );
        }
      };

      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }, [filteredTransactions]);

    // 월/카테고리 변경 시 표시 개수 초기화
    useEffect(() => {
      setVisibleTransactionCount(INITIAL_VISIBLE_COUNT);
    }, [selectedMonth, selectedCategoryCode]);

    // === Imperative Handle (부모 컴포넌트 접근용) ===
    useImperativeHandle(ref, () => ({
      scrollToTransactionById: (transactionId, dateString) => {
        const transactionMonth = dateString?.slice(0, 7);
        if (transactionMonth !== selectedMonth) {
          setSelectedMonth(transactionMonth);
          setTimeout(() => scrollToTransaction(transactionId), SCROLL_DELAY);
        } else {
          scrollToTransaction(transactionId);
        }
      },
    }));

    // === 렌더링 헬퍼 함수 ===
    // 카테고리 요약 항목 렌더링
    const renderCategorySummaryItem = (categoryData, index) => {
      const percentageOfTotal =
        budgetSummary.spent > 0
          ? Math.round((categoryData.total / budgetSummary.spent) * 100)
          : 0;
      const isSelected = selectedCategoryCode === categoryData.category;

      return (
        <li
          key={index}
          className={`category-item ${isSelected ? "clicked" : ""}`}
          onClick={() => handleCategorySelect(categoryData.category)}
          style={{
            cursor: "pointer",
            backgroundColor: isSelected
              ? userColor || "#d1e7ff"
              : "transparent",
          }}
        >
          <span className="category-name">{categoryData.name}</span>
          <span className="category-amount">
            {categoryData.total.toLocaleString()}원{" "}
            <span className="category-percent">({percentageOfTotal}%)</span>
          </span>
        </li>
      );
    };

    // 거래 항목 렌더링
    const renderTransactionItem = (transaction, index) => {
      const amount = Number(transaction.amount);
      const isExpense = amount < 0;
      const formattedAmount = Math.abs(amount).toLocaleString();
      const dayOfMonth = transaction.date?.slice(8, 10);
      const previousDayOfMonth = displayedTransactions[index - 1]?.date?.slice(
        8,
        10
      );
      const isNewDay = dayOfMonth !== previousDayOfMonth;

      // 해당 일의 총 금액 계산
      const dayTotal = filteredTransactions
        .filter((tx) => tx.date?.slice(8, 10) === dayOfMonth)
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

      return (
        <React.Fragment key={index}>
          {isNewDay && (
            <div className="date-label-wrapper">
              <div className="date-label">{dayOfMonth}일</div>
              <div className="day-total">{dayTotal.toLocaleString()}원</div>
            </div>
          )}
          <li
            id={`tx-${transaction.id}`}
            className="item"
            style={isNewDay ? { borderTop: "3px solid #ddd" } : {}}
          >
            {/* ✅ 버튼들을 div로 감싸기 */}
            <div className="item-actions">
              <button
                className="edit-btn"
                onClick={() => {
                  setEditingTransaction(transaction);
                  setIsEditDialogOpen(true);
                }}
              >
                <EditIcon fontSize="small" />
              </button>
              <button
                className="delete-btn"
                onClick={() => handleTransactionDelete(transaction)}
              >
                <CloseIcon fontSize="small" />
              </button>
            </div>

            <div className="desc">
              <div className="left-block">
                <div className="category">
                  <span className="category-badge">
                    {transaction.category_name || transaction.category}
                  </span>
                  {transaction.is_deleted && (
                    <span className="badge-deleted">삭제된 카테고리</span>
                  )}
                </div>
                {transaction.memo && (
                  <div className="memo">
                    {getMatchedIcon(transaction.memo) && (
                      <img
                        src={getMatchedIcon(transaction.memo)}
                        alt="memo icon"
                        className="memo-icon"
                      />
                    )}
                    {transaction.memo}
                  </div>
                )}
              </div>
              <span className={`amount ${isExpense ? "expense" : "income"}`}>
                {isExpense ? "-" : "+"}
                {formattedAmount}원
              </span>
            </div>
          </li>
        </React.Fragment>
      );
    };

    // === 메인 렌더링 ===
    return (
      <div className="monthly-container">
        {/* 월 선택 탭 */}
        <div
          className="month-scroll-bar"
          style={{
            "--scroll-color": userColor
              ? `${userColor}60`
              : "rgba(0, 100, 255, 0.3)",
            "--scroll-hover-color": userColor
              ? `${userColor}99`
              : "rgba(0, 100, 255, 0.5)",
          }}
        >
          {availableMonths.map((month) => (
            <button
              key={month}
              className={`month-tab ${month === selectedMonth ? "active" : ""}`}
              onClick={() => handleMonthChange(month)}
              style={{
                backgroundColor:
                  month === selectedMonth ? userColor : "transparent",
                color: month === selectedMonth ? "white" : "#444",
                border: `1.5px solid ${userColor || "#f4a8a8"}`,
                "--hover-color": hoverColor || "#f19191",
                "--active-color": userColor || "#f4a8a8",
                "--active-color2": hoverColor || "#f19191",
                "--inactive-color": userColor ? `${userColor}15` : "#fff7f7",
                "--inactive-color2": userColor ? `${userColor}30` : "#ffeaea",
              }}
            >
              {month}
            </button>
          ))}
        </div>

        {/* 예산 요약 영역 */}
        <div
          className={`summary-bar${!isDetailExpanded ? " collapsed" : ""}`}
          style={{
            "--summary-bg": userColor ? `${userColor}15` : "#fff7f7",
            "--summary-bg2": userColor ? `${userColor}25` : "#ffeaea",
            "--summary-border": userColor || "#f4a8a8",
            "--summary-accent": userColor || "#f4a8a8",
            "--summary-accent2": hoverColor || "#f19191",
            "--toggle-color": userColor || "#888",
            "--toggle-hover-color": hoverColor || "#f19191",
          }}
        >
          <h3>{selectedMonth} 예산 요약</h3>

          {isSummaryLoading ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div className="spinner" />
            </div>
          ) : (
            <>
              {/* 요약 정보 */}
              <div className="summary-section">
                {/* 예산 */}
                <div className="summary-item budget">
                  <span className="label">예산</span>
                  <span className="amount">
                    {budgetSummary.budget.toLocaleString()}원
                  </span>
                </div>

                {/* 수입 (그룹인 경우만 표시) */}
                {groupId && (
                  <div className="summary-item income">
                    <span className="label">수입</span>
                    <span className="amount">
                      +{totalMonthlyIncome.toLocaleString()}원
                    </span>
                  </div>
                )}

                {/* 지출 */}
                <div className="summary-item expense">
                  <span className="label">지출</span>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: "4px",
                    }}
                  >
                    <span className="amount">
                      -{totalExpenseWithPersonal.toLocaleString()}원
                    </span>
                    {groupId && !isSummaryLoading && (
                      <div className="sub-expense-inline-checkbox">
                        <div
                          className="expense-checkbox-item"
                          style={{
                            marginLeft: "auto",
                            "--checkbox-color": userColor || "#f4a8a8",
                            "--checkbox-hover-color": hoverColor || "#f19191",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={
                              Object.keys(checkedMemberIds).length === 0
                                ? true
                                : Object.values(checkedMemberIds).every(
                                    (v) => v
                                  )
                            }
                            onChange={(e) =>
                              handleAllMembersCheckToggle(e.target.checked)
                            }
                          />
                          <span className="expense-text">개인지출 포함</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 순이익 (그룹인 경우만 표시) */}
                {groupId && !isSummaryLoading && (
                  <div className="summary-item net">
                    <span className="label">순이익</span>
                    <span className="amount">
                      {netProfit >= 0 ? "+" : "-"}
                      {Math.abs(netProfit).toLocaleString()}원
                    </span>
                  </div>
                )}
              </div>

              {/* 상세보기 토글 버튼 */}
              <div className="toggle-button-wrapper">
                <button onClick={() => setIsDetailExpanded((prev) => !prev)}>
                  {isDetailExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </button>
              </div>

              {/* 카테고리별 요약 (확장 시 표시) */}
              {isDetailExpanded && (
                <div className="category-summary">
                  {categorySummaryList.length === 0 ? (
                    <p className="empty">지출 내역이 없습니다.</p>
                  ) : (
                    <ul className="category-list">
                      {categorySummaryList
                        .slice()
                        .sort((a, b) => b.total - a.total)
                        .map(renderCategorySummaryItem)}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* 거래 내역 리스트 */}
        <ul className="list">
          {displayedTransactions.map(renderTransactionItem)}
        </ul>

        {/* 수정 다이얼로그 */}
        <EditDialog
          open={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          item={editingTransaction}
          onSave={handleTransactionEditSave}
          userId={userId}
          groupId={groupId}
          categories={categories}
          users={userList}
          groups={groupList}
          userColor={userColor}
          hoverColor={hoverColor}
        />
      </div>
    );
  }
);

export default MonthlyList;
