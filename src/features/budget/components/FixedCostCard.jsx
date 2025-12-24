// src/features/budget/components/FixedCostCard.jsx
import { Button, Checkbox } from "@mui/material";
import styles from "./FixedCostCard.module.css";

export default function FixedCostCard({
  item,
  categories,
  userColor = "#f4a8a8",
  hoverColor = "#f19191",
  onEdit,
  onDelete,
}) {
  const cat =
    categories.find((c) => c.code === item.category)?.description ||
    item.category;

  return (
    <div
      className={styles.card}
      style={{ opacity: item.active ? 1 : 0.55 }}
    >
      <div className={styles.topRow}>
        <div className={styles.left}>
          <span
            className={styles.title}
            style={{ color: item.active ? userColor : "#bbb" }}
          >
            {cat}
          </span>
          <span className={styles.day}>{item.day}일</span>
        </div>

        <div className={styles.right}>
          <span className={styles.amount}>
            {item.amount.toLocaleString()}원
          </span>
          <Checkbox
            checked={item.active}
            disabled
            size="small"
            sx={{ p: 0.5, color: userColor }}
          />
        </div>
      </div>

      {/* 2️⃣ 메모 요약 */}
      {item.memo && (
        <div
          className={styles.memo}
          title={item.memo}
          style={{ borderLeftColor: userColor }}
        >
          {item.memo}
        </div>
      )}

      {/* 3️⃣ 액션 */}
      <div className={styles.actions}>
        <Button
          size="small"
          onClick={onEdit}
          sx={{
            minWidth: 48,
            fontSize: 12,
            borderRadius: 1,
            background: hoverColor,
            color: "#fff",
            px: 1,
            py: 0.25,
          }}
        >
          수정
        </Button>
        <Button
          size="small"
          onClick={onDelete}
          sx={{
            minWidth: 48,
            fontSize: 12,
            borderRadius: 1,
            background: "#ff6b6b",
            color: "#fff",
            px: 1,
            py: 0.25,
          }}
        >
          삭제
        </Button>
      </div>
    </div>
  );
}
