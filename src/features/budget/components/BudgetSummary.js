// // src/components/BudgetSummary.js
// import React, { useEffect, useState } from "react";
// import { saveMonthlyBudget, fetchMonthlySummary } from "../../../api/budgetApi";
// import MonthlyChart from "./MonthlyChart";
// import CategoryChart from "./CategoryChart";
// import "./BudgetSummary.css";

// const BudgetSummary = ({ userId, groupId, userColor }) => {
//   const [month, setMonth] = useState(() => getKSTMonth());
//   const [budget, setBudget] = useState("");
//   const [spent, setSpent] = useState(0);
//   const [loading, setLoading] = useState(false);
//   const [selectedCategory, setSelectedCategory] = useState(null);
//   const percent =
//     Number(budget) > 0 ? Math.round((spent / Number(budget)) * 100) : 0;

//   const [animatedPercent, setAnimatedPercent] = useState(0);

//   function getKSTMonth() {
//     const now = new Date();
//     const kstOffset = 9 * 60 * 60 * 1000; // 9시간
//     const kstDate = new Date(now.getTime() + kstOffset);

//     const year = kstDate.getFullYear();
//     const month = String(kstDate.getMonth() + 1).padStart(2, "0");
//     return `${year}-${month}`;
//   }

//   useEffect(() => {
//     let start = null;
//     const target = percent;
//     const duration = 1000; // 1초
//     const max = 5000; // 최대 5000%까지 허용 (선택 사항)

//     const animate = (timestamp) => {
//       if (!start) start = timestamp;
//       const elapsed = timestamp - start;
//       const progress = Math.min(elapsed / duration, 1);
//       const current = target * progress;

//       setAnimatedPercent(current > max ? max : current);

//       if (progress < 1) {
//         requestAnimationFrame(animate);
//       }
//     };

//     setAnimatedPercent(0); // 초기화
//     requestAnimationFrame(animate);
//   }, [percent]);

//   const loadSummary = async () => {
//     setLoading(true);
//     try {
//       const res = await fetchMonthlySummary(month, userId, groupId);
//       if (res.status === "success") {
//         setBudget(res.budget.toString());
//         setSpent(res.spent);
//       } else {
//         alert("데이터 불러오기 실패: " + res.message);
//       }
//     } catch (err) {
//       alert("요청 실패: " + err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (userId || groupId) {
//       loadSummary();
//     }
//   }, [month, userId, groupId]);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     const res = await saveMonthlyBudget(month, budget, userId, groupId);
//     if (res.status === "success") {
//       alert("예산이 저장되었습니다!");
//       loadSummary();
//     } else {
//       alert("저장 실패: " + res.message);
//     }
//   };

//   const handleCategoryClick = (category) => {
//     setSelectedCategory(selectedCategory === category ? null : category);
//   };

//   return (
//     <div className="budget-container">
//       <h3 className="budget-title">{month} 예산 통계</h3>

//       {/* 예산 진행률 - 상단으로 이동 */}
//       {loading ? (
//         <p>불러오는 중...</p>
//       ) : (
//         <div className="progress-wrapper">
//           <div className="progress-section">
//             <div className="progress-chart">
//               <div className="progress-circle">
//                 <svg width="120" height="120" viewBox="0 0 120 120">
//                   <circle
//                     cx="60"
//                     cy="60"
//                     r="50"
//                     fill="none"
//                     stroke="#f0f0f0"
//                     strokeWidth="8"
//                   />
//                   <circle
//                     cx="60"
//                     cy="60"
//                     r="50"
//                     fill="none"
//                     stroke={userColor}
//                     strokeWidth="8"
//                     strokeDasharray={`${2 * Math.PI * 50}`}
//                     strokeDashoffset={`${
//                       2 *
//                       Math.PI *
//                       50 *
//                       (1 - Math.min(animatedPercent, 100) / 100)
//                     }`}
//                     strokeLinecap="round"
//                     transform="rotate(-90 60 60)"
//                     style={{ transition: "stroke-dashoffset 0.5s ease" }}
//                   />
//                 </svg>
//                 <div className="progress-text">
//                   <span className="percent-number">
//                     {Math.round(animatedPercent)}%
//                   </span>
//                   <span className="percent-label">사용률</span>
//                 </div>
//               </div>
//             </div>

//             <div className="budget-info">
//               <div className="budget-form-compact">
//                 <div className="month-selector">
//                   <input
//                     type="month"
//                     value={month}
//                     onChange={(e) => setMonth(e.target.value)}
//                     required
//                   />
//                 </div>
//                 <div className="budget-input-group">
//                   <input
//                     type="text"
//                     placeholder="예산 (₩)"
//                     value={Number(budget).toLocaleString()}
//                     onChange={(e) => {
//                       const raw = e.target.value.replace(/[^0-9]/g, "");
//                       setBudget(raw);
//                     }}
//                     required
//                   />
//                   <button
//                     type="submit"
//                     onClick={handleSubmit}
//                     style={{
//                       backgroundColor: userColor,
//                       border: `1px solid ${userColor}`,
//                       color: "white",
//                     }}
//                   >
//                     저장
//                   </button>
//                 </div>
//               </div>

//               <div className="budget-summary">
//                 <div className="summary-item">
//                   <span className="label">사용</span>
//                   <span className="amount spent">
//                     {spent.toLocaleString()}원
//                   </span>
//                 </div>
//                 <div className="summary-item">
//                   <span className="label">예산</span>
//                   <span className="amount budget">
//                     {Number(budget).toLocaleString()}원
//                   </span>
//                 </div>
//                 {percent < 100 && (
//                   <div className="summary-item">
//                     <span className="label">남은 금액</span>
//                     <span
//                       className="amount remaining"
//                       style={{ color: userColor }}
//                     >
//                       {Number(Number(budget) - spent).toLocaleString()}원
//                     </span>
//                   </div>
//                 )}
//               </div>

//               {percent > 100 && (
//                 <div className="budget-warning">⚠ 예산을 초과했습니다!</div>
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* 월별 지출 추이 차트 */}
//       <MonthlyChart userId={userId} groupId={groupId} userColor={userColor} />

//       {/* 카테고리별 지출 차트 */}
//       <CategoryChart
//         month={month}
//         userId={userId}
//         groupId={groupId}
//         userColor={userColor}
//         onCategoryClick={handleCategoryClick}
//       />

//       {/* 선택된 카테고리 정보 */}
//       {selectedCategory && (
//         <div className="selected-category-info">
//           <h4>선택된 카테고리: {selectedCategory}</h4>
//           <p>이 카테고리의 상세 정보를 보려면 "월별 보기" 탭에서 확인하세요.</p>
//         </div>
//       )}
//     </div>
//   );
// };

// export default BudgetSummary;
