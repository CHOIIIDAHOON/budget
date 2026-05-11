import composeCoffee from "../../assets/icons/compose_coffee.png";
import cu from "../../assets/icons/cu.png";
import daiso from "../../assets/icons/daiso.png";
import emart24 from "../../assets/icons/emart24.png";
import gs25 from "../../assets/icons/gs25.png";
import mcdonalds from "../../assets/icons/mcdonalds.jpg";
import megaCoffee from "../../assets/icons/mega_coffee.png";
import oliveyoung from "../../assets/icons/oliveyoung.png";
import starbucks from "../../assets/icons/starbucks.png";
import theVenti from "../../assets/icons/the_venti.png";
import ediya from "../../assets/icons/ediya.png";

export const keywordIconMap = {
  컴포즈: composeCoffee,
  맥도날드: mcdonalds,
  메가커피: megaCoffee,
  스타벅스: starbucks,
  더벤티: theVenti,
  이디야: ediya,
  CU: cu,
  씨유: cu,
  GS25: gs25,
  지에스25: gs25,
  이마트24: emart24,
  emart24: emart24,
  다이소: daiso,
  올리브영: oliveyoung,
  // 필요 시 추가
};

export const getMatchedIcon = (memo = "") => {
  const escapedMemo = String(memo);

  const englishWordKeywords = ["CU", "GS25", "emart24"];
  for (const keyword of englishWordKeywords) {
    const regex = new RegExp(`(^|[^A-Za-z0-9])${keyword}([^A-Za-z0-9]|$)`, "i");
    if (regex.test(escapedMemo)) {
      return keywordIconMap[keyword];
    }
  }

  for (const keyword in keywordIconMap) {
    if (englishWordKeywords.includes(keyword)) {
      continue;
    }
    if (memo.includes(keyword)) {
      return keywordIconMap[keyword];
    }
  }
  return null;
};
