// 월별예산내역
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import React, { Component } from "react";
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
} from "../../../../api/budgetApi";
import { getMatchedIcon } from "../../../../shared/utils/iconMap";
import {
  getCurrentMonth,
  extractMonth,
  extractDay,
} from "../../../../shared/utils/date";
import {
  calcTotalIncome,
  calcPersonalExpenses,
} from "../../../../shared/utils/finance";
import { EditDialog } from "../../dialog";
import BudgetReceiptCard from "./BudgetReceiptCard";
import "./MonthlyListPage.scss";

// ========== 상수 ==========
const INIT_COUNT    = 15;   // 초기 표시 거래 건수
const LOAD_MORE     = 15;   // 스크롤 시 추가 로드 건수
const SCROLL_THR    = 100;  // 하단 감지 여유값 (px)
const SCROLL_DELAY  = 300;  // 월 변경 후 스크롤 딜레이 (ms)
const HIGHLIGHT_DUR = 1500; // 하이라이트 지속 시간 (ms)
const SWIPE_THR     = 70;   // 스와이프 인식 임계값 (px)
const MAX_SWIPE     = 90;   // 최대 스와이프 이동 거리 (px)

/**
 * 월별예산내역 페이지
 * - 월 탭 선택으로 해당 월 거래 내역 조회
 * - 카테고리별 요약, 예산 vs 지출 요약 표시
 * - 모바일 스와이프(오른쪽: 수정 / 왼쪽: 삭제) 지원
 * - 무한 스크롤로 거래 목록 페이지네이션
 * - 부모 컴포넌트에서 ref로 scrollToTxById() 직접 호출 가능
 */
class MonthlyListPage extends Component {
  constructor(props) {
    super(props);

    // ========== State 정의 ==========
    this.state = {
      /** 전체 거래 내역 목록 */
      txList: [],

      /** 현재 선택된 월 (YYYY-MM) */
      selMonth: "",

      /** 예산 요약 { budget: 설정예산, spent: 지출합계 } */
      summary: { budget: 0, spent: 0 },

      /** 수정 다이얼로그 열림 여부 */
      editOpen: false,

      /** 수정 중인 거래 객체 */
      editingTx: null,

      /** 무한 스크롤: 현재 화면에 표시할 거래 건수 */
      visibleCount: INIT_COUNT,

      /** 카테고리 목록 (수정 다이얼로그 및 이름 매핑용) */
      categories: [],

      /** 카테고리별 지출 요약 목록 */
      catSummary: [],

      /** 카테고리 요약 영역 펼침 여부 */
      expanded: false,

      /** 선택된 카테고리 코드 (null이면 전체 표시) */
      selCatCode: null,

      /** 그룹 멤버별 개인지출 { memberId: amount } */
      memberExpenses: {},

      /** 그룹 멤버 목록 */
      members: [],

      /** 개인지출 포함 체크 상태 { memberId: boolean } */
      checkedMembers: {},

      /** 요약 데이터 로딩 중 여부 */
      summaryLoading: true,

      /** 전체 사용자 목록 (수정 다이얼로그 owner 선택용) */
      users: [],

      /** 소속 그룹 목록 (수정 다이얼로그 owner 선택용) */
      groups: [],

      /** 각 거래의 스와이프 이동량 { txId: px } */
      swipeOffsets: {},
    };

    /** 터치 시작 X 좌표 저장 { txId: clientX } — ref처럼 렌더링 무관 */
    this.touchStartX = {};

    /** 다이얼로그 닫힐 때 스크롤 위치 복원용 Y값 */
    this.scrollY = 0;
  }

  // ========== 라이프사이클 ==========

  componentDidMount() {
    this.loadUsersGroups();
    if (this.props.userId || this.props.groupId) {
      this.loadTxAndCategories();
    }
    window.addEventListener("scroll", this.onScroll);
  }

