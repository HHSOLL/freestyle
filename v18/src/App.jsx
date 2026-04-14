import { useEffect, useMemo, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import MannequinScene from './scene/MannequinScene'
import {
  BOTTOM_ITEMS,
  FIELD_DEFS,
  GENDER_BASE_MEASUREMENTS_CM,
  INITIAL_SELECTION,
  MANNEQUIN_PRESETS,
  MEASUREMENT_PRESETS,
  OUTERWEAR_ITEMS,
  POSE_TEMPLATES,
  SHOE_ITEMS,
  TOP_ITEMS,
} from './data'

const CM_PER_INCH = 2.54
const DEFAULT_BG = '#d8dbdf'

const TAB_META = {
  '마네킹': { title: 'Mannequin', short: '👤', rail: 'Base Bodies' },
  '포즈': { title: 'Pose', short: '✦', rail: 'Pose Presets' },
  '상의': { title: 'Tops', short: '👕', rail: 'Tops' },
  '외투': { title: 'Outerwear', short: '🧥', rail: 'Outerwear' },
  '하의': { title: 'Bottoms', short: '👖', rail: 'Bottoms' },
  '신발': { title: 'Shoes', short: '👟', rail: 'Shoes' },
}

const SUBCATEGORY_META = {
  '마네킹': ['전체', '여성', '남성', '추천'],
  '포즈': ['전체', '기본', '캐주얼', '피팅'],
  '상의': ['전체', '제거', '티셔츠', '셔츠'],
  '외투': ['전체', '제거', '재킷', '블레이저', '코트'],
  '하의': ['전체', '제거', '팬츠', '쇼츠'],
  '신발': ['전체', '제거', '스니커즈', '부츠', '러너'],
}

const LOCAL_URLS = [
  '/assets/models/empty.glb',
  '/assets/models/mannequin.glb',
  '/assets/models/top_shirt.glb',
  '/assets/models/top_tee.glb',
  '/assets/models/outer_bomber.glb',
  '/assets/models/outer_blazer.glb',
  '/assets/models/outer_coat.glb',
  '/assets/models/bottom_cargo.glb',
  '/assets/models/bottom_denim.glb',
  '/assets/models/bottom_shorts.glb',
  '/assets/models/shoes_sneaker.glb',
  '/assets/models/shoes_boot.glb',
  '/assets/models/shoes_runner.glb',
]

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

function toDisplay(cm, unit) {
  return unit === 'inch' ? cm / CM_PER_INCH : cm
}

function fromDisplay(value, unit) {
  return unit === 'inch' ? value * CM_PER_INCH : value
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '').trim()
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return { r: 216, g: 219, b: 223 }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function rgbToHex({ r, g, b }) {
  const toHex = (value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function rgba({ r, g, b }, alpha) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`
}

function mixRgb(a, b, ratio) {
  return {
    r: a.r + (b.r - a.r) * ratio,
    g: a.g + (b.g - a.g) * ratio,
    b: a.b + (b.b - a.b) * ratio,
  }
}

function luminance({ r, g, b }) {
  const transform = (channel) => {
    const normalized = channel / 255
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  }
  const [R, G, B] = [transform(r), transform(g), transform(b)]
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

function rgbToHsl({ r, g, b }) {
  const nr = r / 255
  const ng = g / 255
  const nb = b / 255
  const max = Math.max(nr, ng, nb)
  const min = Math.min(nr, ng, nb)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l }
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  switch (max) {
    case nr:
      h = (ng - nb) / d + (ng < nb ? 6 : 0)
      break
    case ng:
      h = (nb - nr) / d + 2
      break
    default:
      h = (nr - ng) / d + 4
      break
  }
  h /= 6
  return { h, s, l }
}

function hue2rgb(p, q, t) {
  let x = t
  if (x < 0) x += 1
  if (x > 1) x -= 1
  if (x < 1 / 6) return p + (q - p) * 6 * x
  if (x < 1 / 2) return q
  if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
  return p
}

function hslToRgb({ h, s, l }) {
  if (s === 0) {
    const value = l * 255
    return { r: value, g: value, b: value }
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return {
    r: hue2rgb(p, q, h + 1 / 3) * 255,
    g: hue2rgb(p, q, h) * 255,
    b: hue2rgb(p, q, h - 1 / 3) * 255,
  }
}

function normalizeHex(raw) {
  const sanitized = raw.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
  if (sanitized.length !== 6) return null
  return `#${sanitized.toLowerCase()}`
}

function buildTheme(hex) {
  const base = hexToRgb(hex)
  const white = { r: 255, g: 255, b: 255 }
  const black = { r: 12, g: 16, b: 22 }
  const isLight = luminance(base) > 0.46
  const baseHsl = rgbToHsl(base)

  const accent = hslToRgb({
    h: (baseHsl.h + (isLight ? 0.06 : 0.04)) % 1,
    s: clamp(Math.max(baseHsl.s, 0.14) + 0.12, 0.2, 0.72),
    l: isLight ? 0.42 : 0.7,
  })

  const start = isLight ? mixRgb(base, white, 0.1) : mixRgb(base, black, 0.42)
  const end = isLight ? mixRgb(base, black, 0.12) : mixRgb(base, black, 0.56)
  const panelLight = isLight ? mixRgb(base, white, 0.52) : mixRgb(base, white, 0.1)
  const panelDark = isLight ? mixRgb(base, black, 0.18) : mixRgb(base, black, 0.34)
  const textPrimary = isLight ? mixRgb(base, black, 0.96) : mixRgb(base, white, 0.98)
  const textSecondary = isLight ? mixRgb(base, black, 0.84) : mixRgb(base, white, 0.92)
  const textMuted = isLight ? mixRgb(base, black, 0.62) : mixRgb(base, white, 0.68)
  const accentBg = isLight ? mixRgb(accent, white, 0.74) : mixRgb(accent, black, 0.4)
  const accentStroke = isLight ? mixRgb(accent, black, 0.26) : mixRgb(accent, white, 0.28)
  const accentText = isLight ? mixRgb(accent, black, 0.56) : mixRgb(accent, white, 0.94)

  return {
    cssVars: {
      '--app-bg-start': rgbToHex(start),
      '--app-bg-end': rgbToHex(end),
      '--text-primary': rgbToHex(textPrimary),
      '--text-secondary': rgbToHex(textSecondary),
      '--text-muted': rgbToHex(textMuted),
      '--button-bg': isLight ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.10)',
      '--button-hover': isLight ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.16)',
      '--button-border': rgba(panelDark, isLight ? 0.14 : 0.26),
      '--input-bg': isLight ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.09)',
      '--input-border': rgba(panelDark, isLight ? 0.14 : 0.22),
      '--panel-glass-outer': rgba(panelLight, isLight ? 0.18 : 0.1),
      '--panel-glass-inner': rgba(panelLight, isLight ? 0.08 : 0.04),
      '--panel-highlight': rgba(white, isLight ? 0.18 : 0.12),
      '--panel-shadow': isLight ? 'rgba(12,18,24,0.16)' : 'rgba(0,0,0,0.26)',
      '--panel-divider': rgba(white, isLight ? 0.32 : 0.16),
      '--accent-bg': rgba(accentBg, isLight ? 0.58 : 0.42),
      '--accent-border': rgba(accentStroke, isLight ? 0.62 : 0.56),
      '--accent-text': rgbToHex(accentText),
      '--accent-solid': rgbToHex(accentStroke),
      '--accent-glow': rgba(accent, isLight ? 0.22 : 0.28),
      '--scene-halo': rgba(accent, isLight ? 0.1 : 0.18),
      '--modal-backdrop': isLight ? 'rgba(10,14,20,0.24)' : 'rgba(0,0,0,0.62)',
      '--thumb-bg': isLight ? 'rgba(232, 237, 244, 0.82)' : 'rgba(200, 210, 224, 0.14)',
    },
    scene: {
      background: rgbToHex(isLight ? mixRgb(base, white, 0.14) : mixRgb(base, black, 0.24)),
      fog: rgbToHex(isLight ? mixRgb(base, white, 0.17) : mixRgb(base, black, 0.22)),
      wall: rgbToHex(isLight ? mixRgb(base, white, 0.24) : mixRgb(base, white, 0.08)),
      floor: rgbToHex(isLight ? mixRgb(base, white, 0.38) : mixRgb(base, white, 0.13)),
      floorEdge: rgbToHex(isLight ? mixRgb(accent, white, 0.8) : mixRgb(accent, white, 0.12)),
      ring: rgbToHex(isLight ? mixRgb(accent, white, 0.87) : mixRgb(accent, black, 0.24)),
      keyLight: '#ffffff',
      fillLight: rgbToHex(isLight ? mixRgb(accent, white, 0.74) : mixRgb(accent, white, 0.18)),
      rimLight: rgbToHex(isLight ? mixRgb(accent, white, 0.58) : mixRgb(accent, white, 0.22)),
      glow: rgbToHex(isLight ? mixRgb(accent, white, 0.64) : mixRgb(accent, black, 0.1)),
    },
  }
}

