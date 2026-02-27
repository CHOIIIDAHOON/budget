// src/features/budget/dialog/EditDialog/EditDialog.jsx
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import React from "react";
import { fetchCategories } from "../../../../api/budgetApi";
import { darkenColor } from "../../../../shared/utils/color";
import DatePicker from "../../components/DatePicker/DatePicker";
import DropDown from "../../components/dropdown/DropDown";
import NumericTextBox from "../../components/NumericTextBox/NumericTextBox";
import TextBox from "../../components/TextBox/TextBox";
import "./EditDialog.scss";

class EditDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      rawAmount: "",
      memo: "",
      transactionType: "expense",
      selectedCategoryCode: "",
      selectedDate: "",
      selectedUserId: null,
      selectedGroupId: null,
      availableCategories: [],
    };
  }

  /* =========================================================
   * Lifecycle
   * ========================================================= */

  componentDidMount() {
    const { categories, item, userId, groupId } = this.props;

    this.applyColorVars();

    if (categories) {
      this.setState({ availableCategories: categories });
    }

    if (item) {
      this.setState({
        rawAmount: Math.abs(item.amount).toString(),
        memo: item.memo || "",
        transactionType: item.amount < 0 ? "expense" : "income",
        selectedCategoryCode: item.category || "",
        selectedDate: item.date,
        selectedUserId: item.user_Id || null,
        selectedGroupId: item.group_Id || null,
      });
    } else {
      this.setState({
        selectedDate: new Date().toISOString().split("T")[0],
        selectedUserId: userId || null,
        selectedGroupId: userId ? null : groupId || null,
      });
    }
  }

  componentDidUpdate(prevProps) {
    const { categories, item, userId, groupId, userColor, hoverColor } = this.props;

    if (categories !== prevProps.categories && categories) {
      this.setState({ availableCategories: categories });
    }

    if (item !== prevProps.item && item) {
      this.setState({
        rawAmount: Math.abs(item.amount).toString(),
        memo: item.memo || "",
        transactionType: item.amount < 0 ? "expense" : "income",
        selectedCategoryCode: item.category || "",
        selectedDate: item.date,
        selectedUserId: item.user_Id || null,
        selectedGroupId: item.group_Id || null,
      });
    }

    if (
      (item !== prevProps.item ||
        userId !== prevProps.userId ||
        groupId !== prevProps.groupId) &&
      !item
    ) {
      this.setState({
        selectedDate: new Date().toISOString().split("T")[0],
        selectedUserId: userId || null,
        selectedGroupId: userId ? null : groupId || null,
      });
    }

    if (userColor !== prevProps.userColor || hoverColor !== prevProps.hoverColor) {
      this.applyColorVars();
    }
  }

  /* =========================================================
   * Helpers
   * ========================================================= */

  applyColorVars() {
    const { userColor = "#f4a8a8", hoverColor = "#f19191" } = this.props;
    document.documentElement.style.setProperty("--main-color", userColor);
    document.documentElement.style.setProperty("--hover-color", hoverColor);
    document.documentElement.style.setProperty(
      "--active-color",
      darkenColor(userColor, 32)
    );
  }

  async loadCategories({ userId, groupId }) {
    console.log("loadCategories 호출", { userId, groupId });
    const result = await fetchCategories({ userId, groupId });
    this.setState({ availableCategories: result, selectedCategoryCode: "" });
  }

  validateBeforeSave() {
    const { selectedUserId, selectedGroupId, rawAmount, selectedCategoryCode, selectedDate } =
      this.state;
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
  }

  /* =========================================================
   * Handlers
   * ========================================================= */

  handleSave() {
    if (!this.validateBeforeSave()) return;

    const {
      rawAmount,
      memo,
      selectedCategoryCode,
      transactionType,
      selectedUserId,
      selectedGroupId,
      selectedDate,
    } = this.state;
    const { onSave } = this.props;

    const numericAmount = parseInt(rawAmount.replace(/,/g, ""), 10) || 0;
    const finalAmount = transactionType === "expense" ? -numericAmount : numericAmount;

    onSave({
      amount: finalAmount,
      memo,
      category: selectedCategoryCode,
      type: transactionType,
      userId: selectedUserId,
      groupId: selectedGroupId,
      date: selectedDate,
    });
  }

  handleOwnerChange(e) {
    const code = e.target.value;
    if (code.startsWith("user-")) {
      const id = code.slice(5);
      this.setState({ selectedUserId: id, selectedGroupId: null });
      this.loadCategories({ userId: id, groupId: null });
    } else if (code.startsWith("group-")) {
      const id = code.slice(6);
      this.setState({ selectedGroupId: id, selectedUserId: null });
      this.loadCategories({ userId: null, groupId: id });
    }
  }

  handleAmountChange(e) {
    this.setState({ rawAmount: e.target.value });
  }

  handlePreset(preset) {
    const current = parseInt(this.state.rawAmount || "0", 10);
    this.setState({ rawAmount: String(current + preset) });
  }

  /* =========================================================
   * Render
   * ========================================================= */

  render() {
    const { open, onClose, users = [], groups = [] } = this.props;
    const {
      rawAmount,
      memo,
      transactionType,
      selectedCategoryCode,
      selectedDate,
      selectedUserId,
      selectedGroupId,
      availableCategories,
    } = this.state;

    const ownerOptions = [
      ...users.map((u) => ({ code: `user-${u.id}`, description: u.username })),
      ...groups.map((g) => ({ code: `group-${g.id}`, description: `${g.name} (그룹)` })),
    ];

    const ownerValue = selectedUserId
      ? `user-${selectedUserId}`
      : selectedGroupId
      ? `group-${selectedGroupId}`
      : "";

    return (
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        slotProps={{ paper: { sx: { overflow: "visible" } } }}
      >
        <DialogTitle>항목 수정</DialogTitle>

        <DialogContent sx={{ overflow: "visible" }}>
          {/* 사용자 / 그룹 */}
          <div className="edit-section">
            <DropDown
              name="owner"
              label="사용자 / 그룹"
              options={ownerOptions}
              value={ownerValue}
              onChange={(e) => this.handleOwnerChange(e)}
            />
          </div>

          {/* 날짜 */}
          <div className="edit-section">
            <DatePicker
              name="date"
              labelText="날짜"
              value={selectedDate}
              onChange={(e) => this.setState({ selectedDate: e.target.value })}
            />
          </div>

          {/* 금액 */}
          <div className="edit-section">
            <div className="amount-type-row">
              <NumericTextBox
                name="amount"
                value={rawAmount}
                onChange={(e) => this.handleAmountChange(e)}
                onPreset={(preset) => this.handlePreset(preset)}
              />
              <div className="type-tabs">
                {["expense", "income"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={transactionType === t ? "active" : ""}
                    onClick={() => this.setState({ transactionType: t })}
                  >
                    {t === "expense" ? "지출" : "수입"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 카테고리 */}
          <div className="edit-section">
            <DropDown
              name="category"
              label="카테고리"
              options={availableCategories}
              value={selectedCategoryCode}
              onChange={(e) => this.setState({ selectedCategoryCode: e.target.value })}
            />
          </div>

          {/* 메모 */}
          <div className="edit-section">
            <TextBox
              name="memo"
              value={memo}
              onChange={(e) => this.setState({ memo: e.target.value })}
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
            onClick={() => this.handleSave()}
            style={{ background: "var(--main-color)" }}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
}

export default EditDialog;
