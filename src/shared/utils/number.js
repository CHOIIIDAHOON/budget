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

/**
 * 숫자를 한국어 단위(억/만)로 포맷
 * @param {number|string} amount
 * @returns {string} e.g. 10000000 → "1000만원", 150000000 → "1억5000만원"
 */
export function formatKoreanAmount(amount) {
  const n = Math.abs(Number(amount));
  const sign = Number(amount) < 0 ? "-" : "";
  if (n === 0) return "0원";

  const eok = Math.floor(n / 100000000);
  const man = Math.floor((n % 100000000) / 10000);
  const won = n % 10000;

  let result = "";
  if (eok) result += `${eok}억`;
  if (man) result += `${man}만`;
  if (won) result += `${won.toLocaleString()}`;
  if (!result) result = "0";

  return sign + result + "원";
}
