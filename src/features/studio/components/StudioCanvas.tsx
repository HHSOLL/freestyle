/* eslint-disable @next/next/no-img-element */

import { AnimatePresence, motion, type DragControls, useDragControls } from 'framer-motion';
import {
  Download,
  Maximize2,
  Minus,
  Palette,
  Plus,
  RefreshCw,
  RotateCcw,
  RotateCw,
  ShoppingBag,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, type MutableRefObject, type PointerEvent as ReactPointerEvent } from 'react';
import { canvasSizeOptions, presetColors } from '../constants';
import type { Asset, CanvasItem, CanvasSize, TextItem } from '../types';

type StudioCanvasProps = {
  canvasRef: MutableRefObject<HTMLDivElement | null>;
  onItemNodeChange: (id: string, node: HTMLDivElement | null) => void;
  onTextNodeChange: (id: string, node: HTMLDivElement | null) => void;
  canvasSize: CanvasSize;
  customRatio: { w: number; h: number };
  onCustomRatioChange: (ratio: { w: number; h: number }) => void;
  canvasWidthPercent: number;
  onCanvasWidthPercentChange: (value: number) => void;
  canvasBackground: string;
  isSizePickerOpen: boolean;
  isColorPickerOpen: boolean;
  onToggleSizePicker: () => void;
  onToggleColorPicker: () => void;
  onCloseSizePicker: () => void;
  onCloseColorPicker: () => void;
  onSelectCanvasSize: (size: CanvasSize) => void;
  onSelectCanvasBackground: (color: string) => void;
  onOpenTextModal: () => void;
  onRotateSelected: (deg: number) => void;
  onScaleSelected: (factor: number) => void;
  onResetSelected: () => void;
  onClearCanvas: () => void;
  onDownloadCanvas: () => void;
  onOpenSummary: () => void;
  onOpenAssetLibrary: () => void;
  canvasItems: CanvasItem[];
  textItems: TextItem[];
  assetById: Map<string, Asset>;
  onSelectItem: (id: string) => void;
  onSelectText: (id: string) => void;
  onDragEnd: (id: string, offset: { x: number; y: number }) => void;
  onTextDragEnd: (id: string, offset: { x: number; y: number }) => void;
  onRemoveItem: (id: string) => void;
  onRemoveText: (id: string) => void;
};

type AlphaMask = {
  width: number;
  height: number;
  alpha: Uint8ClampedArray;
};

type CanvasAssetMotionItemProps = {
  item: CanvasItem;
  asset: Asset;
  canvasRef: MutableRefObject<HTMLDivElement | null>;
  onSetItemRef: (id: string, node: HTMLDivElement | null) => void;
  onSelectItem: (id: string) => void;
  onDragEnd: (id: string, offset: { x: number; y: number }) => void;
  onRemoveItem: (id: string) => void;
  getAlphaMask: (src: string) => Promise<AlphaMask | null>;
};

const HIT_TEST_ALPHA_THRESHOLD = 12;

const clampPixel = (value: number, maxExclusive: number) =>
  Math.max(0, Math.min(maxExclusive - 1, value));

const createAlphaMask = async (src: string): Promise<AlphaMask | null> => {
  if (typeof window === 'undefined') return null;

  try {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Failed to load image for alpha hit-test.'));
      image.src = src;
    });

    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) return null;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;

    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const data = context.getImageData(0, 0, width, height).data;

    const alpha = new Uint8ClampedArray(width * height);
    for (let pixel = 0; pixel < alpha.length; pixel += 1) {
      alpha[pixel] = data[pixel * 4 + 3] ?? 0;
    }

    return {
      width,
      height,
      alpha,
    };
  } catch {
    return null;
  }
};

const isOpaquePixelHit = (
  container: HTMLDivElement,
  clientX: number,
  clientY: number,
  alphaMask: AlphaMask
) => {
  const image = container.querySelector<HTMLImageElement>('[data-canvas-asset-image="true"]');
  if (!image) return false;

  const rect = image.getBoundingClientRect();
  if (!rect.width || !rect.height) return false;
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
    return false;
  }

  const normalizedX = (clientX - rect.left) / rect.width;
  const normalizedY = (clientY - rect.top) / rect.height;
  const sourceX = clampPixel(Math.floor(normalizedX * alphaMask.width), alphaMask.width);
  const sourceY = clampPixel(Math.floor(normalizedY * alphaMask.height), alphaMask.height);
  const alpha = alphaMask.alpha[sourceY * alphaMask.width + sourceX] ?? 0;
  return alpha > HIT_TEST_ALPHA_THRESHOLD;
};

