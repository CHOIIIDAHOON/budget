// src/features/budget/components/FixedCostForm.jsx
import {
  Button,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import styles from "./FixedCostForm.module.css";

const fmt = (v) => (v ? Number(v).toLocaleString() : "");
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
    const val = e.target.value;
    setForm((f) => ({
      ...f,
      [key]: key === "amount" ? unfmt(val) : val,
    }));
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

    // 추가 모드일 때만 초기화
    if (!isEditMode) {
      setForm(INITIAL_FORM);
    }
  };

  return (
    <Paper className={styles.card} elevation={0}>
      <form onSubmit={handleSubmit}>
        {/* ===== 상태 헤더 ===== */}
        {isEditMode ? (
          <div className={styles.editHeader}>
            <span
              className={styles.editBadge}
              style={{ background: userColor }}
            >
              수정 중
            </span>
            <span className={styles.editDesc}>
              기존 고정비를 수정하고 있어요
            </span>
          </div>
        ) : (
          <div className={styles.addHeader}>
            <span
              className={styles.addBadge}
              style={{ background: userColor }}
            >
              추가
            </span>
            <span className={styles.addDesc}>
              새로운 고정비를 등록합니다
            </span>
          </div>
        )}

        {/* ===== 카테고리 ===== */}
        <FormControl fullWidth size="small" className={styles.field}>
          <InputLabel>카테고리</InputLabel>
          <Select
            label="카테고리"
            value={form.category}
            onChange={handleChange("category")}
            MenuProps={{
              disablePortal: false,
              container: document.body,
            }}
          >
            <MenuItem value="">
              <em>선택</em>
            </MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.code} value={c.code}>
                {c.description}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* ===== 금액 + 주기 ===== */}
        <div className={styles.inlineRow}>
          <TextField
            fullWidth
            size="small"
            label="금액"
            value={fmt(form.amount)}
            onChange={handleChange("amount")}
            inputMode="numeric"
            placeholder="50,000"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">원</InputAdornment>
              ),
            }}
          />

          <TextField
            size="small"
            type="number"
            label="주기"
            value={form.day}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                day: Math.max(
                  1,
                  Math.min(365, Number(e.target.value) || 1)
                ),
              }))
            }
            InputProps={{
              inputProps: { min: 1, max: 365 },
              endAdornment: <span className={styles.unit}>일</span>,
            }}
            className={styles.dayField}
          />
        </div>

        {/* ===== 메모 ===== */}
        <TextField
          fullWidth
          size="small"
          label="메모 (선택)"
          value={form.memo}
          onChange={handleChange("memo")}
          placeholder="넷플릭스, 통신비 등"
          className={styles.field}
        />

        {/* ===== 변경 없음 힌트 ===== */}
        {isEditMode && !isDirty && (
          <div className={styles.noChangeHint}>
            변경된 내용이 없습니다
          </div>
        )}

        {/* ===== 버튼 ===== */}
        <div className={styles.actions}>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={!canSave}
            sx={{
              mt: 0.5,
              py: 1,
              fontWeight: 700,
              fontSize: 14,
              background: `linear-gradient(135deg, ${userColor} 0%, ${hoverColor} 100%)`,
            }}
          >
            {isEditMode ? "고정비용 수정" : "고정비용 추가"}
          </Button>

          {isEditMode && (
            <Button
              fullWidth
              variant="text"
              onClick={handleCancel}
              sx={{ mt: 0.5, fontSize: 13 }}
            >
              취소
            </Button>
          )}
        </div>
      </form>
    </Paper>
  );
}