  componentDidUpdate(prevProps, prevState) {
    const { userId, groupId } = this.props;
    const { selMonth, selCatCode, editOpen } = this.state;

    // userId 변경 → 사용자·그룹 목록 재로드
    if (prevProps.userId !== userId) {
      this.loadUsersGroups();
    }

    // userId/groupId 변경 → 거래·카테고리 재로드, 카테고리 필터 초기화
    if (prevProps.userId !== userId || prevProps.groupId !== groupId) {
      if (userId || groupId) {
        this.loadTxAndCategories();
        this.setState({ selCatCode: null });
      }
    }

    // selMonth/userId/groupId 변경 → 예산 요약 재로드
    if (
      prevState.selMonth !== selMonth ||
      prevProps.userId !== userId ||
      prevProps.groupId !== groupId
    ) {
      if (selMonth && (userId || groupId)) {
        this.loadSummary();
      }
    }

    // editOpen 변경 → 스크롤 위치 복원 (다이얼로그 닫힐 때 튀는 현상 방지)
    if (prevState.editOpen !== editOpen) {
      requestAnimationFrame(() =>
        window.scrollTo({ top: this.scrollY, behavior: "auto" })
      );
    }

    // selMonth/selCatCode 변경 → 표시 건수 초기화
    if (
      prevState.selMonth !== selMonth ||
      prevState.selCatCode !== selCatCode
    ) {
      this.setState({ visibleCount: INIT_COUNT });
    }
  }

  componentWillUnmount() {
    window.removeEventListener("scroll", this.onScroll);
  }

  // ========== 데이터 로드 ==========

  /** 전체 사용자 목록 및 소속 그룹 목록 로드 */
  loadUsersGroups = async () => {
    const { userId } = this.props;
    try {
      const usersRes = await fetchUsers();
      this.setState({ users: usersRes });
      if (userId) {
        const groupsRes = await fetchSharedGroups(userId);
        this.setState({ groups: groupsRes });
      }
    } catch (err) {
      console.error("소유자 정보 불러오기 실패", err);
    }
  };

  /** 거래 내역 + 카테고리 목록 로드 후 현재(또는 최신) 월 자동 선택 */
  loadTxAndCategories = async () => {
    const { userId, groupId } = this.props;
    if (!userId && !groupId) return;

    const txRes = await fetchBudgetData({ userId, groupId });

    // 각 거래에 owner 정보 정규화 (groupId 있으면 개인 userId null 처리)
    const normalized = txRes.map((tx) => ({
      ...tx,
      user_Id:  groupId ? null : userId,
      group_Id: groupId ?? null,
    }));
    this.setState({ txList: normalized });

    // 최신순 월 목록 → 오늘이 포함된 월 우선, 없으면 가장 최신 월
    const months = [...new Set(txRes.map((tx) => extractMonth(tx.date)))]
      .filter(Boolean)
      .sort()
      .reverse();
    if (months.length > 0) {
      const cur = getCurrentMonth();
      this.setState({ selMonth: months.includes(cur) ? cur : months[0] });
    }

    const catRes = await fetchCategories({ userId, groupId });
    this.setState({ categories: catRes });
  };

  /** 월별 요약(예산·지출) + 카테고리 요약 로드, 그룹이면 멤버 정보도 로드 */
  loadSummary = async () => {
    const { userId, groupId } = this.props;
    const { selMonth } = this.state;
    if (!selMonth || (!userId && !groupId)) return;

    // 로딩 시작 전 이전 데이터 초기화
    this.setState({
      summary:        { budget: 0, spent: 0 },
      catSummary:     [],
      members:        [],
      memberExpenses: {},
      checkedMembers: {},
      summaryLoading: true,
    });

    try {
      const [sumRes, catRes] = await Promise.all([
        fetchMonthlySummary(selMonth, userId, groupId),
        fetchCategorySummary(selMonth, userId, groupId),
      ]);
      this.setState({
        summary:    { budget: sumRes.budget, spent: sumRes.spent },
        catSummary: catRes,
      });

      // 그룹인 경우 멤버별 개인지출 추가 로드
      if (groupId) {
        await this.loadMembers();
      }
    } catch (err) {
      console.error("요약 로딩 실패", err);
    } finally {
      this.setState({ summaryLoading: false });
    }
  };

