import React, {
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  fetchBudgetData,
  fetchMonthlySummary,
  deleteTransaction,
  updateTransaction,
  fetchCategorySummary,
  fetchCategories,
  fetchGroupMembers,
  fetchPersonalExpensesForGroupMembers,
  fetchUsers,
  fetchSharedGroups,
} from "../../../api/budgetApi";
import "./MonthlyList.css";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import EditDialog from "./EditDialog";
import { getMatchedIcon } from "../../../shared/utils/iconMap";

const MonthlyList = forwardRef(
  ({ userId, groupId, userColor, hoverColor }, ref) => {
    const [data, setData] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState("");
    const [summary, setSummary] = useState({ budget: 0, spent: 0 });
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [visibleCount, setVisibleCount] = useState(15);
    const [categories, setCategories] = useState([]);
    const [categorySummary, setCategorySummary] = useState([]);
    const [showDetail, setShowDetail] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [individualExpenses, setIndividualExpenses] = useState({});
    const [groupMembers, setGroupMembers] = useState([]);
    const [includedUsers, setIncludedUsers] = useState({});
    const [loadingSummary, setLoadingSummary] = useState(true);
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);

    const months = [...new Set(data.map((d) => d.date?.slice(0, 7)))]
      .sort()
      .reverse();

    const filtered = data
      .filter((d) => d.date?.startsWith(selectedMonth))
      .filter((d) =>
        selectedCategory ? d.category === selectedCategory : true
      );

    // 월 전체 기준 수입 데이터 (카테고리 무관)
    const allThisMonth = data.filter((item) =>
      item.date?.startsWith(selectedMonth)
    );
    const totalIncomeThisMonth = allThisMonth
      .filter((item) => Number(item.amount) > 0)
      .reduce((sum, item) => sum + Number(item.amount), 0);

    // ✅ 선택된 개인지출 합계 계산
    const includedPersonalExpense = groupMembers.reduce((sum, user) => {
      return includedUsers[user.id]
        ? sum + (individualExpenses[user.id] || 0)
        : sum;
    }, 0);

    // ✅ 최종 지출 및 순이익 계산
    const adjustedSpent = groupId
      ? summary.spent + includedPersonalExpense
      : summary.spent;
    const netIncome = totalIncomeThisMonth - adjustedSpent;

    const visibleItems = filtered.slice(0, visibleCount);

    const handleDelete = async (item) => {
      const confirmed = window.confirm("정말 삭제하시겠습니까?");
      if (!confirmed) return;

      try {
        await deleteTransaction(item.id);
        const updated = data.filter((d) => d.id !== item.id);
        setData(updated);
      } catch (err) {
        console.error("삭제 실패:", err);
        alert("삭제 중 오류가 발생했습니다.");
      }
    };

    const handleEditSave = async (updated) => {
      try {
        await updateTransaction(editItem, updated, userId, groupId);
        const updatedData = data.map((d) =>
          d === editItem
            ? {
                ...editItem,
                amount:
                  updated.type === "expense"
                    ? -Math.abs(updated.amount)
                    : Math.abs(updated.amount),
                memo: updated.memo,
                category: updated.category,
                date: updated.date, // ✅ 날짜 정보 추가
                category_name:
                  categories.find((c) => c.code === updated.category)
                    ?.description || "카테고리 수정",
              }
            : d
        );
        setData(updatedData);
        setEditDialogOpen(false);

        // ✅ Summary 데이터도 새로고침
        if (selectedMonth) {
          const [summaryRes, categoryRes] = await Promise.all([
            fetchMonthlySummary(selectedMonth, userId, groupId),
            fetchCategorySummary(selectedMonth, userId, groupId),
          ]);
          setSummary({ budget: summaryRes.budget, spent: summaryRes.spent });
          setCategorySummary(categoryRes);
        }
      } catch (err) {
        console.error("수정 실패:", err);
        alert("수정 중 오류가 발생했습니다.");
      }
    };

    useEffect(() => {
      const loadOwners = async () => {
        try {
          const usersRes = await fetchUsers(); // 전체 사용자 목록
          setUsers(usersRes);

          if (userId) {
            const groupsRes = await fetchSharedGroups(userId); // 내가 속한 그룹 목록
            setGroups(groupsRes);
          }
        } catch (e) {
          console.error("소유자 정보 불러오기 실패", e);
        }
      };

      loadOwners();
    }, [userId]);

    useEffect(() => {
      const loadGroupDetails = async () => {
        if (!groupId || !selectedMonth) return;

        try {
          const members = await fetchGroupMembers(groupId);
          const memberIds = members.map((m) => m.id);
          const expenses = await fetchPersonalExpensesForGroupMembers(
            selectedMonth,
            memberIds
          );

          setGroupMembers(members);
          setIndividualExpenses(expenses);

          // 초기 체크 상태 모두 true로 설정
          const initialChecked = {};
          members.forEach((m) => {
            initialChecked[m.id] = true;
          });
          setIncludedUsers(initialChecked);
        } catch (err) {
          // 로딩 실패 시 무시 (에러 로깅 제거됨)
        }
      };

      loadGroupDetails();
    }, [groupId, selectedMonth]);

    useEffect(() => {
      if (!userId && !groupId) return;

      fetchBudgetData({ userId, groupId }).then((res) => {
        setData(res);

        const months = [...new Set(res.map((d) => d.date?.slice(0, 7)))]
          .sort()
          .reverse();

        if (months.length > 0) {
          const today = new Date();
          const currentMonth = today.toISOString().slice(0, 7); // 예: '2025-05'

          // 1️⃣ 현재 달이 있으면 우선 선택
          if (months.includes(currentMonth)) {
            setSelectedMonth(currentMonth);
          } else {
            // 2️⃣ 없으면 최신 달로
            setSelectedMonth(months[0]);
          }
        }
      });

      fetchCategories({ userId, groupId }).then((res) => {
        setCategories(res);
      });

      setSelectedCategory(null);
    }, [userId, groupId]);

    useEffect(() => {
      const loadAllSummaryData = async () => {
        if (!selectedMonth || (!userId && !groupId)) return;

        // 1️⃣ 상태 초기화 (스피너 돌리기 전, 먼저 초기 상태 적용)
        setSummary({ budget: 0, spent: 0 });
        setCategorySummary([]);
        setGroupMembers([]);
        setIndividualExpenses({});
        setIncludedUsers({});
        setLoadingSummary(true); // 로딩 표시

        try {
          const [summaryRes, categoryRes] = await Promise.all([
            fetchMonthlySummary(selectedMonth, userId, groupId),
            fetchCategorySummary(selectedMonth, userId, groupId),
          ]);
          setSummary({ budget: summaryRes.budget, spent: summaryRes.spent });
          setCategorySummary(categoryRes);

          if (groupId) {
            const members = await fetchGroupMembers(groupId);
            const memberIds = members.map((m) => m.id);
            const expenses = await fetchPersonalExpensesForGroupMembers(
              selectedMonth,
              memberIds
            );

            setGroupMembers(members);
            setIndividualExpenses(expenses);

            const initialChecked = {};
            members.forEach((m) => {
              initialChecked[m.id] = true;
            });
            setIncludedUsers(initialChecked);
          }
        } catch (e) {
          console.error("로딩 실패", e);
        } finally {
          setLoadingSummary(false);
        }
      };

      loadAllSummaryData();
    }, [selectedMonth, userId, groupId]);

    useEffect(() => {
      const handleScroll = () => {
        const nearBottom =
          window.innerHeight + window.scrollY >=
          document.body.offsetHeight - 100;
        if (nearBottom) {
          setVisibleCount((prev) => Math.min(prev + 15, filtered.length));
        }
      };

      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }, [filtered]);

    useEffect(() => {
      setVisibleCount(15);
    }, [selectedMonth, selectedCategory]);

    const scrollToTx = (id) => {
      const el = document.getElementById(`tx-${id}`);

      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add("highlight");
        setTimeout(() => el.classList.remove("highlight"), 1500);
      } else {
        console.warn("❌ 스크롤 대상 요소가 아직 DOM에 없음:", id);
      }
    };

    useImperativeHandle(ref, () => ({
      scrollToTransactionById: (id, dateStr) => {
        const txMonth = dateStr?.slice(0, 7);
        if (txMonth !== selectedMonth) {
          setSelectedMonth(txMonth);
          setTimeout(() => scrollToTx(id), 300); // 월 변경 후 스크롤
        } else {
          scrollToTx(id);
        }
      },
    }));

    return (
      <div className="monthly-container">
        <div className="month-scroll-bar">
          {months.map((month) => (
            <button
              key={month}
              className={`month-tab ${month === selectedMonth ? "active" : ""}`}
              onClick={() => {
                setSelectedMonth(month);
                setSelectedCategory(null);
              }}
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

        <div
          className={`summary-bar${!showDetail ? " collapsed" : ""}`}
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

          {loadingSummary ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div className="spinner" />
            </div>
          ) : (
            <>
              <div className="summary-section">
                <div className="summary-item budget">
                  <span className="label">예산</span>
                  <span className="amount">
                    {summary.budget.toLocaleString()}원
                  </span>
                </div>

                {groupId && (
                  <div className="summary-item income">
                    <span className="label">수입</span>
                    <span className="amount">
                      +
                      {data
                        .filter((item) => item.date?.startsWith(selectedMonth))
                        .filter((item) => Number(item.amount) > 0)
                        .reduce((sum, item) => sum + Number(item.amount), 0)
                        .toLocaleString()}
                      원
                    </span>
                  </div>
                )}

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
                      -{adjustedSpent.toLocaleString()}원
                    </span>
                    {groupId && !loadingSummary && (
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
                              Object.keys(includedUsers).length === 0
                                ? true
                                : Object.values(includedUsers).every((v) => v)
                            }
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const updated = {};
                              [
                                ...groupMembers,
                                ...(userId ? [{ id: userId }] : []),
                              ].forEach((user) => {
                                updated[user.id] = checked;
                              });
                              setIncludedUsers(updated);
                            }}
                          />
                          <span className="expense-text">개인지출 포함</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {groupId && !loadingSummary && (
                  <div className="summary-item net">
                    <span className="label">순이익</span>
                    <span className="amount">
                      {netIncome >= 0 ? "+" : "-"}
                      {Math.abs(netIncome).toLocaleString()}원
                    </span>
                  </div>
                )}
              </div>

              <div className="toggle-button-wrapper">
                <button onClick={() => setShowDetail((prev) => !prev)}>
                  {showDetail ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </button>
              </div>

              {showDetail && (
                <div className="category-summary">
                  {categorySummary.length === 0 ? (
                    <p className="empty">지출 내역이 없습니다.</p>
                  ) : (
                    <ul className="category-list">
                      {categorySummary
                        .slice()
                        .sort((a, b) => b.total - a.total)
                        .map((cat, idx) => {
                          const percent =
                            summary.spent > 0
                              ? Math.round((cat.total / summary.spent) * 100)
                              : 0;
                          const isSelected = selectedCategory === cat.category;

                          return (
                            <li
                              key={idx}
                              className={`category-item ${
                                isSelected ? "clicked" : ""
                              }`}
                              onClick={() => {
                                setSelectedCategory(
                                  isSelected ? null : cat.category
                                );
                                // 리스트 영역으로 스크롤
                                const listElement =
                                  document.querySelector(".list");
                                if (listElement) {
                                  listElement.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start",
                                  });
                                }
                              }}
                              style={{
                                cursor: "pointer",
                                backgroundColor: isSelected
                                  ? userColor || "#d1e7ff"
                                  : "transparent",
                              }}
                            >
                              <span className="category-name">{cat.name}</span>
                              <span className="category-amount">
                                {cat.total.toLocaleString()}원{" "}
                                <span className="category-percent">
                                  ({percent}%)
                                </span>
                              </span>
                            </li>
                          );
                        })}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <ul className="list">
          {visibleItems.map((item, idx) => {
            const amount = Number(item.amount);
            const isExpense = amount < 0;
            const formatted = Math.abs(amount).toLocaleString();
            const day = item.date?.slice(8, 10);
            const prevDay = visibleItems[idx - 1]?.date?.slice(8, 10);
            const isNewDay = day !== prevDay;

            return (
              <React.Fragment key={idx}>
                {isNewDay && (
                  <div className="date-label-wrapper">
                    <div className="date-label">{day}일</div>
                    <div className="day-total">
                      {filtered
                        .filter((d) => d.date?.slice(8, 10) === day)
                        .reduce((sum, d) => sum + Number(d.amount), 0)
                        .toLocaleString()}
                      원
                    </div>
                  </div>
                )}
                <li
                  id={`tx-${item.id}`}
                  className="item"
                  style={isNewDay ? { borderTop: "3px solid #ddd" } : {}}
                >
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(item)}
                  >
                    <CloseIcon fontSize="small" />
                  </button>
                  <button
                    className="edit-btn"
                    onClick={() => {
                      setEditItem(item);
                      setEditDialogOpen(true);
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </button>
                  <div className="desc">
                    <div className="left-block">
                      <div className="category">
                        <span className="category-badge">
                          {item.category_name || item.category}
                        </span>
                        {item.is_deleted && (
                          <span className="badge-deleted">삭제된 카테고리</span>
                        )}
                      </div>
                      {item.memo && (
                        <div className="memo">
                          {getMatchedIcon(item.memo) && (
                            <img
                              src={getMatchedIcon(item.memo)}
                              alt="memo icon"
                              className="memo-icon"
                            />
                          )}
                          {item.memo}
                        </div>
                      )}
                    </div>
                    <span
                      className={`amount ${isExpense ? "expense" : "income"}`}
                    >
                      {isExpense ? "-" : "+"}
                      {formatted}원
                    </span>
                  </div>
                </li>
              </React.Fragment>
            );
          })}
        </ul>

        <EditDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          item={editItem}
          onSave={handleEditSave}
          userId={userId}
          groupId={groupId}
          categories={categories}
          users={users}
          groups={groups}
          userColor={userColor}
          hoverColor={hoverColor}
        />
      </div>
    );
  }
);

export default MonthlyList;
