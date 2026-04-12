export const communityLibrary = [
  {
    id: "silhouette-study",
    author: { ko: "Mina Lee", en: "Mina Lee" },
    title: { ko: "실루엣 스터디", en: "Silhouette study" },
    body: {
      ko: "짧은 상의, 긴 하의, 얇은 외투의 밸런스를 단계적으로 비교하는 reference set.",
      en: "A reference set comparing short tops, long bottoms, and light outerwear in controlled ratios.",
    },
    image: "/style-grid-1.jpg",
    tags: ["ratio", "tone", "outerwear"],
    action: { ko: "룩 보기", en: "View look" },
    stats: { saves: 312, comments: 21 },
  },
  {
    id: "quiet-tailoring",
    author: { ko: "Ari Park", en: "Ari Park" },
    title: { ko: "조용한 테일러링", en: "Quiet tailoring" },
    body: {
      ko: "회색/오프화이트 팔레트 안에서 재킷과 팬츠 구조를 정리하는 board.",
      en: "A board for structuring jacket and trouser combinations inside a restrained grey palette.",
    },
    image: "/style-grid-2.jpg",
    tags: ["tailored", "grey", "layering"],
    action: { ko: "보드 열기", en: "Open board" },
    stats: { saves: 478, comments: 33 },
  },
  {
    id: "soft-uniform",
    author: { ko: "Yuna Han", en: "Yuna Han" },
    title: { ko: "소프트 유니폼", en: "Soft uniform" },
    body: {
      ko: "매일 입는 베이스 아이템을 과하게 늘리지 않고 재조합하는 wardrobe prompt.",
      en: "A wardrobe prompt for recombining everyday base items without expanding the closet aggressively.",
    },
    image: "/flatlay-detail.jpg",
    tags: ["uniform", "closet", "rebuild"],
    action: { ko: "리믹스 보기", en: "View remix" },
    stats: { saves: 254, comments: 12 },
  },
] as const;
