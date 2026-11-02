import { useEffect, useRef, useState } from "react";
import type { EditorMode } from "../types";

type CanvasSize = {
  width: number;
  height: number;
};

function useObservedCanvasSize(
  isActive: boolean,
  activeKey: string | number,
) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const updateCanvasSize = (width: number, height: number) => {
      setCanvasSize((currentSize) =>
        currentSize.width === width && currentSize.height === height
          ? currentSize
          : { width, height },
      );
    };

    const bounds = canvas.getBoundingClientRect();
    updateCanvasSize(bounds.width, bounds.height);

    const observer = new ResizeObserver(([entry]) => {
      updateCanvasSize(entry.contentRect.width, entry.contentRect.height);
    });

    observer.observe(canvas);

    return () => observer.disconnect();
  }, [activeKey, isActive]);

  return { canvasRef, canvasSize };
}

export function useCanvasSize(editorMode: EditorMode, selectedRoomId: number | null) {
  const floorPlan = useObservedCanvasSize(
    editorMode === "flat",
    editorMode,
  );
  const roomDesigner = useObservedCanvasSize(
    editorMode === "room-designer",
    selectedRoomId ?? "no-room",
  );

  return {
    floorPlanCanvasRef: floorPlan.canvasRef,
    floorPlanCanvasSize: floorPlan.canvasSize,
    roomDesignerCanvasRef: roomDesigner.canvasRef,
    roomDesignerCanvasSize: roomDesigner.canvasSize,
  };
}