function itemThumbClass(itemId) {
  return itemId.replace(/[^a-z0-9_]/gi, '_')
}

function TopControls({ onResetAll, onSave, saveText }) {
  return (
    <div className="top-controls">
      <button type="button" className="top-button compact">나가기</button>
      <div className="top-actions">
        <button type="button" className="top-button compact" onClick={onResetAll}>리셋</button>
        <button type="button" className="top-button compact primary" onClick={onSave}>{saveText}</button>
      </div>
    </div>
  )
}

function LeftPanel({ backgroundColor, setBackgroundColor, selectedSummary, onOpenCustomize }) {
  const handleHexChange = (event) => {
    const normalized = normalizeHex(event.target.value)
    if (normalized) setBackgroundColor(normalized)
  }

  return (
    <section className="overlay-panel left-panel glass-panel">
      <div className="panel-title-stack left-title">
        <div className="eyebrow">CREATE A ZOI</div>
        <h1>스타일 편집</h1>
      </div>

      <div className="left-section subtle-surface">
        <div className="section-title-row">
          <strong>배경 테마</strong>
          <span>대비 자동 적용</span>
        </div>
        <div className="theme-grid">
          <label className="theme-field">
            <span>직접 선택</span>
            <input type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} />
          </label>
          <label className="theme-field">
            <span>HEX</span>
            <input value={backgroundColor.toUpperCase()} onChange={handleHexChange} maxLength={7} />
          </label>
        </div>
      </div>

      <button type="button" className="hero-button" onClick={onOpenCustomize}>마네킹 커스텀</button>

      <div className="left-bottom-spacer" />

      <div className="status-panel subtle-surface">
        <span className="mini-label">현재 상태</span>
        <strong>{selectedSummary.title}</strong>
        <small>{selectedSummary.detail}</small>
      </div>
    </section>
  )
}

