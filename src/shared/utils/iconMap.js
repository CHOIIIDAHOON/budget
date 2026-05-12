import composeCoffee from "../../assets/icons/compose_coffee.png";
import tenPercent from "../../assets/icons/ten_percent.png";
import cu from "../../assets/icons/cu.png";
import daiso from "../../assets/icons/daiso.png";
import emart24 from "../../assets/icons/emart24.png";
import tenThousandLabCoffee from "../../assets/icons/10000lab_coffee.png";
import burgerKing from "../../assets/icons/burger_king.png";
import gs25 from "../../assets/icons/gs25.png";
import gongCha from "../../assets/icons/gong_cha.png";
import gopumgyukCoffeeFactory from "../../assets/icons/gopumgyuk_coffee_factory.png";
import mcdonalds from "../../assets/icons/mcdonalds.jpg";
import megaCoffee from "../../assets/icons/mega_coffee.png";
import oliveyoung from "../../assets/icons/oliveyoung.png";
import starbucks from "../../assets/icons/starbucks.png";
import theVenti from "../../assets/icons/the_venti.png";
import twosomePlace from "../../assets/icons/twosome_place.png";
import ediya from "../../assets/icons/ediya.png";

const brandMatchers = [
  { keywords: ["컴포즈", "compose"], imageSrc: composeCoffee, fallbackLabel: "컴포즈" },
  { keywords: ["텐퍼센트", "10percent", "10 percent"], imageSrc: tenPercent, fallbackLabel: "텐퍼센트" },
  { keywords: ["만랩", "10000lab", "10000 lab"], imageSrc: tenThousandLabCoffee, fallbackLabel: "만랩" },
  { keywords: ["버거킹", "burger king", "burgerking"], imageSrc: burgerKing, fallbackLabel: "버거킹" },
  { keywords: ["공차", "gong cha", "gongcha"], imageSrc: gongCha, fallbackLabel: "공차" },
  { keywords: ["고품격커피공장", "고품격 커피 공장"], imageSrc: gopumgyukCoffeeFactory, fallbackLabel: "고품격커피공장" },
  { keywords: ["맥도날드", "mcdonald"], imageSrc: mcdonalds, fallbackLabel: "맥도날드" },
  { keywords: ["메가커피", "mega coffee", "megacoffee"], imageSrc: megaCoffee, fallbackLabel: "메가커피" },
  { keywords: ["스타벅스", "starbucks"], imageSrc: starbucks, fallbackLabel: "스타벅스" },
  { keywords: ["더벤티", "the venti", "theventi"], imageSrc: theVenti, fallbackLabel: "더벤티" },
  { keywords: ["투썸", "twosome"], imageSrc: twosomePlace, fallbackLabel: "투썸" },
  { keywords: ["이디야", "ediya"], imageSrc: ediya, fallbackLabel: "이디야" },
  { keywords: ["CU", "씨유"], imageSrc: cu, fallbackLabel: "CU", wholeWordOnly: true },
  { keywords: ["GS25", "지에스25"], imageSrc: gs25, fallbackLabel: "GS25", wholeWordOnly: true },
  { keywords: ["이마트24", "emart24"], imageSrc: emart24, fallbackLabel: "이마트24", wholeWordOnly: true },
  { keywords: ["다이소", "daiso"], imageSrc: daiso, fallbackLabel: "다이소" },
  { keywords: ["올리브영", "olive young", "oliveyoung"], imageSrc: oliveyoung, fallbackLabel: "올리브영" },
  // 이미지 파일이 없는 브랜드는 imageSrc 없이 fallbackLabel만 넣어 확장 가능
  // 예: { keywords: ["브랜드명"], fallbackLabel: "브랜드명" }
];

const hasWholeWord = (source, keyword) => {
  const regex = new RegExp(`(^|[^A-Za-z0-9])${keyword}([^A-Za-z0-9]|$)`, "i");
  return regex.test(source);
};

export const getMatchedIconMeta = (memo = "") => {
  const escapedMemo = String(memo);
  const normalizedMemo = escapedMemo.toLowerCase();

  for (const matcher of brandMatchers) {
    for (const keyword of matcher.keywords) {
      const normalizedKeyword = keyword.toLowerCase();

      if (matcher.wholeWordOnly) {
        if (hasWholeWord(escapedMemo, keyword)) {
          return { imageSrc: matcher.imageSrc || null, fallbackLabel: matcher.fallbackLabel };
        }
        continue;
      }

      if (normalizedMemo.includes(normalizedKeyword)) {
        return { imageSrc: matcher.imageSrc || null, fallbackLabel: matcher.fallbackLabel };
      }
    }
  }

  return { imageSrc: null, fallbackLabel: null };
};

export const getMatchedIcon = (memo = "") => getMatchedIconMeta(memo).imageSrc;