  /** 그룹 멤버 목록 + 멤버별 개인지출 로드, 초기 체크 상태 전원 true */
  loadMembers = async () => {
    const { groupId } = this.props;
    const { selMonth } = this.state;
    if (!groupId || !selMonth) return;

    try {
      const memberList = await fetchGroupMembers(groupId);
      const ids        = memberList.map((m) => m.id);
      const expenses   = await fetchPersonalExpensesForGroupMembers(selMonth, ids);

      // 초기 체크: 전원 포함
      const initChecked = {};
      memberList.forEach((m) => { initChecked[m.id] = true; });

      this.setState({
        members:        memberList,
        memberExpenses: expenses,
        checkedMembers: initChecked,
      });
    } catch (_) {
      // 멤버 로드 실패는 조용히 처리 (그룹 기능 없어도 기본 동작 유지)
    }
  };

  // ========== 이벤트 핸들러 ==========

  /** 무한 스크롤: 하단 근처 도달 시 표시 건수 증가 */
  onScroll = () => {
    const { txList, selMonth, selCatCode, visibleCount } = this.state;

    // 현재 필터 기준 총 건수 계산
    const total = txList
      .filter((tx) => tx.date?.startsWith(selMonth))
      .filter((tx) => (selCatCode ? tx.category === selCatCode : true))
      .length;

    const nearBottom =
      window.innerHeight + window.scrollY >=
      document.body.offsetHeight - SCROLL_THR;

    if (nearBottom && visibleCount < total) {
      this.setState((prev) => ({
        visibleCount: Math.min(prev.visibleCount + LOAD_MORE, total),
      }));
    }
  };

