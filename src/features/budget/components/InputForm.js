// import React, { useState, useRef, useEffect } from "react";
// import { addTransaction, fetchMemoSuggestions } from "../../../api/budgetApi";
// import { Dialog, Button } from "@mui/material";
// import "./InputForm.css";
// import { darkenColor } from "../../../shared/utils/color";

// const InputForm = ({
//   categories,
//   userId,
//   groupId,
//   userColor = "#f4a8a8",
//   hoverColor = "#f19191",
// }) => {
//   const getToday = () => {
//     const now = new Date();
//     const kstOffsetMs = 9 * 60 * 60 * 1000; // KST = UTC+9
//     const kstDate = new Date(now.getTime() + kstOffsetMs);
//     return kstDate.toISOString().split("T")[0];
//   };

//   const [form, setForm] = useState({
//     category: "",
//     amount: "",
//     memo: "",
//     date: getToday(),
//   });

//   const [fixDate, setFixDate] = useState(false);
//   const [type, setType] = useState("expense");
//   const [showPopup, setShowPopup] = useState(false);
//   const [recentCategories, setRecentCategories] = useState([]); // 최근 사용 카테고리
//   const [memoSuggestions, setMemoSuggestions] = useState([]); // 메모 자동완성 제안
//   const [showMemoSuggestions, setShowMemoSuggestions] = useState(false); // 메모 제안 표시 여부
//   const [filteredMemoSuggestions, setFilteredMemoSuggestions] = useState([]); // 필터링된 메모 제안
//   const [showCategoryDropdown, setShowCategoryDropdown] = useState(false); // 카테고리 드롭다운 표시 여부
//   const amountInputRef = useRef(null);
//   const memoInputRef = useRef(null);
//   const categoryDropdownRef = useRef(null);

//   // 컴포넌트 마운트 시 메모 제안 가져오기
//   useEffect(() => {
//     const loadMemoSuggestions = async () => {
//       try {
//         const suggestions = await fetchMemoSuggestions(userId, groupId);
//         setMemoSuggestions(suggestions);
//       } catch (error) {
//         console.error("메모 제안 로드 실패:", error);
//       }
//     };

//     loadMemoSuggestions();
//   }, [userId, groupId]);

//   // 메모 입력 시 필터링 (2글자 이상일 때만)
//   useEffect(() => {
//     if (form.memo.trim().length < 2) {
//       setFilteredMemoSuggestions([]); // 2글자 미만이면 제안 표시 안함
//       setShowMemoSuggestions(false); // 2글자 미만이면 드롭다운 숨김
//     } else {
//       const filtered = memoSuggestions
//         .filter((suggestion) =>
//           suggestion.toLowerCase().includes(form.memo.toLowerCase())
//         )
//         .slice(0, 5);
//       setFilteredMemoSuggestions(filtered);
//       // 필터링된 결과가 있으면 드롭다운 표시
//       if (filtered.length > 0) {
//         setShowMemoSuggestions(true);
//       }
//     }
//   }, [form.memo, memoSuggestions]);

//   // 드롭다운 외부 클릭 시 닫기
//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (
//         categoryDropdownRef.current &&
//         !categoryDropdownRef.current.contains(event.target)
//       ) {
//         setShowCategoryDropdown(false);
//       }
//     };

//     document.addEventListener("mousedown", handleClickOutside);
//     return () => {
//       document.removeEventListener("mousedown", handleClickOutside);
//     };
//   }, []);

//   const formatWithComma = (value) => {
//     const num = value.replace(/,/g, "");
//     if (!num) return "";
//     return parseInt(num, 10).toLocaleString();
//   };