function CanvasAssetMotionItem({
  item,
  asset,
  canvasRef,
  onSetItemRef,
  onSelectItem,
  onDragEnd,
  onRemoveItem,
  getAlphaMask,
}: CanvasAssetMotionItemProps) {
  const dragControls: DragControls = useDragControls();

  const handlePointerDown = useCallback(
    async (event: ReactPointerEvent<HTMLDivElement>) => {
      if ((event.target as HTMLElement).closest('button')) return;

      const pointerEvent = event.nativeEvent;
      const currentTarget = event.currentTarget;
      const { clientX, clientY } = pointerEvent;
      const alphaMask = await getAlphaMask(asset.imageSrc);

      if (alphaMask && !isOpaquePixelHit(currentTarget, clientX, clientY, alphaMask)) {
        return;
      }

      onSelectItem(item.id);
      dragControls.start(pointerEvent, { snapToCursor: false });
    },
    [asset.imageSrc, dragControls, getAlphaMask, item.id, onSelectItem]
  );

  return (
    <motion.div
      drag
      dragListener={false}
      dragControls={dragControls}
      dragMomentum={false}
      dragConstraints={canvasRef}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: item.scale, x: item.x, y: item.y, rotate: item.rotation }}
      exit={{ opacity: 0, scale: 0.7 }}
      onPointerDown={handlePointerDown}
      onDragEnd={(_, info) => onDragEnd(item.id, info.offset)}
      ref={(node) => {
        onSetItemRef(item.id, node);
      }}
      className="absolute z-[10] cursor-grab active:cursor-grabbing group"
      style={{
        left: '50%',
        top: '50%',
        width: 224,
        height: 288,
        marginLeft: -112,
        marginTop: -144,
      }}
    >
      <div className="relative w-full h-full flex items-center justify-center p-4">
        <img
          src={asset.imageSrc}
          alt={asset.name}
          data-canvas-asset-image="true"
          className="max-w-full max-h-full object-contain pointer-events-none select-none drop-shadow-2xl"
          draggable={false}
        />
        <button
          onClick={(event) => {
            event.stopPropagation();
            onRemoveItem(item.id);
          }}
          className="absolute -top-2 -right-2 bg-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:bg-black hover:text-white border border-black/5"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