function MeasurementModal({
  open,
  onClose,
  unit,
  setUnit,
  gender,
  setGender,
  measurements,
  setMeasurements,
  selectedPoseId,
  setSelectedPoseId,
}) {
  if (!open) return null

  const applyPreset = (preset) => {
    setMeasurements({ ...preset.measurements })
  }

  return (
    <div className="modal-root">
      <div className="modal-panel">
        <div className="modal-header">
          <div>
            <div className="modal-eyebrow">CUSTOM MANNEQUIN</div>
            <h2>마네킹 커스텀</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>닫기</button>
        </div>

        <div className="modal-toolbar split">
          <div className="segmented-switch">
            <button type="button" className={gender === 'female' ? 'active' : ''} onClick={() => { setGender('female'); setMeasurements({ ...GENDER_BASE_MEASUREMENTS_CM.female }) }}>여성</button>
            <button type="button" className={gender === 'male' ? 'active' : ''} onClick={() => { setGender('male'); setMeasurements({ ...GENDER_BASE_MEASUREMENTS_CM.male }) }}>남성</button>
          </div>
          <div className="unit-switch">
            <button type="button" className={unit === 'cm' ? 'active' : ''} onClick={() => setUnit('cm')}>CM</button>
            <button type="button" className={unit === 'inch' ? 'active' : ''} onClick={() => setUnit('inch')}>INCH</button>
          </div>
        </div>

        <div className="preset-grid">
          {MEASUREMENT_PRESETS[gender].map((preset) => (
            <button key={preset.key} type="button" className="preset-card" onClick={() => applyPreset(preset)}>
              <strong>{preset.label}</strong>
              <span>키 {preset.measurements.height} · 어깨 {preset.measurements.shoulderWidth} · 허리 {preset.measurements.waist}</span>
            </button>
          ))}
        </div>

        <div className="modal-toolbar">
          <div className="pose-strip">
            {POSE_TEMPLATES.map((pose) => (
              <button key={pose.id} type="button" className={`ghost-pill ${selectedPoseId === pose.id ? 'active' : ''}`} onClick={() => setSelectedPoseId(pose.id)}>
                {pose.name}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-field-list">
          {FIELD_DEFS.map((field) => {
            const displayValue = Number(toDisplay(measurements[field.key], unit).toFixed(unit === 'cm' ? 1 : 2))
            return (
              <div key={field.key} className="field-card">
                <div className="field-head">
                  <span>{field.label}</span>
                  <span className="field-range">{field.min}–{field.max} {unit === 'cm' ? field.unit : field.unitInch}</span>
                </div>
                <div className="field-input-row">
                  <input
                    type="number"
                    min={unit === 'cm' ? field.min : field.min / CM_PER_INCH}
                    max={unit === 'cm' ? field.max : field.max / CM_PER_INCH}
                    step={field.step}
                    value={displayValue}
                    onChange={(event) => {
                      const raw = Number(event.target.value)
                      if (Number.isNaN(raw)) return
                      setMeasurements((prev) => ({
                        ...prev,
                        [field.key]: clamp(fromDisplay(raw, unit), field.min, field.max),
                      }))
                    }}
                  />
                  <span className="field-unit">{unit === 'cm' ? field.unit : field.unitInch}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function filterItemsBySubcategory(items, activeTab, subCategory) {
  if (subCategory === '전체') return items
  if (activeTab === '마네킹') {
    if (subCategory === '여성') return items.filter((item) => item.gender === 'female')
    if (subCategory === '남성') return items.filter((item) => item.gender === 'male')
    if (subCategory === '추천') return items.slice(0, 3)
    return items
  }
  if (activeTab === '포즈') {
    if (subCategory === '기본') return items.filter((item) => ['apose', 'tpose'].includes(item.id))
    if (subCategory === '캐주얼') return items.filter((item) => ['relaxed', 'walk'].includes(item.id))
    if (subCategory === '피팅') return items.filter((item) => ['contrapposto', 'handsonhips'].includes(item.id))
    return items
  }
  if (subCategory === '제거') return items.filter((item) => item.modelUrl?.includes('empty'))
  if (activeTab === '상의') {
    if (subCategory === '티셔츠') return items.filter((item) => /tee|제거/.test(item.id))
    if (subCategory === '셔츠') return items.filter((item) => /shirt|제거/.test(item.id))
  }
  if (activeTab === '외투') {
    if (subCategory === '재킷') return items.filter((item) => /bomber|제거/.test(item.id))
    if (subCategory === '블레이저') return items.filter((item) => /blazer|제거/.test(item.id))
    if (subCategory === '코트') return items.filter((item) => /coat|제거/.test(item.id))
  }
  if (activeTab === '하의') {
    if (subCategory === '팬츠') return items.filter((item) => /cargo|denim|제거/.test(item.id))
    if (subCategory === '쇼츠') return items.filter((item) => /shorts|제거/.test(item.id))
  }
  if (activeTab === '신발') {
    if (subCategory === '스니커즈') return items.filter((item) => /sneaker|제거/.test(item.id))
    if (subCategory === '부츠') return items.filter((item) => /boot|제거/.test(item.id))
    if (subCategory === '러너') return items.filter((item) => /runner|제거/.test(item.id))
  }
  return items
}

function AssetPanel({
  activeTab,
  setActiveTab,
  mannequinCards,
  poseCards,
  itemSets,
  selection,
  selectedPoseId,
  setSelectedPoseId,
  selectedPreviewMannequinId,
  setSelectedPreviewMannequinId,
  setSelectedIds,
  onApplyMannequinPreset,
}) {
  const [subCategory, setSubCategory] = useState('전체')

  useEffect(() => {
    setSubCategory(SUBCATEGORY_META[activeTab]?.[0] || '전체')
  }, [activeTab])

  const tabItems = useMemo(() => {
    switch (activeTab) {
      case '마네킹': return mannequinCards
      case '포즈': return poseCards
      case '상의': return itemSets.top
      case '외투': return itemSets.outerwear
      case '하의': return itemSets.bottom
      case '신발': return itemSets.shoes
      default: return itemSets.top
    }
  }, [activeTab, mannequinCards, poseCards, itemSets])

  const visibleItems = useMemo(
    () => filterItemsBySubcategory(tabItems, activeTab, subCategory),
    [tabItems, activeTab, subCategory],
  )

  const onPick = (item) => {
    switch (activeTab) {
      case '마네킹':
        setSelectedPreviewMannequinId(item.id)
        onApplyMannequinPreset(item)
        break
      case '포즈':
        setSelectedPoseId(item.id)
        break
      case '상의':
        setSelectedIds((prev) => ({ ...prev, top: item.id }))
        break
      case '외투':
        setSelectedIds((prev) => ({ ...prev, outerwear: item.id }))
        break
      case '하의':
        setSelectedIds((prev) => ({ ...prev, bottom: item.id }))
        break
      case '신발':
        setSelectedIds((prev) => ({ ...prev, shoes: item.id }))
        break
      default:
        break
    }
  }

  const isSelected = (item) => {
    if (activeTab === '마네킹') return selectedPreviewMannequinId === item.id
    if (activeTab === '포즈') return selectedPoseId === item.id
    if (activeTab === '상의') return selection.top.id === item.id
    if (activeTab === '외투') return selection.outerwear.id === item.id
    if (activeTab === '하의') return selection.bottom.id === item.id
    if (activeTab === '신발') return selection.shoes.id === item.id
    return false
  }

  const handleRemoveAll = () => {
    if (activeTab === '포즈') {
      setSelectedPoseId('apose')
      return
    }
    if (activeTab === '상의') setSelectedIds((prev) => ({ ...prev, top: 'top_none' }))
    if (activeTab === '외투') setSelectedIds((prev) => ({ ...prev, outerwear: 'outer_none' }))
    if (activeTab === '하의') setSelectedIds((prev) => ({ ...prev, bottom: 'bottom_none' }))
    if (activeTab === '신발') setSelectedIds((prev) => ({ ...prev, shoes: 'shoes_none' }))
  }

  return (
    <section className="overlay-panel right-panel glass-panel">
      <div className="outfit-topline">Outfit</div>
      <div className="outfit-title">{TAB_META[activeTab].title}</div>

      <div className="reference-browser">
        <div className="vertical-rail">
          {Object.keys(TAB_META).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`rail-row ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              <span className="rail-icon">{TAB_META[tab].short}</span>
              <span className="rail-label">{tab}</span>
            </button>
          ))}
        </div>

        <div className="subcategory-column">
          <div className="subcategory-title">{TAB_META[activeTab].rail}</div>
          {(SUBCATEGORY_META[activeTab] || ['전체']).map((label) => (
            <button key={label} type="button" className={`subcategory-pill ${subCategory === label ? 'active' : ''}`} onClick={() => setSubCategory(label)}>{label}</button>
          ))}
        </div>

        <div className="asset-column">
          <div className="asset-toolbar">
            <button type="button" className="toolbar-text" onClick={handleRemoveAll}>
              {activeTab === '마네킹' ? 'Preset' : 'Remove All'}
            </button>
            <div className="toolbar-icons">
              <span className="toolbar-dot" />
              <span className="toolbar-dot alt" />
              <span className="toolbar-filter">⌕</span>
            </div>
          </div>

          <div className="asset-grid fixed-grid">
            {visibleItems.map((item) => (
              <button key={item.id} type="button" className={`asset-tile ${isSelected(item) ? 'selected' : ''}`} onClick={() => onPick(item)}>
                <div className="asset-orb-wrap">
                  <div
                    className={`asset-orb ${itemThumbClass(item.id)}`}
                    style={item.thumbUrl ? { backgroundImage: `url(${item.thumbUrl})` } : undefined}
                  />
                </div>
                <div className="asset-copy reference-copy">
                  <strong>{item.name}</strong>
                  <small>{item.subtitle}</small>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function App() {
  const [unit, setUnit] = useState('cm')
  const [gender, setGender] = useState('female')
  const [measurements, setMeasurements] = useState({ ...GENDER_BASE_MEASUREMENTS_CM.female })
  const [selectedIds, setSelectedIds] = useState({
    top: INITIAL_SELECTION.top.id,
    outerwear: INITIAL_SELECTION.outerwear.id,
    bottom: INITIAL_SELECTION.bottom.id,
    shoes: INITIAL_SELECTION.shoes.id,
  })
  const [activeTab, setActiveTab] = useState('상의')
  const [saveText, setSaveText] = useState('저장')
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_BG)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPreviewMannequinId, setSelectedPreviewMannequinId] = useState('female_standard')
  const [selectedPoseId, setSelectedPoseId] = useState('relaxed')

  useEffect(() => {
    LOCAL_URLS.forEach((url) => useGLTF.preload(url))
  }, [])

  const itemSets = useMemo(() => ({
    top: TOP_ITEMS,
    outerwear: OUTERWEAR_ITEMS,
    bottom: BOTTOM_ITEMS,
    shoes: SHOE_ITEMS,
  }), [])

  const itemMap = useMemo(
    () => new Map([...TOP_ITEMS, ...OUTERWEAR_ITEMS, ...BOTTOM_ITEMS, ...SHOE_ITEMS].map((item) => [item.id, item])),
    [],
  )

  const selection = useMemo(() => ({
    top: itemMap.get(selectedIds.top) ?? TOP_ITEMS[0],
    outerwear: itemMap.get(selectedIds.outerwear) ?? OUTERWEAR_ITEMS[0],
    bottom: itemMap.get(selectedIds.bottom) ?? BOTTOM_ITEMS[0],
    shoes: itemMap.get(selectedIds.shoes) ?? SHOE_ITEMS[0],
  }), [itemMap, selectedIds])

  const theme = useMemo(() => buildTheme(backgroundColor), [backgroundColor])
  const selectedMannequin = useMemo(
    () => MANNEQUIN_PRESETS.find((item) => item.id === selectedPreviewMannequinId) ?? MANNEQUIN_PRESETS[0],
    [selectedPreviewMannequinId],
  )

  const handleApplyMannequinPreset = (item) => {
    if (!item?.measurements) return
    setGender(item.gender)
    setMeasurements({ ...item.measurements })
  }

  const handleSave = () => {
    setSaveText('저장됨')
    window.setTimeout(() => setSaveText('저장'), 1100)
  }

  const handleResetAll = () => {
    setUnit('cm')
    setGender('female')
    setMeasurements({ ...GENDER_BASE_MEASUREMENTS_CM.female })
    setSelectedIds({
      top: INITIAL_SELECTION.top.id,
      outerwear: INITIAL_SELECTION.outerwear.id,
      bottom: INITIAL_SELECTION.bottom.id,
      shoes: INITIAL_SELECTION.shoes.id,
    })
    setActiveTab('상의')
    setBackgroundColor(DEFAULT_BG)
    setIsModalOpen(false)
    setSelectedPreviewMannequinId('female_standard')
    setSelectedPoseId('relaxed')
  }

  const selectedSummary = {
    title: selectedMannequin.name,
    detail: `${selection.top.name} / ${selection.outerwear.name} / ${selection.bottom.name} / ${selection.shoes.name} · ${POSE_TEMPLATES.find((pose) => pose.id === selectedPoseId)?.name}`,
  }

  return (
    <div className="app-shell" style={theme.cssVars}>
      <div className="scene-shell">
        <div className="scene-surface">
          <MannequinScene
            measurements={measurements}
            selection={selection}
            theme={theme.scene}
            gender={gender}
            poseId={selectedPoseId}
          />
        </div>

        <TopControls onResetAll={handleResetAll} onSave={handleSave} saveText={saveText} />

        <LeftPanel
          backgroundColor={backgroundColor}
          setBackgroundColor={setBackgroundColor}
          selectedSummary={selectedSummary}
          onOpenCustomize={() => setIsModalOpen(true)}
        />

        <AssetPanel
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          mannequinCards={MANNEQUIN_PRESETS}
          poseCards={POSE_TEMPLATES}
          itemSets={itemSets}
          selection={selection}
          selectedPoseId={selectedPoseId}
          setSelectedPoseId={setSelectedPoseId}
          selectedPreviewMannequinId={selectedPreviewMannequinId}
          setSelectedPreviewMannequinId={setSelectedPreviewMannequinId}
          setSelectedIds={setSelectedIds}
          onApplyMannequinPreset={handleApplyMannequinPreset}
        />

        <MeasurementModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          unit={unit}
          setUnit={setUnit}
          gender={gender}
          setGender={setGender}
          measurements={measurements}
          setMeasurements={setMeasurements}
          selectedPoseId={selectedPoseId}
          setSelectedPoseId={setSelectedPoseId}
        />
      </div>
    </div>
  )
}
