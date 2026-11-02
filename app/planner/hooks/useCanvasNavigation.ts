import { useEffect, useRef, type PointerEvent } from "react";
import type { PlanBounds } from "../types";

type CanvasSize = { width: number; height: number };
type CanvasOffset = { x: number; y: number };
type CanvasPointer = { x: number; y: number };

type Gesture =
  | {
      type: "pan";
      pointerId: number;
      startPointer: CanvasPointer;
      startOffset: CanvasOffset;
    }
  | {
      type: "pinch";
      pointerIds: [number, number];
      startDistance: number;
      startCenter: CanvasPointer;
      startScale: number;
      startOffset: CanvasOffset;
    };

type Props = {
  bounds: PlanBounds | null;
  canvasSize: CanvasSize;
  scale: number;
  onScaleChange: (scale: number) => void;
  offset: CanvasOffset;
  onOffsetChange: (offset: CanvasOffset) => void;
};

function getDistance(first: CanvasPointer, second: CanvasPointer) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function getCenter(first: CanvasPointer, second: CanvasPointer) {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

export function useCanvasNavigation({
  bounds,
  canvasSize,
  scale,
  onScaleChange,
  offset,
  onOffsetChange,
}: Props) {
  const pointers = useRef(new Map<number, CanvasPointer>());
  const gesture = useRef<Gesture | null>(null);
  const scaleRef = useRef(scale);
  const offsetRef = useRef(offset);

  useEffect(() => {
    scaleRef.current = scale;
    offsetRef.current = offset;
  }, [offset, scale]);

  function updateScale(nextScale: number) {
    scaleRef.current = nextScale;
    onScaleChange(nextScale);
  }

  function updateOffset(nextOffset: CanvasOffset) {
    offsetRef.current = nextOffset;
    onOffsetChange(nextOffset);
  }

  function getPointer(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function isInteractiveTarget(target: EventTarget | null) {
    return (
      target instanceof Element &&
      Boolean(
        target.closest(
          "button, input, select, textarea, svg, [data-room-id], [data-furniture-placement-id]",
        ),
      )
    );
  }

  function onPointerDownCapture(event: PointerEvent<HTMLDivElement>) {
    if (
      event.pointerType !== "touch" ||
      !bounds ||
      isInteractiveTarget(event.target) ||
      pointers.current.size >= 2
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const pointer = getPointer(event);
    pointers.current.set(event.pointerId, pointer);

    if (pointers.current.size === 1) {
      gesture.current = {
        type: "pan",
        pointerId: event.pointerId,
        startPointer: pointer,
        startOffset: offsetRef.current,
      };
      return;
    }

    const pointerIds = Array.from(pointers.current.keys()) as [number, number];
    const [first, second] = pointerIds.map(
      (pointerId) => pointers.current.get(pointerId)!,
    );
    gesture.current = {
      type: "pinch",
      pointerIds,
      startDistance: getDistance(first, second),
      startCenter: getCenter(first, second),
      startScale: scaleRef.current,
      startOffset: offsetRef.current,
    };
  }

  function onPointerMoveCapture(event: PointerEvent<HTMLDivElement>) {
    const activeGesture = gesture.current;
    if (!activeGesture || !pointers.current.has(event.pointerId)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const pointer = getPointer(event);
    pointers.current.set(event.pointerId, pointer);

    if (activeGesture.type === "pan") {
      updateOffset({
        x:
          activeGesture.startOffset.x +
          pointer.x -
          activeGesture.startPointer.x,
        y:
          activeGesture.startOffset.y +
          pointer.y -
          activeGesture.startPointer.y,
      });
      return;
    }

    const first = pointers.current.get(activeGesture.pointerIds[0]);
    const second = pointers.current.get(activeGesture.pointerIds[1]);
    if (!first || !second || activeGesture.startDistance === 0) {
      return;
    }

    const nextScale = Math.min(
      Math.max(5, activeGesture.startScale),
      Math.max(
        Math.min(0.2, activeGesture.startScale),
        activeGesture.startScale *
          (getDistance(first, second) / activeGesture.startDistance),
      ),
    );
    const center = getCenter(first, second);
    const startTranslateX =
      canvasSize.width / 2 -
      ((bounds!.minX + bounds!.maxX) / 4) * activeGesture.startScale;
    const startTranslateY =
      canvasSize.height / 2 -
      ((bounds!.minY + bounds!.maxY) / 4) * activeGesture.startScale;
    const nextTranslateX =
      canvasSize.width / 2 - ((bounds!.minX + bounds!.maxX) / 4) * nextScale;
    const nextTranslateY =
      canvasSize.height / 2 - ((bounds!.minY + bounds!.maxY) / 4) * nextScale;

    updateScale(nextScale);
    updateOffset({
      x:
        center.x -
        nextTranslateX -
        ((activeGesture.startCenter.x -
          startTranslateX -
          activeGesture.startOffset.x) *
          nextScale) /
          activeGesture.startScale,
      y:
        center.y -
        nextTranslateY -
        ((activeGesture.startCenter.y -
          startTranslateY -
          activeGesture.startOffset.y) *
          nextScale) /
          activeGesture.startScale,
    });
  }

  function onPointerUpCapture(event: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    pointers.current.delete(event.pointerId);
    const remaining = Array.from(pointers.current.entries())[0];

    if (remaining) {
      gesture.current = {
        type: "pan",
        pointerId: remaining[0],
        startPointer: remaining[1],
        startOffset: offsetRef.current,
      };
    } else {
      gesture.current = null;
    }
  }

  return {
    offset,
    onPointerDownCapture,
    onPointerMoveCapture,
    onPointerUpCapture,
    onPointerCancelCapture: onPointerUpCapture,
  };
}

export type CanvasNavigation = ReturnType<typeof useCanvasNavigation>;
