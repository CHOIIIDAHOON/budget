import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
  TextField,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import {
  addCategory,
  addFixedCost,
  deleteFixedCost,
  fetchCategories,
  fetchFixedCosts,
  softDeleteCategory,
  updateCategoriesSort,
  updateCategory,
} from "../../../api/budgetApi";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import FixedCostCard from "@/features/budget/components/FixedCostCard";
import FixedCostForm from "@/features/budget/components/FixedCostForm";
import "./SettingsDialog.css";

/* ---------- 유틸 ---------- */
function generateRandomCode() {
  const random = Math.random().toString(36).substring(2, 6);
  const timestamp = Date.now().toString(36).slice(-4);
  return `cat_${random}${timestamp}`;
}

/* ---------- SortableItem ---------- */
function SortableItem({
  item,
  index,
  onDelete,
  onEditStart,
  onEditSave,
  onEditCancel,
  editing,
  editValue,
  setEditValue,
  editSharedTotal,
  setEditSharedTotal,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.code });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      style={style}
      className={`sortable-item ${editing ? "editing" : ""}`}
    >
      <div className="drag-handle" {...listeners}>
        ☰
      </div>

      <div className="sortable-content">
        {editing ? (
          <>
            <div className="edit-row">
              <TextField
                size="small"
                fullWidth
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
              />
              <IconButton size="small" onClick={() => onEditSave(item.code)}>
                <CheckIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={onEditCancel}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </div>

            <div className="edit-option">
              <Checkbox
                size="small"
                checked={editSharedTotal}
                onChange={(e) => setEditSharedTotal(e.target.checked)}
              />
              <span>누적보기</span>
            </div>
          </>
        ) : (
          <>
            <div className="item-text-primary">{item.description}</div>
            <div className="item-text-secondary">정렬 순서: {index}</div>
          </>
        )}
      </div>

      {!editing && (
        <div className="item-actions">
          <IconButton size="small" onClick={() => onEditStart(item)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => onDelete(item.code)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </div>
      )}
    </div>
  );
}

/* ---------- 메인 ---------- */
function SettingsDialog({
  open,
  onClose,
  onCategoryChange,
  userId,
  groupId,
  userColor = "#f4a8a8",
  hoverColor = "#f19191",
}) {
  const [activeTab, setActiveTab] = useState(0);

  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({ description: "" });
  const [editingCode, setEditingCode] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [editSharedTotal, setEditSharedTotal] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const [fixedCosts, setFixedCosts] = useState([]);

  /* ---------- sensors ---------- */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250 } })
  );

  /* ---------- load ---------- */
  const loadCategories = useCallback(async () => {
    const data = await fetchCategories({ userId, groupId });
    setCategories([...data].sort((a, b) => a.sort - b.sort));
  }, [userId, groupId]);

  const loadFixedCosts = useCallback(async () => {
    const data = await fetchFixedCosts(userId, groupId);
    setFixedCosts(data);
  }, [userId, groupId]);

  useEffect(() => {
    if (open) {
      loadCategories();
      loadFixedCosts();
    }
  }, [open, loadCategories, loadFixedCosts]);

  /* ---------- handlers ---------- */
  const handleAddCategory = async () => {
    if (!newCategory.description.trim()) return;
    const maxSort = categories.length
      ? Math.max(...categories.map((c) => c.sort))
      : 0;

    await addCategory(
      {
        code: generateRandomCode(),
        description: newCategory.description,
        sort: maxSort + 1,
      },
      userId,
      groupId
    );

    setNewCategory({ description: "" });
    await loadCategories();
    onCategoryChange?.();
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.code === active.id);
    const newIndex = categories.findIndex((c) => c.code === over.id);

    const reordered = arrayMove(categories, oldIndex, newIndex).map(
      (item, idx) => ({ ...item, sort: idx })
    );

    setCategories(reordered);
    await updateCategoriesSort(reordered, userId, groupId);
    onCategoryChange?.();
  };

  /* ---------- render ---------- */
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>환경 설정</DialogTitle>

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="fullWidth"
      >
        <Tab label="카테고리 관리" />
        <Tab label="고정비용 관리" />
      </Tabs>

      {/* 🔥 DialogContent는 스크롤 제거 */}
      <DialogContent className="settings-dialog-content">
        {activeTab === 0 && (
          <>
            <div className="category-section">
              {/* 카테고리 리스트 */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={(e) => setActiveId(e.active.id)}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={categories.map((c) => c.code)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="settings-list-wrapper">
                    {categories.map((cat, idx) => (
                      <SortableItem
                        key={cat.code}
                        item={cat}
                        index={idx}
                        editing={editingCode === cat.code}
                        editValue={editValue}
                        editSharedTotal={editSharedTotal}
                        setEditValue={setEditValue}
                        setEditSharedTotal={setEditSharedTotal}
                        onEditStart={(i) => {
                          setEditingCode(i.code);
                          setEditValue(i.description);
                          setEditSharedTotal(!!i.is_shared_total);
                        }}
                        onEditCancel={() => setEditingCode(null)}
                        onEditSave={async (code) => {
                          await updateCategory(
                            code,
                            {
                              description: editValue,
                              is_shared_total: editSharedTotal,
                            },
                            userId,
                            groupId
                          );
                          setEditingCode(null);
                          loadCategories();
                          onCategoryChange?.();
                        }}
                        onDelete={async (code) => {
                          await softDeleteCategory(code, userId, groupId);
                          loadCategories();
                          onCategoryChange?.();
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>

                <DragOverlay>
                  {activeId && (
                    <div className="sortable-item drag-preview">
                      {categories.find((c) => c.code === activeId)?.description}
                    </div>
                  )}
                </DragOverlay>
              </DndContext>

              {/* 카테고리 추가 */}
              <div className="add-category-row toss-style">
                <TextField
                  size="small"
                  placeholder="새 카테고리 이름"
                  value={newCategory.description}
                  onChange={(e) =>
                    setNewCategory({ description: e.target.value })
                  }
                  fullWidth
                />
                <Button
                  onClick={handleAddCategory}
                  variant="contained"
                  className="add-btn"
                >
                  추가
                </Button>
              </div>
            </div>
          </>
        )}

        {activeTab === 1 && (
          <>
            <FixedCostForm
              categories={categories}
              onSubmit={async (payload) => {
                await addFixedCost({ ...payload, userId, groupId });
                loadFixedCosts();
              }}
            />

            {/* ✅ 고정비용 리스트만 스크롤 */}
            <div className="fixed-cost-list">
              {fixedCosts.map((item) => (
                <FixedCostCard
                  key={item.id}
                  item={item}
                  categories={categories}
                  onDelete={async () => {
                    await deleteFixedCost(item.id);
                    loadFixedCosts();
                  }}
                />
              ))}
            </div>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
}

export default SettingsDialog;