  /** 거래 삭제 확인 후 API 호출 및 목록 갱신 */
  onDel = async (tx) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteTransaction(tx.id);
      this.setState((prev) => ({
        txList: prev.txList.filter((t) => t.id !== tx.id),
      }));
    } catch (err) {
      console.error("삭제 실패:", err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  /** 스와이프 시작: 터치 시작 X 좌표 저장 */
  onSwipeStart = (e, id) => {
    this.touchStartX[id] = e.touches[0].clientX;
  };

  /** 스와이프 중: 이동 거리 계산 후 오프셋 업데이트 (최대 ±MAX_SWIPE) */
  onSwipeMove = (e, id) => {
    const startX = this.touchStartX[id];
    if (startX == null) return;

    let diff = e.touches[0].clientX - startX;
    diff = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, diff)); // 좌우 이동 제한

    this.setState((prev) => ({
      swipeOffsets: { ...prev.swipeOffsets, [id]: diff },
    }));
  };

  /** 스와이프 종료: 방향에 따라 수정(오른쪽)/삭제(왼쪽) 실행 후 원위치 */
  onSwipeEnd = (tx) => {
    const offset = this.state.swipeOffsets[tx.id] || 0;

    if (offset > SWIPE_THR) {
      // 오른쪽 스와이프 → 수정 다이얼로그 열기
      this.scrollY = window.scrollY;
      this.setState({ editingTx: tx, editOpen: true });
    } else if (offset < -SWIPE_THR) {
      // 왼쪽 스와이프 → 삭제
      this.onDel(tx);
    }

    // 스와이프 오프셋 원위치
    this.setState((prev) => ({
      swipeOffsets: { ...prev.swipeOffsets, [tx.id]: 0 },
    }));
  };

  /** 수정 다이얼로그 저장: owner 변경 여부에 따라 목록에서 제거 or 인라인 업데이트 */
  onSave = async (updated) => {
    const { userId, groupId } = this.props;
    const { editingTx, categories } = this.state;

    try {
      this.scrollY = window.scrollY;

      // 수정 전후 owner 키 비교 (user:xxx or group:xxx)
      const prevKey = editingTx.user_Id
        ? `user:${editingTx.user_Id}`
        : editingTx.group_Id
        ? `group:${editingTx.group_Id}`
        : null;
      const nextKey = updated.userId
        ? `user:${updated.userId}`
        : updated.groupId
        ? `group:${updated.groupId}`
        : null;

      await updateTransaction(editingTx, updated, userId, groupId);

      if (prevKey !== nextKey) {
        // owner 변경 → 현재 뷰에서 제거
        this.setState((prev) => ({
          txList: prev.txList.filter((t) => t.id !== editingTx.id),
        }));
      } else {
        // 동일 owner → 해당 항목 인라인 업데이트
        this.setState((prev) => ({
          txList: prev.txList.map((t) =>
            t.id === editingTx.id
              ? {
                  ...t,
                  amount: updated.type === "expense"
                    ? -Math.abs(updated.amount)
                    : Math.abs(updated.amount),
                  memo:          updated.memo,
                  category:      updated.category,
                  date:          updated.date,
                  category_name:
                    categories.find((c) => c.code === updated.category)
                      ?.description || t.category_name,
                }
              : t
          ),
        }));
      }

      this.loadSummary();
      this.setState({ editOpen: false });
    } catch (err) {
      console.error("수정 실패", err);
    }
  };

  /** 월 탭 클릭: 선택 월 변경 + 카테고리 필터 초기화 */
  onMonthChange = (month) => {
    this.setState({ selMonth: month, selCatCode: null });
  };

  /** 카테고리 항목 클릭: 동일 코드면 해제, 다른 코드면 선택 후 리스트로 스크롤 */
  onCatSelect = (code) => {
    this.setState((prev) => ({
      selCatCode: prev.selCatCode === code ? null : code,
    }));
    document
      .querySelector(".list")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /** 개인지출 포함 체크박스 전체 토글 */
  onAllMembersCheck = (checked) => {
    const { members } = this.state;
    const { userId } = this.props;

    // 그룹 멤버 + 현재 사용자 합쳐서 일괄 설정
    const all = [...members, ...(userId ? [{ id: userId }] : [])];
    const updated = {};
    all.forEach((m) => { updated[m.id] = checked; });
    this.setState({ checkedMembers: updated });
  };

  // ========== 공개 메서드 (부모 ref 접근용) ==========

  /**
   * 특정 거래 항목으로 이동
   * - 해당 거래가 다른 월이면 먼저 월 변경 후 딜레이 스크롤
   * @param {string|number} txId   - 이동 대상 거래 ID
   * @param {string}        dateStr - 거래 날짜 (YYYY-MM-DD)
   */
  scrollToTransactionById = (txId, dateStr) => {
    const month = extractMonth(dateStr);
    if (month !== this.state.selMonth) {
      this.setState({ selMonth: month });
      setTimeout(() => this.scrollToTx(txId), SCROLL_DELAY);
    } else {
      this.scrollToTx(txId);
    }
  };

  // ========== 내부 헬퍼 ==========

  /** DOM에서 거래 항목 찾아 스크롤 + 깜빡임 하이라이트 */
  scrollToTx = (txId) => {
    const el = document.getElementById(`tx-${txId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("highlight");
      setTimeout(() => el.classList.remove("highlight"), HIGHLIGHT_DUR);
    } else {
      console.warn("스크롤 대상 요소 없음:", txId);
    }
  };

  // ========== 렌더링 헬퍼 ==========

  /**
   * 카테고리 요약 항목 한 행 렌더링
   * @param {Object} catData - { category: code, name, total }
   * @param {number} idx
   */
  renderCatItem = (catData, idx) => {
    const { summary, selCatCode } = this.state;
    const { userColor } = this.props;

    // 전체 지출 대비 해당 카테고리 비율 (%)
    const pct = summary.spent > 0
      ? Math.round((catData.total / summary.spent) * 100)
      : 0;
    const isSelected = selCatCode === catData.category;

    return (
      <li
        key={idx}
        className={`category-item ${isSelected ? "clicked" : ""}`}
        onClick={() => this.onCatSelect(catData.category)}
        style={{
          cursor:          "pointer",
          backgroundColor: isSelected ? userColor || "#d1e7ff" : "transparent",
        }}
      >
        <span className="category-name">{catData.name}</span>
        <span className="category-amount">
          {catData.total.toLocaleString()}원{" "}
          <span className="category-percent">({pct}%)</span>
        </span>
      </li>
    );
  };

  /**
   * 거래 항목 한 행 렌더링 (날짜 구분선 포함)
   * @param {Object} tx          - 거래 객체
   * @param {number} idx         - displayedTx 내 인덱스
   * @param {Array}  displayedTx - 현재 화면에 표시 중인 거래 목록 (날짜 구분선 판단용)
   * @param {Array}  filteredTx  - 월+카테고리 필터된 전체 목록 (일별 합계 계산용)
   */
  renderTxItem = (tx, idx, displayedTx, filteredTx) => {
    const { swipeOffsets } = this.state;

    const amount    = Number(tx.amount);
    const isExpense = amount < 0;
    const fmtAmt    = Math.abs(amount).toLocaleString(); // 표시용 절대값 금액

    const day    = extractDay(tx.date);
    const prevDay = idx > 0 ? extractDay(displayedTx[idx - 1].date) : null;

    // 이전 항목과 날짜가 다르면 날짜 구분선 표시
    const isNewDay = day !== prevDay;

    // 해당 일(day)의 총 금액 (필터된 전체 기준)
    const dayTotal = filteredTx
      .filter((t) => extractDay(t.date) === day)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return (
      <React.Fragment key={idx}>
        {/* 날짜 구분선: 날짜가 바뀌는 첫 항목에만 표시 */}
        {isNewDay && (
          <div className="date-label-wrapper">
            <div className="date-label">{day}일</div>
            <div className="day-total">{dayTotal.toLocaleString()}원</div>
          </div>
        )}

        {/* 스와이프 거래 항목 */}
        <li
          id={`tx-${tx.id}`}
          className="swipe-item"
          onTouchStart={(e) => this.onSwipeStart(e, tx.id)}
          onTouchMove={(e)  => this.onSwipeMove(e, tx.id)}
          onTouchEnd={() => this.onSwipeEnd(tx)}
        >
          <div className="swipe-shadow">
            <div className="swipe-clip">
              <div className="swipe-layer">
                {/* 스와이프 배경 액션 버튼 */}
                <div className="swipe-action left"><EditIcon /></div>
                <div className="swipe-action right"><CloseIcon /></div>

                {/* 실제 카드 내용 (스와이프로 밀림) */}
                <div
                  className="swipe-content"
                  style={{
                    transform: `translateX(${swipeOffsets[tx.id] || 0}px)`,
                  }}
                >
                  <div className="item">
                    <div className="desc">
                      <div className="left-block">
                        {/* 카테고리 뱃지 + 삭제된 카테고리 표시 */}
                        <div className="category">
                          <span className="category-badge">
                            {tx.category_name || tx.category}
                          </span>
                          {tx.is_deleted && (
                            <span className="badge-deleted">삭제된 카테고리</span>
                          )}
                        </div>

                        {/* 메모 (아이콘 + 텍스트) */}
                        {tx.memo && (
                          <div className="memo">
                            {getMatchedIcon(tx.memo) && (
                              <img
                                src={getMatchedIcon(tx.memo)}
                                alt="memo icon"
                                className="memo-icon"
                              />
                            )}
                            {tx.memo}
                          </div>
                        )}
                      </div>

                      {/* 금액 (지출: 빨강/마이너스, 수입: 파랑/플러스) */}
                      <span
                        className={`tx-amount ${isExpense ? "expense" : "income"}`}
                      >
                        {isExpense ? "-" : "+"}{fmtAmt}원
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </li>
      </React.Fragment>
    );
  };

  // ========== 메인 렌더링 ==========

  render() {
    const { userColor, hoverColor, userId, groupId } = this.props;
    const {
      txList, selMonth, summary, editOpen, editingTx, visibleCount,
      categories, catSummary, expanded, selCatCode,
      memberExpenses, members, checkedMembers,
      summaryLoading, users, groups,
    } = this.state;

    // --- 파생 데이터 ---

    /** 사용 가능한 월 목록 (최신순 정렬) */
    const months = [...new Set(txList.map((tx) => extractMonth(tx.date)))]
      .filter(Boolean)
      .sort()
      .reverse();

    /** 선택 월 + 카테고리 필터 적용된 거래 전체 */
    const filteredTx = txList
      .filter((tx) => tx.date?.startsWith(selMonth))
      .filter((tx) => (selCatCode ? tx.category === selCatCode : true));

    /** 선택 월의 거래 전체 (카테고리 필터 없음, 수입 계산용) */
    const monthTx = txList.filter((tx) => tx.date?.startsWith(selMonth));

    /** 월 총 수입 */
    const totalIncome = calcTotalIncome(monthTx);

    /** 체크된 멤버들의 개인지출 합계 */
    const personalTotal = calcPersonalExpenses(members, memberExpenses, checkedMembers);

    /** 최종 지출 합계 (그룹이면 개인지출 포함) */
    const totalExpense = groupId
      ? summary.spent + personalTotal
      : summary.spent;

    /** 순이익 = 수입 - 지출 */
    const netProfit = totalIncome - totalExpense;

    /** 무한 스크롤 적용 후 실제 표시할 거래 목록 */
    const displayedTx = filteredTx.slice(0, visibleCount);

    return (
      <div className="monthly-container">

        {/* ── 월 선택 탭 ── */}
        <div
          className="month-scroll-bar"
          style={{
            "--scroll-color":       userColor ? `${userColor}60` : "rgba(0,100,255,0.3)",
            "--scroll-hover-color": userColor ? `${userColor}99` : "rgba(0,100,255,0.5)",
          }}
        >
          {months.map((m) => (
            <button
              key={m}
              className={`month-tab ${m === selMonth ? "active" : ""}`}
              onClick={() => this.onMonthChange(m)}
              style={{
                backgroundColor:    m === selMonth ? userColor : "transparent",
                color:              m === selMonth ? "white" : "#444",
                border:             `1.5px solid ${userColor || "#f4a8a8"}`,
                "--hover-color":    hoverColor || "#f19191",
                "--active-color":   userColor  || "#f4a8a8",
                "--active-color2":  hoverColor || "#f19191",
                "--inactive-color": userColor  ? `${userColor}15` : "#fff7f7",
                "--inactive-color2":userColor  ? `${userColor}30` : "#ffeaea",
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {/* ── 예산 요약 카드 ── */}
        <BudgetReceiptCard
          selMonth={selMonth}
          summary={summary}
          summaryLoading={summaryLoading}
          expanded={expanded}
          catSummary={catSummary}
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          netProfit={netProfit}
          groupId={groupId}
          userColor={userColor}
          hoverColor={hoverColor}
          checkedMembers={checkedMembers}
          selCatCode={selCatCode}
          onExpandToggle={() =>
            this.setState((prev) => ({ expanded: !prev.expanded }))
          }
          onAllMembersCheck={this.onAllMembersCheck}
          onCatSelect={this.onCatSelect}
        />

        {/* ── 거래 내역 리스트 ── */}
        <ul className="list">
          {displayedTx.map((tx, idx) =>
            this.renderTxItem(tx, idx, displayedTx, filteredTx)
          )}
        </ul>

        {/* ── 수정 다이얼로그 ── */}
        <EditDialog
          open={editOpen}
          onClose={() => this.setState({ editOpen: false })}
          item={editingTx}
          onSave={this.onSave}
          userId={userId}
          groupId={groupId}
          categories={categories}
          users={users}
          groups={groups}
          userColor={userColor}
          hoverColor={hoverColor}
          disableScrollLock
          keepMounted
        />
      </div>
    );
  }
}

export default MonthlyListPage;
