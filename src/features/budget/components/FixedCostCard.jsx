// src/features/budget/components/FixedCostCard.jsx
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { IconButton } from "@mui/material";
import styles from "./FixedCostCard.module.css";

export default function FixedCostCard({
  item,
  categories,
  userColor = "#f4a8a8",
  onEdit,
  onDelete,
}) {
  const cat =
    categories.find((c) => c.code === item.category)?.description ||
    item.category;

  return (
    <div className={styles.card} style={{ opacity: item.active ? 1 : 0.5 }}>
      <div className={styles.left}>
        <div className={styles.titleRow}>
          <span className={styles.title} style={{ color: item.active ? userColor : "#bbb" }}>
            {cat}
          </span>
          <span className={styles.day}>{item.day}일</span>
        </div>
        {item.memo && (
          <div className={styles.memo} title={item.memo}>{item.memo}</div>
        )}
      </div>

      <div className={styles.right}>
        <span className={styles.amount}>{item.amount.toLocaleString()}원</span>
        <IconButton size="small" onClick={onEdit} sx={{ p: 0.5 }}>
          <EditIcon sx={{ fontSize: 16, color: userColor }} />
        </IconButton>
        <IconButton size="small" onClick={onDelete} sx={{ p: 0.5 }}>
          <DeleteIcon sx={{ fontSize: 16, color: "#ff6b6b" }} />
        </IconButton>
      </div>
    </div>
  );
}
