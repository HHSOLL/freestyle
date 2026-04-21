import type { GarmentInstantFitReport } from "@freestyle/contracts";
import type { AvatarPoseId, BodyFrame, GarmentCategory } from "@freestyle/shared-types";

export const CM_PER_INCH = 2.54;
export const DEFAULT_BG = "#c8ccd2";

export const TAB_META = {
  마네킹: { title: "Mannequin", short: "👤", rail: "Base Bodies" },
  포즈: { title: "Pose", short: "✦", rail: "Pose Presets" },
  헤어: { title: "Hair", short: "✂", rail: "Hair Styles" },
  상의: { title: "Outfits", short: "👕", rail: "Starter Outfits" },
  외투: { title: "Outerwear", short: "🧥", rail: "Outerwear" },
  하의: { title: "Bottoms", short: "👖", rail: "Bottoms" },
  신발: { title: "Shoes", short: "👟", rail: "Shoes" },
  액세서리: { title: "Accessories", short: "🕶️", rail: "Accessories" },
} as const;

export const SUBCATEGORY_META = {
  마네킹: ["전체", "여성", "남성", "추천"],
  포즈: ["전체", "기본", "캐주얼", "피팅"],
  헤어: ["전체", "제거", "숏", "보브", "포니", "롱"],
  상의: ["전체", "제거", "탱크", "티셔츠", "니트"],
  외투: ["전체", "제거", "재킷", "블레이저", "코트"],
  하의: ["전체", "제거", "팬츠", "와이드", "쇼츠"],
  신발: ["전체", "제거", "플랫", "스니커즈", "부츠"],
  액세서리: ["전체", "제거", "모자", "아이웨어"],
} as const;

export const GENDER_BASE_MEASUREMENTS_CM = {
  male: {
    height: 178,
    headCircumference: 57,
    shoulderWidth: 46,
    chest: 100,
    waist: 80,
    hip: 99,
    legLength: 85,
    armLength: 63,
    torsoLength: 64,
    thigh: 58,
    calf: 38,
  },
  female: {
    height: 166,
    headCircumference: 55,
    shoulderWidth: 40,
    chest: 88,
    waist: 70,
    hip: 96,
    legLength: 79,
    armLength: 58,
    torsoLength: 60,
    thigh: 54,
    calf: 35,
  },
} as const;

export const BODY_FRAME_META: Record<BodyFrame, { label: string; subtitle: string }> = {
  balanced: { label: "균형형", subtitle: "기본 비율" },
  athletic: { label: "애슬레틱", subtitle: "어깨/근육 강조" },
  soft: { label: "소프트", subtitle: "부드러운 볼륨" },
  curvy: { label: "커비", subtitle: "가슴/힙 대비" },
};

export const MEASUREMENT_PRESETS = {
  male: [
    {
      key: "male_standard",
      label: "남성 기본",
      bodyFrame: "balanced" as const,
      measurements: {
        height: 178,
        headCircumference: 57,
        shoulderWidth: 46,
        chest: 100,
        waist: 80,
        hip: 99,
        legLength: 85,
        armLength: 63,
        torsoLength: 64,
        thigh: 58,
        calf: 38,
      },
    },
    {
      key: "male_slim",
      label: "남성 슬림",
      bodyFrame: "balanced" as const,
      measurements: {
        height: 181,
        headCircumference: 56,
        shoulderWidth: 43.5,
        chest: 94,
        waist: 73,
        hip: 96,
        legLength: 88,
        armLength: 64,
        torsoLength: 63,
        thigh: 54,
        calf: 35,
      },
    },
    {
      key: "male_broad",
      label: "남성 와이드",
      bodyFrame: "athletic" as const,
      measurements: {
        height: 180,
        headCircumference: 58,
        shoulderWidth: 51,
        chest: 109,
        waist: 88,
        hip: 103,
        legLength: 85,
        armLength: 64,
        torsoLength: 64,
        thigh: 62,
        calf: 40,
      },
    },
  ],
  female: [
    {
      key: "female_standard",
      label: "여성 기본",
      bodyFrame: "balanced" as const,
      measurements: {
        height: 166,
        headCircumference: 55,
        shoulderWidth: 40,
        chest: 88,
        waist: 70,
        hip: 96,
        legLength: 79,
        armLength: 58,
        torsoLength: 60,
        thigh: 54,
        calf: 35,
      },
    },
    {
      key: "female_slim",
      label: "여성 슬림",
      bodyFrame: "athletic" as const,
      measurements: {
        height: 168,
        headCircumference: 54,
        shoulderWidth: 38.5,
        chest: 84,
        waist: 66,
        hip: 92,
        legLength: 81,
        armLength: 59,
        torsoLength: 59,
        thigh: 51,
        calf: 33,
      },
    },
    {
      key: "female_tall",
      label: "여성 장신",
      bodyFrame: "curvy" as const,
      measurements: {
        height: 173,
        headCircumference: 56,
        shoulderWidth: 41.5,
        chest: 96,
        waist: 72,
        hip: 103,
        legLength: 84,
        armLength: 60,
        torsoLength: 63,
        thigh: 59,
        calf: 37,
      },
    },
  ],
} as const;

