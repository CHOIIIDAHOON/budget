import React from "react";
import BudgetInputPage from "./BudgetInput/BudgetInputPage";
import {
  MonthlyList,
  BudgetSummary,
  SettingsDialog,
  SavingsSimulator,
  UIFeedback,
} from "@/features/budget/components";
import MyPageDialog from "@/features/budget/components/MyPageDialog/MyPageDialog";
import SettingsIcon from "@mui/icons-material/Settings";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import IconButton from "@mui/material/IconButton";
import {
  fetchUsers,
  fetchCategories,
  fetchSharedGroups,
  addTransaction,
  fetchFixedCosts,
  fetchBudgetData,
} from "@/api";
import { getThemeColors } from "@/shared/config/colorThemes";
import "@/app/App.css";
import s from "./BudgetLayout.module.css";

export default class BudgetLayout extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: "input",
      settingsOpen: false,
      myPageOpen: false,
      categories: [],
      users: [],
      activeUser: null,
      sharedGroups: [],
      activeGroup: null,
      txVersion: 0,
    };
    this.monthlyRef = React.createRef();
    this.uiFeedbackRef = React.createRef();
  }

  componentDidMount() {
    this.loadUsers();
    const { main, hover } = getThemeColors(this.state.activeUser, this.state.activeGroup);
    document.documentElement.style.setProperty("--main-color", main);
    document.documentElement.style.setProperty("--hover-color", hover);
  }

  componentDidUpdate(_prevProps, prevState) {
    const { activeTab, activeGroup, activeUser } = this.state;

    // activeGroup 제거 시 total 탭 리셋
    if (prevState.activeGroup !== activeGroup && !activeGroup && activeTab === "simulation") {
      this.setState({ activeTab: "input" });
    }

    // 사용자/그룹 변경 시 처리
    if (prevState.activeUser !== activeUser || prevState.activeGroup !== activeGroup) {
      this.handleUserGroupChange();
    }

    // CSS 변수 업데이트
    const { main: prevMainColor, hover: prevHoverColor } = getThemeColors(prevState.activeUser, prevState.activeGroup);
    const { main: mainColor, hover: hoverColor } = getThemeColors(activeUser, activeGroup);
    if (mainColor !== prevMainColor || hoverColor !== prevHoverColor) {
      document.documentElement.style.setProperty("--main-color", mainColor);
      document.documentElement.style.setProperty("--hover-color", hoverColor);
    }
  }

  showFixedCostNotification = (fixedCosts, categories) => {
    fixedCosts.forEach((fixed) => {
      const categoryName = categories.find((c) => c.code === fixed.category)?.description ?? "미분류";
      const desc = `${fixed.day}일 · ${categoryName} · ${Number(fixed.amount).toLocaleString()}원${fixed.memo ? `\n메모: ${fixed.memo}` : ""}`;
      this.uiFeedbackRef.current?.showSnackbar("고정비 자동 입력", desc, "📌");
    });
  };

  handleTransactionClick = (tx) => {
    this.setState({ activeTab: "monthly" });
    setTimeout(() => {
      if (this.monthlyRef.current) {
        this.monthlyRef.current.scrollToTransactionById(tx.id, tx.date);
      } else {
        console.warn("monthlyRef is still null");
      }
    }, 150);
  };

  loadUsers = async () => {
    try {
      const data = await fetchUsers();
      const { currentUser } = this.props;
      const selectedUser = data.find((u) => u.id === currentUser?.id) ?? data[0];
      this.setState({ users: data, activeUser: selectedUser });

      const groups = await fetchSharedGroups(selectedUser.id);
      this.setState({ sharedGroups: groups });
    } catch (error) {
      console.error("사용자 로딩 실패:", error);
    }
  };

  loadCategories = async (userId = null, groupId = null) => {
    if (!userId && !groupId) return [];
    try {
      const data = await fetchCategories({ userId, groupId });
      this.setState({ categories: data });
      return data;
    } catch (error) {
      console.error("카테고리 로딩 실패:", error);
      return [];
    }
  };

  handleUserGroupChange = async () => {
    const { activeUser, activeGroup } = this.state;
    if (!activeUser && !activeGroup) return;
    try {
      let loadedCategories = [];
      if (activeGroup) {
        loadedCategories = await this.loadCategories(null, activeGroup.id);
      } else if (activeUser) {
        loadedCategories = await this.loadCategories(activeUser.id, null);
      }

      const fixedCosts = await fetchFixedCosts(activeUser?.id, activeGroup?.id);
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const todayDay = today.getDate();

      const txs = await fetchBudgetData({
        userId: activeUser?.id,
        groupId: activeGroup?.id,
      });

      let addedFixedCosts = [];

      for (const fixed of fixedCosts) {
        if (!fixed.active) continue;

        const thisMonth = String(month).padStart(2, "0");
        const lastDayThisMonth = new Date(year, month, 0).getDate();
        const clampedDay = Math.min(fixed.day, lastDayThisMonth);
        const fixedDateThisMonth = `${year}-${thisMonth}-${String(clampedDay).padStart(2, "0")}`;

        let prevYear = year,
          prevMonth = month - 1;
        if (prevMonth === 0) {
          prevMonth = 12;
          prevYear -= 1;
        }
        const prevMonthStr = String(prevMonth).padStart(2, "0");
        const lastDayPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
        const clampedDayPrev = Math.min(fixed.day, lastDayPrevMonth);
        const fixedDatePrevMonth = `${prevYear}-${prevMonthStr}-${String(clampedDayPrev).padStart(2, "0")}`;

        const currentMonthTxs = txs.filter((tx) => {
          const d = new Date(tx.date);
          return d.getFullYear() === year && d.getMonth() + 1 === month;
        });

        const prevMonthTxs = txs.filter((tx) => {
          const d = new Date(tx.date);
          return d.getFullYear() === prevYear && d.getMonth() + 1 === prevMonth;
        });

        // fixed_cost_id 기준으로 체크 (신규), 없으면 category+memo+date로 fallback (구형 데이터)
        const alreadyThisMonth = currentMonthTxs.some((tx) =>
          tx.fixed_cost_id != null
            ? tx.fixed_cost_id === fixed.id
            : tx.category === fixed.category &&
              tx.memo === fixed.memo &&
              tx.date === fixedDateThisMonth
        );

        const alreadyPrevMonth = prevMonthTxs.some((tx) =>
          tx.fixed_cost_id != null
            ? tx.fixed_cost_id === fixed.id
            : tx.category === fixed.category &&
              tx.memo === fixed.memo &&
              tx.date === fixedDatePrevMonth
        );

        if (todayDay < fixed.day) {
          if (!alreadyPrevMonth) {
            await addTransaction(
              {
                category: fixed.category,
                amount: -fixed.amount,
                memo: fixed.memo,
                date: fixedDatePrevMonth,
                fixed_cost_id: fixed.id,
              },
              activeUser?.id,
              activeGroup?.id
            );
            addedFixedCosts.push(fixed);
          }
        } else {
          if (!alreadyThisMonth) {
            await addTransaction(
              {
                category: fixed.category,
                amount: -fixed.amount,
                memo: fixed.memo,
                date: fixedDateThisMonth,
                fixed_cost_id: fixed.id,
              },
              activeUser?.id,
              activeGroup?.id
            );
            addedFixedCosts.push(fixed);
          }
        }
      }

      if (addedFixedCosts.length > 0) {
        this.showFixedCostNotification(addedFixedCosts, loadedCategories);
        this.setState((prev) => ({ txVersion: prev.txVersion + 1 }));
      }
    } catch (error) {
      console.error("사용자/그룹 변경 처리 실패:", error);
    }
  };

  render() {
    const {
      activeTab,
      settingsOpen,
      myPageOpen,
      categories,
      users,
      activeUser,
      sharedGroups,
      activeGroup,
      txVersion,
    } = this.state;
    const { currentUser } = this.props;
    const loggedInUser = users.find((u) => u.id === currentUser?.id);
    const { main: mainColor, hover: hoverColor } = getThemeColors(activeUser, activeGroup);

    return (
      <UIFeedback ref={this.uiFeedbackRef}>
        <div className={s.container}>
          {/* 사용자 탭 */}
          <div className={s.userTabsWrap}>
            <div className={s.pillGroup}>
              {users.map((user) => {
                const active = activeUser?.id === user.id;
                return (
                  <button
                    key={user.id}
                    onClick={() => this.setState({ activeUser: user, activeGroup: null })}
                    className={`${s.pillBtn} ${active ? s.pillBtnActive : ""}`}
                  >
                    {user.username}
                  </button>
                );
              })}
              {sharedGroups.map((group) => {
                const active = activeGroup?.id === group.id;
                return (
                  <button
                    key={group.id}
                    onClick={() => this.setState({ activeUser: null, activeGroup: group })}
                    className={`${s.pillBtn} ${active ? s.pillBtnActive : ""}`}
                  >
                    {group.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 상단 우측 버튼들 */}
          <div className={s.gearFab}>
            <IconButton
              onClick={() => this.setState({ myPageOpen: true })}
              size="large"
              style={{ color: "var(--main-color)", background: "transparent" }}
            >
              <AccountCircleIcon />
            </IconButton>
            <IconButton
              onClick={() => this.setState({ settingsOpen: true })}
              size="large"
              className="settings-icon-button"
              style={{ color: "var(--main-color)", background: "transparent" }}
            >
              <SettingsIcon />
            </IconButton>
          </div>

          <h2 className={s.title}>
            {activeGroup
              ? `우리집 공동 가계부`
              : `${activeUser?.username} 부자 가계부`}
          </h2>

          {/* 탭 버튼 */}
          <div className={s.tabBar}>
            {[
              { label: "입력하기", key: "input" },
              { label: "월별 보기", key: "monthly" },
              { label: "예산 통계", key: "summary" },
              ...(activeGroup ? [{ label: "절약 시뮬레이션", key: "simulation" }] : []),
            ].map(({ label, key }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => this.setState({ activeTab: key })}
                  className={`${s.tab} ${isActive ? s.tabActive : ""}`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* 탭 콘텐츠 */}
          {activeTab === "input" && (
            <BudgetInputPage
              key={txVersion}
              categories={categories}
              userId={activeUser?.id ?? null}
              groupId={activeGroup?.id ?? null}
              userColor={mainColor}
              hoverColor={hoverColor}
            />
          )}
          {activeTab === "monthly" && (
            <MonthlyList
              key={txVersion}
              ref={this.monthlyRef}
              userId={activeUser?.id ?? null}
              groupId={activeGroup?.id ?? null}
              userColor={mainColor}
              hoverColor={hoverColor}
            />
          )}
          {activeTab === "summary" && (
            <BudgetSummary
              key={txVersion}
              userId={activeUser?.id ?? null}
              groupId={activeGroup?.id ?? null}
              salaryGroupId={sharedGroups[0]?.id ?? null}
              users={users}
              userColor={mainColor}
            />
          )}
          {activeTab === "simulation" && (
            <SavingsSimulator
              key={txVersion}
              groupId={activeGroup?.id ?? null}
              userColor={mainColor}
            />
          )}

          {/* 마이페이지 다이얼로그 */}
          <MyPageDialog
            open={myPageOpen}
            onClose={() => this.setState({ myPageOpen: false })}
            username={loggedInUser?.username}
          />

          {/* 설정 다이얼로그 */}
          <SettingsDialog
            open={settingsOpen}
            onClose={() => this.setState({ settingsOpen: false })}
            onCategoryChange={() =>
              this.loadCategories(activeUser?.id ?? null, activeGroup?.id ?? null)
            }
            userId={activeUser?.id ?? null}
            groupId={activeGroup?.id ?? null}
            userColor={mainColor}
            hoverColor={hoverColor}
          />
        </div>
      </UIFeedback>
    );
  }
}