//   const unmask = (value) => value.replace(/,/g, "");

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     if (name === "amount") {
//       // 입력값에서 콤마와 숫자가 아닌 문자를 모두 제거
//       const raw = value.replace(/,/g, "").replace(/\D/g, "");
//       setForm({ ...form, [name]: raw });
//     } else if (name === "category") {
//       setForm({ ...form, [name]: value });
//       // 최근 카테고리 갱신
//       if (value) {
//         setRecentCategories((prev) => {
//           const filtered = prev.filter((c) => c !== value);
//           return [value, ...filtered].slice(0, 3);
//         });
//       }
//     } else if (name === "memo") {
//       setForm({ ...form, [name]: value });
//     } else {
//       setForm({ ...form, [name]: value });
//     }
//   };

//   const handleCategorySelect = (code) => {
//     console.log("카테고리 선택:", code);
//     setForm((prev) => ({ ...prev, category: code }));
//     setShowCategoryDropdown(false);
//     // 최근 카테고리 갱신
//     setRecentCategories((prev) => {
//       const filtered = prev.filter((c) => c !== code);
//       return [code, ...filtered].slice(0, 3);
//     });
//   };

//   const handleAmountPreset = (amount) => {
//     setForm((prev) => {
//       const prevAmount = Number(prev.amount.replace(/,/g, "")) || 0;
//       const newAmount = prevAmount + amount;
//       return { ...prev, amount: newAmount.toString() };
//     });
//     if (amountInputRef.current) {
//       amountInputRef.current.focus();
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     const rawAmount = parseInt(unmask(form.amount), 10);
//     const finalAmount = type === "expense" ? rawAmount * -1 : rawAmount;

//     // 디버깅을 위한 로그 추가
//     console.log("제출 데이터:", {
//       form,
//       finalAmount,
//       userId,
//       groupId,
//       categories: categories.map((c) => ({
//         code: c.code,
//         description: c.description,
//       })),
//     });

//     // 카테고리가 선택되지 않은 경우 체크
//     if (!form.category) {
//       alert("카테고리를 선택해주세요.");
//       return;
//     }

//     try {
//       const result = await addTransaction(
//         { ...form, amount: finalAmount },
//         userId,
//         groupId
//       );
//       if (result.status === "success") {
//         setShowPopup(true);
//         setForm({
//           category: "",
//           amount: "",
//           memo: "",
//           date: fixDate ? form.date : getToday(),
//         });
//         setType("expense");
//       } else {
//         alert("실패: " + (result.message || "알 수 없는 오류"));
//       }
//     } catch (err) {
//       console.error("에러 발생:", err);
//       alert("오류가 발생했습니다. 콘솔을 확인해주세요.");
//     }
//   };

//   // 최근 사용 카테고리 객체 정보
//   const recentCategoryObjs = recentCategories
//     .map((code) => categories.find((cat) => cat.code === code))
//     .filter(Boolean);

//   // 선택된 카테고리 정보
//   const selectedCategory = categories.find((cat) => cat.code === form.category);

//   // CSS 변수 설정
//   useEffect(() => {
//     document.documentElement.style.setProperty("--main-color", userColor);
//     document.documentElement.style.setProperty("--hover-color", hoverColor);
//     document.documentElement.style.setProperty(
//       "--active-color",
//       darkenColor(userColor, 32)
//     );
//   }, [userColor, hoverColor]);

//   return (
//     <div>
//       {/* 일반 입력 폼 */}
//       <form className="form-container" onSubmit={handleSubmit}>
//         <label>
//           대분류코드
//           <div className="custom-select-container" ref={categoryDropdownRef}>
//             <div
//               className={`custom-select ${showCategoryDropdown ? "open" : ""}`}
//               onClick={() => {
//                 setShowCategoryDropdown(!showCategoryDropdown);
//               }}
//             >
//               <div className="custom-select__selected">
//                 {selectedCategory ? (
//                   <span className="selected-text">
//                     {selectedCategory.description}
//                   </span>
//                 ) : (
//                   <span className="placeholder">-- 선택하세요 --</span>
//                 )}
//               </div>
//               <div className="custom-select__arrow">
//                 <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
//                   <path
//                     d="M1 1L6 6L11 1"
//                     stroke="currentColor"
//                     strokeWidth="2"
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                   />
//                 </svg>
//               </div>
//             </div>
//             {showCategoryDropdown && (
//               <div className="custom-select__dropdown">
//                 <div className="dropdown-options">
//                   {categories.map((cat) => (
//                     <div
//                       key={cat.code}
//                       className={`dropdown-option ${
//                         form.category === cat.code ? "selected" : ""
//                       }`}
//                       onClick={() => handleCategorySelect(cat.code)}
//                     >
//                       <span className="option-text">{cat.description}</span>
//                       {form.category === cat.code && (
//                         <svg
//                           className="check-icon"
//                           width="16"
//                           height="16"
//                           viewBox="0 0 16 16"
//                           fill="none"
//                         >
//                           <path
//                             d="M13.5 4.5L6 12L2.5 8.5"
//                             stroke="currentColor"
//                             strokeWidth="2"
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                           />
//                         </svg>
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </div>
//         </label>
//         <label>
//           금액
//           <div className="amount-row">
//             <input
//               name="amount"
//               type="text"
//               inputMode="numeric"
//               autoFocus
//               ref={amountInputRef}
//               value={formatWithComma(form.amount)}
//               onChange={handleChange}
//               required
//               autoComplete="off"
//             />
//             <div className="type-tabs">
//               {["expense", "income"].map((t) => (
//                 <button
//                   key={t}
//                   type="button"
//                   onClick={() => setType(t)}
//                   style={{
//                     padding: "10px 14px",
//                     fontSize: "14px",
//                     border: "1px solid",
//                     borderRadius: "6px",
//                     backgroundColor: type === t ? userColor : "#f0f0f0",
//                     color: type === t ? "white" : "#333",
//                     borderColor: type === t ? userColor : "#ccc",
//                     minWidth: "52px",
//                     cursor: "pointer",
//                     fontFamily: "'S-CoreDream-3Light'",
//                     transition: "0.2s",
//                   }}
//                 >
//                   {t === "expense" ? "지출" : "수입"}
//                 </button>
//               ))}
//             </div>
//           </div>
//         </label>
//         {/* 금액 프리셋 버튼 */}
//         <div className="amount-preset-buttons">
//           {[100, 1000, 10000, 100000].map((preset) => (
//             <button
//               key={preset}
//               type="button"
//               className="amount-preset-btn"
//               onClick={() => handleAmountPreset(preset)}
//             >
//               +
//               {preset === 100
//                 ? "1백"
//                 : preset === 1000
//                 ? "1천"
//                 : preset === 10000
//                 ? "1만"
//                 : "10만"}
//               원
//             </button>
//           ))}
//         </div>
//         <label>
//           세부설명
//           <div style={{ position: "relative" }}>
//             <input
//               name="memo"
//               value={form.memo}
//               onChange={handleChange}
//               ref={memoInputRef}
//               onFocus={() => setShowMemoSuggestions(true)}
//               onBlur={() => {
//                 setTimeout(() => setShowMemoSuggestions(false), 150);
//               }}
//               autoComplete="off"
//             />
//             {showMemoSuggestions && filteredMemoSuggestions.length > 0 && (
//               <div className="memo-suggestions">
//                 {filteredMemoSuggestions.map((suggestion, index) => (
//                   <div
//                     key={index}
//                     className="memo-suggestion-item"
//                     onMouseDown={(e) => {
//                       e.preventDefault();
//                       setForm((prev) => ({ ...prev, memo: suggestion }));
//                       setShowMemoSuggestions(false);
//                       if (memoInputRef.current) {
//                         memoInputRef.current.focus();
//                       }
//                     }}
//                   >
//                     {suggestion}
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         </label>
//         <div className="date-section">
//           <div className="date-header">
//             <span className="label-span">일자</span>
//             <label className="date-fix-wrapper">
//               <input
//                 type="checkbox"
//                 className="date-fix-checkbox"
//                 checked={fixDate}
//                 onChange={(e) => setFixDate(e.target.checked)}
//               />
//               <span className="label-small">날짜 고정</span>
//             </label>
//           </div>
//           <input
//             name="date"
//             type="date"
//             className="date-input"
//             value={form.date}
//             onChange={handleChange}
//             required
//           />
//         </div>
//         <button
//           type="submit"
//           style={{
//             background: `linear-gradient(135deg, ${userColor} 0%, ${hoverColor} 100%)`,
//           }}
//         >
//           추가하기
//         </button>
//       </form>
//       {showPopup && (
//         <div className="popup-overlay" onClick={() => setShowPopup(false)}>
//           <div className="popup-content" onClick={(e) => e.stopPropagation()}>
//             <h3>입력 완료!</h3>
//             <button
//               onClick={() => setShowPopup(false)}
//               style={{
//                 background: `linear-gradient(135deg, ${userColor} 0%, ${hoverColor} 100%)`,
//               }}
//             >
//               확인
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default InputForm;