export function StudioCanvas({
  canvasRef,
  onItemNodeChange,
  onTextNodeChange,
  canvasSize,
  customRatio,
  onCustomRatioChange,
  canvasWidthPercent,
  onCanvasWidthPercentChange,
  canvasBackground,
  isSizePickerOpen,
  isColorPickerOpen,
  onToggleSizePicker,
  onToggleColorPicker,
  onCloseSizePicker,
  onCloseColorPicker,
  onSelectCanvasSize,
  onSelectCanvasBackground,
  onOpenTextModal,
  onRotateSelected,
  onScaleSelected,
  onResetSelected,
  onClearCanvas,
  onDownloadCanvas,
  onOpenSummary,
  onOpenAssetLibrary,
  canvasItems,
  textItems,
  assetById,
  onSelectItem,
  onSelectText,
  onDragEnd,
  onTextDragEnd,
  onRemoveItem,
  onRemoveText,
}: StudioCanvasProps) {
  const alphaMaskCacheRef = useRef<Map<string, Promise<AlphaMask | null>>>(new Map());

  const getAlphaMask = useCallback(async (src: string) => {
    const cached = alphaMaskCacheRef.current.get(src);
    if (cached) return cached;

    const loader = createAlphaMask(src);
    alphaMaskCacheRef.current.set(src, loader);
    return loader;
  }, []);

  useEffect(() => {
    for (const item of canvasItems) {
      const asset = assetById.get(item.assetId);
      if (!asset?.imageSrc) continue;
      void getAlphaMask(asset.imageSrc);
    }
  }, [assetById, canvasItems, getAlphaMask]);

  const selectedAspectRatio =
    canvasSize === 'square'
      ? '1 / 1'
      : canvasSize === 'portrait'
        ? '4 / 5'
        : canvasSize === 'custom'
          ? `${customRatio.w} / ${customRatio.h}`
          : undefined;

  const onRatioInputChange = (key: 'w' | 'h', raw: string) => {
    const numeric = Number.parseFloat(raw);
    if (!Number.isFinite(numeric)) return;
    const value = Math.min(30, Math.max(0.2, numeric));
    onCustomRatioChange({
      ...customRatio,
      [key]: value,
    });
  };

  return (
    <main className="flex-1 relative flex flex-col items-center p-6 bg-black/[0.02] overflow-hidden">
      <div className="shrink-0 mb-6 z-30 flex items-center gap-1 bg-white border border-black/5 rounded-2xl p-1 shadow-2xl shadow-black/10 backdrop-blur-md">
        <div className="relative">
          <button
            onClick={onToggleSizePicker}
            className={`p-2.5 rounded-xl transition-all flex items-center gap-2 ${
              isSizePickerOpen ? 'bg-black/5 text-black' : 'text-black/40 hover:text-black'
            }`}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {isSizePickerOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 mt-2 p-3 bg-white rounded-2xl shadow-2xl border border-black/5 z-[60] flex flex-col gap-1 min-w-[180px]"
              >
                {canvasSizeOptions.map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      onSelectCanvasSize(size);
                      onCloseSizePicker();
                    }}
                    className={`px-3 py-2 rounded-lg text-left text-[11px] font-black uppercase hover:bg-black/5 flex items-center justify-between ${
                      canvasSize === size ? 'bg-black/5 text-black' : 'text-black/40'
                    }`}
                  >
                    {size}
                    {canvasSize === size && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                  </button>
                ))}
                {canvasSize === 'custom' && (
                  <div className="mt-2 pt-2 border-t border-black/5 space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-black/40 px-1">
                      Ratio
                    </p>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
                      <input
                        type="number"
                        min={0.2}
                        max={30}
                        step={0.1}
                        value={customRatio.w}
                        onChange={(event) => onRatioInputChange('w', event.target.value)}
                        className="h-8 rounded-lg bg-black/5 px-2 text-[11px] font-bold"
                      />
                      <span className="text-[11px] font-black text-black/30">:</span>
                      <input
                        type="number"
                        min={0.2}
                        max={30}
                        step={0.1}
                        value={customRatio.h}
                        onChange={(event) => onRatioInputChange('h', event.target.value)}
                        className="h-8 rounded-lg bg-black/5 px-2 text-[11px] font-bold"
                      />
                    </div>
                  </div>
                )}
                {canvasSize !== 'auto' && (
                  <div className="mt-2 pt-2 border-t border-black/5 space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-black/40">Width</p>
                      <p className="text-[9px] font-black text-black/40">{canvasWidthPercent}%</p>
                    </div>
                    <input
                      type="range"
                      min={40}
                      max={100}
                      step={1}
                      value={canvasWidthPercent}
                      onChange={(event) => onCanvasWidthPercentChange(Number(event.target.value))}
                      className="w-full accent-black"
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="w-px h-4 bg-black/5 mx-1" />
        <div className="relative">
          <button
            onClick={onToggleColorPicker}
            className="p-2.5 rounded-xl hover:bg-black/5 transition-all flex items-center gap-2 text-black/40 hover:text-black"
          >
            <Palette className="w-4 h-4" />
            <div
              className="w-3 h-3 rounded-full border border-black/5"
              style={{ backgroundColor: canvasBackground }}
            />
          </button>
          <AnimatePresence>
            {isColorPickerOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 mt-2 p-4 bg-white rounded-2xl shadow-2xl border border-black/5 z-[60] w-52"
              >
                <div className="grid grid-cols-5 gap-2.5">
                  {presetColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        onSelectCanvasBackground(color);
                        onCloseColorPicker();
                      }}
                      className="w-7 h-7 rounded-full border border-black/5"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="w-px h-4 bg-black/5 mx-1" />
        <button onClick={onOpenTextModal} className="p-2.5 rounded-xl transition-all text-black/40 hover:text-black">
          <Type className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-black/5 mx-1" />
        <button onClick={() => onRotateSelected(-15)} className="p-2.5 rounded-xl transition-all text-black/40 hover:text-black">
          <RotateCcw className="w-4 h-4" />
        </button>
        <button onClick={() => onRotateSelected(15)} className="p-2.5 rounded-xl transition-all text-black/40 hover:text-black">
          <RotateCw className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-black/5 mx-1" />
        <button onClick={() => onScaleSelected(-0.1)} className="p-2.5 rounded-xl transition-all text-black/40 hover:text-black">
          <Minus className="w-4 h-4" />
        </button>
        <button onClick={() => onScaleSelected(0.1)} className="p-2.5 rounded-xl transition-all text-black/40 hover:text-black">
          <Plus className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-black/5 mx-1" />
        <button onClick={onResetSelected} className="p-2.5 rounded-xl transition-all text-black/40 hover:text-black">
          <RefreshCw className="w-4 h-4 opacity-50" />
        </button>
        <button onClick={onClearCanvas} className="p-2.5 rounded-xl transition-all text-black/40 hover:text-red-500">
          <Trash2 className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-black/5 mx-1" />
        <button onClick={onDownloadCanvas} className="p-2.5 rounded-xl transition-all text-black/40 hover:text-green-600">
          <Download className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 w-full min-h-0 flex items-center justify-center p-2 relative">
        <button
          onClick={(event) => {
            event.stopPropagation();
            onOpenSummary();
          }}
          className="xl:hidden absolute top-4 right-4 z-[50] w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-black/5 border-b-2 hover:bg-black hover:text-white transition-all group"
        >
          <ShoppingBag className="w-5 h-5" />
          <AnimatePresence>
            {canvasItems.length > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-black text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white group-hover:bg-white group-hover:text-black"
              >
                {canvasItems.length}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <div
          ref={canvasRef}
          className={`relative transition-all duration-700 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] overflow-hidden bg-white border border-black/5 ${
            canvasSize === 'auto' ? 'w-full h-full' : 'rounded-[48px]'
          }`}
          style={{
            backgroundColor: canvasBackground,
            aspectRatio: selectedAspectRatio,
            width: canvasSize === 'auto' ? '100%' : `min(${canvasWidthPercent}%, 1200px)`,
            height: canvasSize === 'auto' ? '100%' : 'auto',
            maxWidth: '100%',
            maxHeight: canvasSize === 'auto' ? '100%' : '95%',
          }}
        >
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #E1E1E1 1px, transparent 1px)',
              backgroundSize: '32px 32px',
              opacity: 0.3,
            }}
          />

          <div className="relative w-full h-full">
            <AnimatePresence>
              {canvasItems.map((item) => {
                const asset = assetById.get(item.assetId);
                if (!asset) return null;
                return (
                  <CanvasAssetMotionItem
                    key={item.id}
                    item={item}
                    asset={asset}
                    canvasRef={canvasRef}
                    onSetItemRef={onItemNodeChange}
                    onSelectItem={onSelectItem}
                    onDragEnd={onDragEnd}
                    onRemoveItem={onRemoveItem}
                    getAlphaMask={getAlphaMask}
                  />
                );
              })}
            </AnimatePresence>
            <AnimatePresence>
              {textItems.map((textItem) => (
                <motion.div
                  key={textItem.id}
                  drag
                  dragMomentum={false}
                  dragConstraints={canvasRef}
                  initial={{ opacity: 0, scale: 0.7, x: '50%', y: '50%' }}
                  animate={{
                    opacity: 1,
                    scale: textItem.scale,
                    x: textItem.x,
                    y: textItem.y,
                    rotate: textItem.rotation,
                  }}
                  onPointerDown={() => onSelectText(textItem.id)}
                  onDragEnd={(_, info) => onTextDragEnd(textItem.id, info.offset)}
                  ref={(node) => {
                    onTextNodeChange(textItem.id, node);
                  }}
                  className="absolute cursor-grab active:cursor-grabbing group whitespace-nowrap font-black tracking-tight"
                  style={{ left: '50%', top: '50%', color: textItem.color, fontSize: textItem.fontSize }}
                >
                  {textItem.text}
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveText(textItem.id);
                    }}
                    className="absolute -top-4 -right-4 bg-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-xl"
                  >
                    <X className="w-3 h-3 text-black" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onOpenAssetLibrary}
        className="lg:hidden fixed bottom-8 right-8 z-[80] w-16 h-16 bg-black text-white rounded-full flex items-center justify-center shadow-2xl border border-white/10"
      >
        <Plus className="w-7 h-7" />
      </motion.button>
    </main>
  );
}
