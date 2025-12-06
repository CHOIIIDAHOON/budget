// src/components/EditDialog.js
import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { fetchCategories } from "../../../api/budgetApi";
import { darkenColor } from "../../../shared/utils/color";
import "./InputForm.css";

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
  /* -------------------------------------------------------------
   * State
   * ------------------------------------------------------------- */
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");

  // 선택 항목
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);

  // 드롭다운 제어
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const ownerDropdownRef = useRef(null);
  const categoryDropdownRef = useRef(null);

  const [localCategories, setLocalCategories] = useState([]);

  /* -------------------------------------------------------------
   * Derived
   * ------------------------------------------------------------- */

  const combinedList = [
    ...users.map((u) => ({ type: "user", id: u.id, name: u.username })),
    ...groups.map((g) => ({ type: "group", id: g.id, name: g.name })),
  ];

  const selectedOwnerName = selectedUser
    ? users.find((u) => u.id === selectedUser)?.username
    : selectedGroup
    ? groups.find((g) => g.id === selectedGroup)?.name
    : "-- 선택하세요 --";

  const selectedCategoryObj = localCategories.find((c) => c.code === category);

  const formatWithComma = (v) =>
    v.replace(/,/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  /* -------------------------------------------------------------
   * Effects
   * ------------------------------------------------------------- */

  // 카테고리 초기 세팅
  useEffect(() => {
    if (categories) setLocalCategories(categories);
  }, [categories]);

  // 외부 클릭 시 드롭다운 닫힘
  useEffect(() => {
    const handler = (e) => {
      if (
        ownerDropdownRef.current &&
        !ownerDropdownRef.current.contains(e.target)
      ) {
        setShowOwnerDropdown(false);
      }
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target)
      ) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // item 업데이트 시 초기화
  useEffect(() => {
    // 수정 모드
    if (item) {
      setAmount(Math.abs(item.amount).toString());
      setMemo(item.memo || "");
      setType(item.amount < 0 ? "expense" : "income");
      setCategory(item.category || "");
      setDate(item.date || new Date().toISOString().split("T")[0]);

      if (userId) {
        setSelectedUser(userId);
        setSelectedGroup(null);
      } else if (groupId) {
        setSelectedGroup(groupId);
        setSelectedUser(null);
      }
      return;
    }

    // 신규 모드 기본값
    setDate(new Date().toISOString().split("T")[0]);

    if (userId) {
      setSelectedUser(userId);
      setSelectedGroup(null);

      fetchCategories({ userId, groupId: null }).then((res) => {
        setLocalCategories(res);
        setCategory("");
      });
    }

    if (groupId) {
      setSelectedGroup(groupId);
      setSelectedUser(null);

      fetchCategories({ userId: null, groupId }).then((res) => {
        setLocalCategories(res);
        setCategory("");
      });
    }
  }, [item, userId, groupId]);

  // 테마 컬러 반영
  useEffect(() => {
    document.documentElement.style.setProperty("--main-color", userColor);
    document.documentElement.style.setProperty("--hover-color", hoverColor);
    document.documentElement.style.setProperty(
      "--active-color",
      darkenColor(userColor, 32)
    );
  }, [userColor, hoverColor]);

  /* -------------------------------------------------------------
   * Handlers
   * ------------------------------------------------------------- */

  const validateBeforeSave = () => {
    if (!selectedUser && !selectedGroup) {
      alert("사용자 또는 그룹을 선택하세요.");
      return false;
    }
    if (!amount) {
      alert("금액을 입력하세요.");
      return false;
    }
    if (!category) {
      alert("카테고리를 선택하세요.");
      return false;
    }
    if (!date) {
      alert("날짜를 선택하세요.");
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!validateBeforeSave()) return;

    const numeric = parseInt(amount.replace(/,/g, ""), 10) || 0;
    const finalAmount = type === "expense" ? -numeric : numeric;

    onSave({
      amount: finalAmount,
      memo,
      category,
      type,
      userId: selectedUser,
      groupId: selectedGroup,
      date,
    });
  };

  // 사용자/그룹 선택
  const selectOwner = async (opt) => {
    if (opt.type === "user") {
      setSelectedUser(opt.id);
      setSelectedGroup(null);

      const res = await fetchCategories({ userId: opt.id, groupId: null });
      setLocalCategories(res);
      setCategory("");
    } else {
      setSelectedGroup(opt.id);
      setSelectedUser(null);

      const res = await fetchCategories({ userId: null, groupId: opt.id });
      setLocalCategories(res);
      setCategory("");
    }

    setShowOwnerDropdown(false);
  };

  /* -------------------------------------------------------------
   * UI Components
   * ------------------------------------------------------------- */

  const Section = ({ title, children }) => (
    <div className="section-block">
      <div className="section-title">{title}</div>
      {children}
    </div>
  );

  const Dropdown = ({
    refObj,
    open,
    setOpen,
    selected,
    options,
    onSelect,
    labelFormatter,
  }) => (
    <div className="custom-select-container" ref={refObj}>
      <div
        className={`custom-select ${open ? "open" : ""}`}
        onClick={() => setOpen(!open)}
      >
        <div className="custom-select__selected">{selected}</div>
        <div className="custom-select__arrow">▼</div>
      </div>

      {open && (
        <div className="custom-select__dropdown">
          <div className="dropdown-options">
            {options.map((opt) => (
              <div
                key={opt.key}
                className="dropdown-option"
                onClick={() => onSelect(opt)}
              >
                <span className="option-text">{labelFormatter(opt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  /* -------------------------------------------------------------
   * Render
   * ------------------------------------------------------------- */

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>항목 수정</DialogTitle>
      <DialogContent>
        {/* ------------------------------ */}
        {/* 사용자/그룹 선택 (최상단) */}
        {/* ------------------------------ */}
        <Section title="사용자 / 그룹 선택">
          <Dropdown
            refObj={ownerDropdownRef}
            open={showOwnerDropdown}
            setOpen={setShowOwnerDropdown}
            selected={selectedOwnerName}
            options={combinedList.map((o) => ({
              ...o,
              key: `${o.type}-${o.id}`,
            }))}
            onSelect={selectOwner}
            labelFormatter={(opt) =>
              `${opt.name}${opt.type === "group" ? " (그룹)" : ""}`
            }
          />
        </Section>

        {/* 날짜 */}
        <Section title="날짜">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-full"
          />
        </Section>

        {/* 금액 */}
        <Section title="금액">
          <div className="amount-row">
            <input
              type="text"
              inputMode="numeric"
              value={formatWithComma(amount)}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
              className="input-amount"
            />

            <div className="type-tabs">
              <button
                type="button"
                className={type === "expense" ? "active" : ""}
                onClick={() => setType("expense")}
              >
                지출
              </button>
              <button
                type="button"
                className={type === "income" ? "active" : ""}
                onClick={() => setType("income")}
              >
                수입
              </button>
            </div>
          </div>
        </Section>

        {/* 카테고리 */}
        <Section title="카테고리">
          <Dropdown
            refObj={categoryDropdownRef}
            open={showCategoryDropdown}
            setOpen={setShowCategoryDropdown}
            selected={selectedCategoryObj?.description || "-- 선택하세요 --"}
            options={localCategories.map((c) => ({ ...c, key: c.code }))}
            onSelect={(opt) => {
              setCategory(opt.code);
              setShowCategoryDropdown(false);
            }}
            labelFormatter={(opt) => opt.description}
          />
        </Section>

        {/* 메모 */}
        <Section title="메모">
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="input-full"
          />
        </Section>
      </DialogContent>

      <DialogActions>
        <Button
          variant="contained"
          onClick={onClose}
          style={{ background: `var(--main-color)` }}
        >
          취소
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          style={{ background: `var(--main-color)` }}
        >
          저장
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditDialog;
