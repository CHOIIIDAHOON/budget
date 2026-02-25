export const COLOR_THEMES = {
  group: {
    main: "#ffd966",
    hover: "#ffc933",
  },
  보경: {
    main: "#f4a8a8",
    hover: "#f19191",
  },
  default: {
    main: "#91bdf1",
    hover: "#619ee8",
  },
};

export function getThemeColors(activeUser, activeGroup) {
  if (activeGroup) return COLOR_THEMES.group;
  if (activeUser?.username === "보경") return COLOR_THEMES["보경"];
  return COLOR_THEMES.default;
}
