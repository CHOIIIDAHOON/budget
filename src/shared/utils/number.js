/**
 * 숫자 또는 숫자 문자열을 천단위 콤마 포맷으로 변환
 * @param {string|number} value - 변환할 값
 * @returns {string} 콤마 포맷 문자열 (e.g. "1,234,567")
 */
export function formatWithComma(value) {
  if (!value && value !== 0) return "";
  const num = String(value).replace(/,/g, "");
  const parsed = parseInt(num, 10);
  if (isNaN(parsed)) return "";
  return parsed.toLocaleString();
}

/**
 * 콤마 포함 문자열에서 순수 숫자 문자열 추출
 * @param {string} value - 입력값
 * @returns {string} 숫자만 남긴 문자열 (e.g. "1234567")
 */
export function parseAmount(value) {
  return String(value || "").replace(/[^\d]/g, "");
}