export const MANNEQUIN_PRESETS = [
  {
    id: "female_standard",
    category: "마네킹",
    name: "여성 기본",
    subtitle: "로컬 피팅 바디",
    gender: "female",
    bodyFrame: MEASUREMENT_PRESETS.female[0].bodyFrame,
    measurements: MEASUREMENT_PRESETS.female[0].measurements,
  },
  {
    id: "female_slim",
    category: "마네킹",
    name: "여성 슬림",
    subtitle: "로컬 피팅 바디",
    gender: "female",
    bodyFrame: MEASUREMENT_PRESETS.female[1].bodyFrame,
    measurements: MEASUREMENT_PRESETS.female[1].measurements,
  },
  {
    id: "female_tall",
    category: "마네킹",
    name: "여성 장신",
    subtitle: "로컬 피팅 바디",
    gender: "female",
    bodyFrame: MEASUREMENT_PRESETS.female[2].bodyFrame,
    measurements: MEASUREMENT_PRESETS.female[2].measurements,
  },
  {
    id: "male_standard",
    category: "마네킹",
    name: "남성 기본",
    subtitle: "로컬 피팅 바디",
    gender: "male",
    bodyFrame: MEASUREMENT_PRESETS.male[0].bodyFrame,
    measurements: MEASUREMENT_PRESETS.male[0].measurements,
  },
  {
    id: "male_slim",
    category: "마네킹",
    name: "남성 슬림",
    subtitle: "로컬 피팅 바디",
    gender: "male",
    bodyFrame: MEASUREMENT_PRESETS.male[1].bodyFrame,
    measurements: MEASUREMENT_PRESETS.male[1].measurements,
  },
  {
    id: "male_broad",
    category: "마네킹",
    name: "남성 와이드",
    subtitle: "로컬 피팅 바디",
    gender: "male",
    bodyFrame: MEASUREMENT_PRESETS.male[2].bodyFrame,
    measurements: MEASUREMENT_PRESETS.male[2].measurements,
  },
] as const;

export const POSE_TEMPLATES = [
  { id: "apose", category: "포즈", name: "A-포즈", subtitle: "기본 의상 확인용" },
  { id: "tpose", category: "포즈", name: "T-포즈", subtitle: "실루엣 점검용" },
  { id: "relaxed", category: "포즈", name: "릴랙스", subtitle: "정면 캐주얼" },
  { id: "contrapposto", category: "포즈", name: "콘트라포스토", subtitle: "체중 이동 포즈" },
  { id: "walk", category: "포즈", name: "워크", subtitle: "보행 시작 포즈" },
  { id: "handsonhips", category: "포즈", name: "핸즈온힙", subtitle: "핏 강조 포즈" },
] as const;

export const FIELD_DEFS = [
  { key: "height", label: "키", unit: "cm", unitInch: "in", min: 140, max: 220, step: 0.5 },
  { key: "headCircumference", label: "머리둘레", unit: "cm", unitInch: "in", min: 48, max: 68, step: 0.1 },
  { key: "shoulderWidth", label: "어깨너비", unit: "cm", unitInch: "in", min: 34, max: 64, step: 0.1 },
  { key: "chest", label: "가슴둘레", unit: "cm", unitInch: "in", min: 74, max: 132, step: 0.1 },
  { key: "waist", label: "허리둘레", unit: "cm", unitInch: "in", min: 54, max: 130, step: 0.1 },
  { key: "hip", label: "힙둘레", unit: "cm", unitInch: "in", min: 78, max: 136, step: 0.1 },
  { key: "legLength", label: "다리길이", unit: "cm", unitInch: "in", min: 65, max: 110, step: 0.1 },
  { key: "armLength", label: "팔길이", unit: "cm", unitInch: "in", min: 48, max: 84, step: 0.1 },
  { key: "torsoLength", label: "상체길이", unit: "cm", unitInch: "in", min: 50, max: 78, step: 0.1 },
  { key: "thigh", label: "허벅지", unit: "cm", unitInch: "in", min: 42, max: 76, step: 0.1 },
  { key: "calf", label: "종아리", unit: "cm", unitInch: "in", min: 28, max: 52, step: 0.1 },
] as const;

export const CATEGORY_BY_TAB = {
  헤어: "hair",
  상의: "tops",
  외투: "outerwear",
  하의: "bottoms",
  신발: "shoes",
  액세서리: "accessories",
} as const satisfies Record<string, GarmentCategory>;

export const PRODUCT_POSE_FROM_V18: Record<string, AvatarPoseId> = {
  apose: "neutral",
  tpose: "neutral",
  relaxed: "relaxed",
  contrapposto: "contrapposto",
  walk: "stride",
  handsonhips: "tailored",
};

export const V18_POSE_FROM_PRODUCT: Record<AvatarPoseId, string> = {
  neutral: "apose",
  relaxed: "relaxed",
  contrapposto: "contrapposto",
  stride: "walk",
  tailored: "handsonhips",
};

export type GenderValue = "female" | "male";
export type TabValue = keyof typeof TAB_META;
export type MeasurementState = {
  height: number;
  headCircumference: number;
  shoulderWidth: number;
  chest: number;
  waist: number;
  hip: number;
  legLength: number;
  armLength: number;
  torsoLength: number;
  thigh: number;
  calf: number;
};

export type DisplayItem = {
  id: string;
  category: string;
  name: string;
  subtitle: string;
  thumbUrl?: string;
  gender?: GenderValue;
  bodyFrame?: BodyFrame;
  measurements?: MeasurementState;
  filterTags?: string[];
  fitReport?: GarmentInstantFitReport | null;
};

export type ItemSetKey = "hair" | "top" | "outerwear" | "bottom" | "shoes" | "accessory";

export const ITEM_SET_KEY_BY_TAB = {
  헤어: "hair",
  상의: "top",
  외투: "outerwear",
  하의: "bottom",
  신발: "shoes",
  액세서리: "accessory",
} as const satisfies Partial<Record<TabValue, ItemSetKey>>;
