// src/features/budget/components/FixedCostForm.jsx
import { useEffect, useMemo, useState } from "react";
import styles from "./FixedCostForm.module.css";
import DropDown from "./dropdown/DropDown";
import NumericTextBox from "./NumericTextBox/NumericTextBox";
import TextBox from "./TextBox/TextBox";

const unfmt = (v) => String(v || "").replace(/[^\d]/g, "");

/* 초기 상태 */
const INITIAL_FORM = {
  category: "",
  amount: "",
  day: 30,
  memo: "",
  active: true,
};

/* 비교용 정규화 */
const normalize = (v) => ({
  category: v.category ?? "",
  amount: Number(v.amount ?? 0),
  day: Number(v.day ?? 0),
  memo: (v.memo ?? "").trim(),
  active: !!v.active,
});

export default function FixedCostForm({
  categories = [],
  initialValues = null, // 수정 모드
  userColor = "#f4a8a8",
  hoverColor = "#f19191",
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(INITIAL_FORM);

  const isEditMode = !!initialValues;

  /* ---------------- 수정 모드 진입 / 종료 ---------------- */
  useEffect(() => {
    if (initialValues) {
      setForm({
        category: initialValues.category ?? "",
        amount: String(initialValues.amount ?? ""),
        day: initialValues.day ?? 30,
        memo: initialValues.memo ?? "",
        active: !!initialValues.active,
      });
    } else {
      setForm(INITIAL_FORM);
    }
  }, [initialValues]);

  /* ---------------- 취소 ---------------- */
  const handleCancel = () => {
    setForm(INITIAL_FORM);
    onCancel?.();
  };

  /* ---------------- 유효성 ---------------- */
  const canSubmit =
    form.category &&
    Number(unfmt(form.amount)) > 0 &&
    Number(form.day) >= 1 &&
    Number(form.day) <= 365;

  /* ---------------- 변경 여부 판단 ---------------- */
  const isDirty = useMemo(() => {
    if (!isEditMode) return true;
    return (
      JSON.stringify(normalize(form)) !==
      JSON.stringify(normalize(initialValues))
    );
  }, [form, initialValues, isEditMode]);

  const canSave = canSubmit && (!isEditMode || isDirty);

  /* ---------------- change handler ---------------- */
  const handleChange = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  /* ---------------- submit ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSave) return;

    await onSubmit?.({
      category: form.category,
      amount: Number(unfmt(form.amount)),
      day: Number(form.day),
      memo: form.memo?.trim() || "",
      active: !!form.active,
    });

    if (!isEditMode) {
      setForm(INITIAL_FORM);
    }
  };

  return (
    <div className={styles.card}>
      <form onSubmit={handleSubmit}>
        {/* ===== 상태 헤더 ===== */}
        {isEditMode ? (
          <div className={styles.editHeader}>
            <span className={styles.editBadge} style={{ background: userColor }}>
              수정 중
            </span>
            <span className={styles.editDesc}>기존 고정비를 수정하고 있어요</span>
          </div>
        ) : (
          <div className={styles.addHeader}>
            <span className={styles.addBadge} style={{ background: userColor }}>
              추가
            </span>
            <span className={styles.addDesc}>새로운 고정비를 등록합니다</span>
          </div>
        )}

        {/* ===== 카테고리 ===== */}
        <div className={styles.field}>
          <DropDown
            name="category"
            label="카테고리"
            value={form.category}
            options={categories}
            onChange={handleChange("category")}
          />
        </div>

        {/* ===== 금액 + 주기 ===== */}
        <div className={styles.inlineRow}>
          <div className={styles.amountField}>
            <NumericTextBox
              name="amount"
              label="금액"
              value={form.amount}
              onChange={handleChange("amount")}
            />
          </div>

          <div className={styles.dayField}>
            <div className={styles.dayWrapper}>
              <label className={`${styles.dayLabel} ${form.day ? styles.dayLabelFloating : ""}`}>
                주기
              </label>
              <input
                className={styles.dayInput}
                type="number"
                min={1}
                max={365}
                inputMode="numeric"
                value={form.day}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    day: Math.max(1, Math.min(365, Number(e.target.value) || 1)),
                  }))
                }
              />
              <span className={styles.unit}>일</span>
            </div>
          </div>
        </div>

        {/* ===== 메모 ===== */}
        <div className={styles.field}>
          <TextBox
            name="memo"
            label="메모 (선택)"
            value={form.memo}
            onChange={handleChange("memo")}
          />
        </div>

        {/* ===== 변경 없음 힌트 ===== */}
        {isEditMode && !isDirty && (
          <div className={styles.noChangeHint}>변경된 내용이 없습니다</div>
        )}

        {/* ===== 버튼 ===== */}
        <div className={styles.actions}>
          <button
            type="submit"
            disabled={!canSave}
            className={styles.submitBtn}
            style={{
              background: canSave
                ? `linear-gradient(135deg, ${userColor} 0%, ${hoverColor} 100%)`
                : undefined,
            }}
          >
            {isEditMode ? "고정비용 수정" : "고정비용 추가"}
          </button>

          {isEditMode && (
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={handleCancel}
            >
              취소
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
