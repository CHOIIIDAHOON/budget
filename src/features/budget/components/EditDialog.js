// src/components/EditDialog.js
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import { fetchCategories } from "../../../api/budgetApi";
import { darkenColor } from "../../../shared/utils/color";
import "./InputForm.css";

// 렌더링 카운터 (디버깅용)
let renderCount = 0;

/**
 * 지출/수입 항목 생성 및 수정 다이얼로그
 */
const EditDialog = ({
  open,
  onClose,
  item,
  onSave,
  userId,
  groupId,
  users = [],
  groups = [],
  categories,
  userColor = "#f4a8a8",
  hoverColor = "#f19191",
  
}) => {
  // 렌더링 추적
  console.log("=== EditDialog 렌더링 #", ++renderCount, "===");
  
  /* =========================================================
   * State - Form Fields
   * ========================================================= */

  const [rawAmount, setRawAmount] = useState(""); 
  const [memo, setMemo] = useState("");
  const [transactionType, setTransactionType] = useState("expense");
  const [selectedCategoryCode, setSelectedCategoryCode] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  /* =========================================================
   * State - Owner (User / Group)
   * ========================================================= */

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  /* =========================================================
   * State - Dropdown Control
   * ========================================================= */

  const [isOwnerDropdownOpen, setIsOwnerDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const ownerDropdownRef = useRef(null);
  const categoryDropdownRef = useRef(null);

  /* =========================================================
   * State - Category Cache
   * ========================================================= */

  const [availableCategories, setAvailableCategories] = useState([]);

  /* =========================================================
   * Derived Values
   * ========================================================= */

  const ownerOptions = [
    ...users.map((u) => ({ type: "user", id: u.id, name: u.username })),
    ...groups.map((g) => ({ type: "group", id: g.id, name: g.name })),
  ];

  const selectedOwnerName = selectedUserId
    ? users.find((u) => u.id === selectedUserId)?.username
    : selectedGroupId
    ? groups.find((g) => g.id === selectedGroupId)?.name
    : "-- 선택하세요 --";

  const selectedCategory = availableCategories.find(
    (c) => c.code === selectedCategoryCode
  );

  const formatAmount = (value) =>
    value.replace(/,/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  /* =========================================================
   * Effects
   * ========================================================= */

  useEffect(() => {
    console.log("Effect: categories 변경");
    if (categories) {
      setAvailableCategories(categories);
    }
  }, [categories]);

  useEffect(() => {
    console.log("Effect: 외부 클릭 리스너 등록");
    const handleOutsideClick = (e) => {
      if (
        ownerDropdownRef.current &&
        !ownerDropdownRef.current.contains(e.target)
      ) {
        setIsOwnerDropdownOpen(false);
      }

      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    };

    document.addEventListener("click", handleOutsideClick);
    return () => {
      console.log("Effect cleanup: 외부 클릭 리스너 제거");
      document.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (!item) return;

    console.log("edit item", item);

    setRawAmount(Math.abs(item.amount).toString());
    setMemo(item.memo || "");
    setTransactionType(item.amount < 0 ? "expense" : "income");
    setSelectedCategoryCode(item.category || "");
    setSelectedDate(item.date);

    if (item.userId) {
      setSelectedUserId(item.userId);
      setSelectedGroupId(null);
    } else if (item.groupId) {
      setSelectedGroupId(item.groupId);
      setSelectedUserId(null);
    }
  }, [item]);

    // 신규 생성일 때만
  useEffect(() => {
    if (item) return;

    setSelectedDate(new Date().toISOString().split("T")[0]);

    if (userId) {
      setSelectedUserId(userId);
      setSelectedGroupId(null);
    } else if (groupId) {
      setSelectedGroupId(groupId);
      setSelectedUserId(null);
    }
  }, [item, userId, groupId]);

  useEffect(() => {
    console.log("Effect: 테마 컬러 변경", { userColor, hoverColor });
    document.documentElement.style.setProperty("--main-color", userColor);
    document.documentElement.style.setProperty("--hover-color", hoverColor);
    document.documentElement.style.setProperty(
      "--active-color",
      darkenColor(userColor, 32)
    );
  }, [userColor, hoverColor]);

  /* =========================================================
   * Helpers
   * ========================================================= */

  const loadCategories = async ({ userId, groupId }) => {
    console.log("loadCategories 호출", { userId, groupId });
    const result = await fetchCategories({ userId, groupId });
    setAvailableCategories(result);
    setSelectedCategoryCode("");
  };

  const validateBeforeSave = () => {
    if (!selectedUserId && !selectedGroupId) {
      alert("사용자 또는 그룹을 선택하세요.");
      return false;
    }
    if (!rawAmount) {
      alert("금액을 입력하세요.");
      return false;
    }
    if (!selectedCategoryCode) {
      alert("카테고리를 선택하세요.");
      return false;
    }
    if (!selectedDate) {
      alert("날짜를 선택하세요.");
      return false;
    }
    return true;
  };

  /* =========================================================
   * Handlers
   * ========================================================= */

  const handleSave = () => {
    if (!validateBeforeSave()) return;

    const numericAmount =
      parseInt(rawAmount.replace(/,/g, ""), 10) || 0;

    const finalAmount =
      transactionType === "expense" ? -numericAmount : numericAmount;

    onSave({
      amount: finalAmount,
      memo,
      category: selectedCategoryCode,
      type: transactionType,
      userId: selectedUserId,
      groupId: selectedGroupId,
      date: selectedDate,
    });
  };

  const handleOwnerSelect = async (option) => {
    console.log("handleOwnerSelect", option);
    if (option.type === "user") {
      setSelectedUserId(option.id);
      setSelectedGroupId(null);
      await loadCategories({ userId: option.id, groupId: null });
    } else {
      setSelectedGroupId(option.id);
      setSelectedUserId(null);
      await loadCategories({ userId: null, groupId: option.id });
    }
    setIsOwnerDropdownOpen(false);
  };

  const handleAmountChange = (e) => {
    console.log("handleAmountChange 호출");
    setRawAmount(e.target.value.replace(/[^0-9]/g, ""));
  };

  const handleMemoChange = (e) => {
    console.log("handleMemoChange 호출");
    setMemo(e.target.value);
  };

  /* =========================================================
   * Render
   * ========================================================= */

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>항목 수정</DialogTitle>

      <DialogContent>
        {/* 사용자 / 그룹 */}
        <div className="section-block">
          <div className="section-title">사용자 / 그룹</div>
          <div className="custom-select-container" ref={ownerDropdownRef}>
            <div
              className={`custom-select ${isOwnerDropdownOpen ? "open" : ""}`}
              onClick={() => setIsOwnerDropdownOpen(!isOwnerDropdownOpen)}
            >
              <div className="custom-select__selected">{selectedOwnerName}</div>
              <div className="custom-select__arrow">▼</div>
            </div>

            {isOwnerDropdownOpen && (
              <div className="custom-select__dropdown">
                {ownerOptions.map((opt) => (
                  <div
                    key={`${opt.type}-${opt.id}`}
                    className="dropdown-option"
                    onClick={() => handleOwnerSelect(opt)}
                  >
                    {opt.name}
                    {opt.type === "group" ? " (그룹)" : ""}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 날짜 */}
        <div className="section-block">
          <div className="section-title">날짜</div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input-full"
          />
        </div>

        {/* 금액 */}
        <div className="section-block">
          <div className="section-title">금액</div>
          <div className="amount-row">
            <input
              type="text"
              inputMode="numeric"
              value={formatAmount(rawAmount)}
              onChange={handleAmountChange}
              className="input-amount"
            />

            <div className="type-tabs">
              <button
                className={transactionType === "expense" ? "active" : ""}
                onClick={() => setTransactionType("expense")}
              >
                지출
              </button>
              <button
                className={transactionType === "income" ? "active" : ""}
                onClick={() => setTransactionType("income")}
              >
                수입
              </button>
            </div>
          </div>
        </div>

        {/* 카테고리 */}
        <div className="section-block">
          <div className="section-title">카테고리</div>
          <div className="custom-select-container" ref={categoryDropdownRef}>
            <div
              className={`custom-select ${isCategoryDropdownOpen ? "open" : ""}`}
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
            >
              <div className="custom-select__selected">
                {selectedCategory?.description || "-- 선택하세요 --"}
              </div>
              <div className="custom-select__arrow">▼</div>
            </div>

            {isCategoryDropdownOpen && (
              <div className="custom-select__dropdown">
                {availableCategories.map((c) => (
                  <div
                    key={c.code}
                    className="dropdown-option"
                    onClick={() => {
                      setSelectedCategoryCode(c.code);
                      setIsCategoryDropdownOpen(false);
                    }}
                  >
                    {c.description}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 메모 */}
        <div className="section-block">
          <div className="section-title">메모</div>
          <input
            value={memo}
            onChange={handleMemoChange}
            className="input-full"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </DialogContent>

      <DialogActions>
        <Button
          variant="contained"
          onClick={onClose}
          style={{ background: "var(--main-color)" }}
        >
          취소
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          style={{ background: "var(--main-color)" }}
        >
          저장
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default React.memo(EditDialog);