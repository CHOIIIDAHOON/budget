/**
 * 현재 날짜를 KST(UTC+9) 기준 YYYY-MM-DD 형식으로 반환
 */
export function getToday() {
  const now = new Date();
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  const kstDate = new Date(now.getTime() + kstOffsetMs);
  return kstDate.toISOString().split("T")[0];
}

/**
 * 현재 월을 KST(UTC+9) 기준 YYYY-MM 형식으로 반환
 */
export function getCurrentMonth() {
  const now = new Date();
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  const kstDate = new Date(now.getTime() + kstOffsetMs);
  return kstDate.toISOString().slice(0, 7);
}

/**
 * 날짜 문자열(YYYY-MM-DD)에서 월(YYYY-MM) 추출
 * @param {string} dateStr
 * @returns {string|null}
 */
export function extractMonth(dateStr) {
  return dateStr?.slice(0, 7) ?? null;
}

/**
 * 날짜 문자열(YYYY-MM-DD)에서 일(DD) 추출
 * @param {string} dateStr
 * @returns {string|null}
 */
export function extractDay(dateStr) {
  return dateStr?.slice(8, 10) ?? null;
}
