/**
 * 거래 목록에서 총 수입 계산 (양수 금액의 합)
 * @param {Array} txList - 거래 목록 ({ amount: number|string }[])
 * @returns {number}
 */
export function calcTotalIncome(txList) {
  return txList
    .filter((tx) => Number(tx.amount) > 0)
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
}

/**
 * 체크된 멤버들의 개인지출 합산
 * @param {Array}  members    - 그룹 멤버 목록 ({ id }[])
 * @param {Object} expenseMap - 멤버별 지출 금액 { memberId: number }
 * @param {Object} checkedMap - 멤버별 포함 여부 { memberId: boolean }
 * @returns {number}
 */
export function calcPersonalExpenses(members, expenseMap, checkedMap) {
  return members.reduce((sum, member) => {
    return checkedMap[member.id]
      ? sum + (expenseMap[member.id] || 0)
      : sum;
  }, 0);
}
