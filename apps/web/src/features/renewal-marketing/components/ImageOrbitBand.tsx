'use client';

import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef } from 'react';

type ImageOrbitBandProps = {
  images: string[];
};

const CANVAS_SIZE = 1000;
const INNER_RADIUS = 248;
const OUTER_RADIUS = 390;
const SEGMENT_COUNT = 30;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load ${src}`));
    image.src = src;
  });

const drawCoverImage = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  const frameRatio = width / height;
  const imageRatio = image.width / image.height;

  let drawWidth = width;
  let drawHeight = height;

  if (imageRatio > frameRatio) {
    drawHeight = height;
    drawWidth = drawHeight * imageRatio;
  } else {
    drawWidth = width;
    drawHeight = drawWidth / imageRatio;
  }

  ctx.drawImage(image, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight);
};

export function ImageOrbitBand({ images }: ImageOrbitBandProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stitchedImages = useMemo(
    () => Array.from({ length: SEGMENT_COUNT }, (_, index) => images[index % images.length]),
    [images]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || stitchedImages.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cancelled = false;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const drawBand = async () => {
      try {
        const loadedImages = await Promise.all(stitchedImages.map((src) => loadImage(src)));
        if (cancelled) return;

        const center = CANVAS_SIZE / 2;
        const middleRadius = (INNER_RADIUS + OUTER_RADIUS) / 2;
        const bandHeight = OUTER_RADIUS - INNER_RADIUS;

        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        loadedImages.forEach((image, index) => {
          const startAngle = -Math.PI / 2 + (index / loadedImages.length) * Math.PI * 2;
          const endAngle = -Math.PI / 2 + ((index + 1) / loadedImages.length) * Math.PI * 2;
          const midAngle = (startAngle + endAngle) / 2;
          const arcWidth = middleRadius * (endAngle - startAngle) + 36;

          ctx.save();
          ctx.beginPath();
          ctx.arc(center, center, OUTER_RADIUS, startAngle, endAngle);
          ctx.arc(center, center, INNER_RADIUS, endAngle, startAngle, true);
          ctx.closePath();
          ctx.clip();
          ctx.translate(center + Math.cos(midAngle) * middleRadius, center + Math.sin(midAngle) * middleRadius);
          ctx.rotate(midAngle + Math.PI / 2);
          drawCoverImage(ctx, image, 0, 0, arcWidth, bandHeight + 30);
          ctx.restore();
        });

        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.24)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(center, center, INNER_RADIUS + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(center, center, OUTER_RADIUS - 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } catch {
        if (!cancelled) {
          ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        }
      }
    };

    void drawBand();

    return () => {
      cancelled = true;
    };
  }, [stitchedImages]);

  return (
    <div className="relative aspect-square w-full max-w-[720px]">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 38, ease: 'linear', repeat: Infinity }}
        className="absolute inset-0"
      >
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="h-full w-full [filter:drop-shadow(0_50px_80px_rgba(0,0,0,0.14))]"
        />
      </motion.div>
      <div className="absolute inset-[26%] rounded-full bg-[radial-gradient(circle,_rgba(245,239,229,0.96),_rgba(245,239,229,0.78)_48%,_transparent_72%)]" />
    </div>
  );
}
