import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Flat } from "../types";

const HISTORY_LIMIT = 100;
const HISTORY_COALESCE_DELAY_MS = 350;

export type PlannerHistorySnapshot = {
  rooms: Flat["rooms"];
  wallThickness: number;
  wallThicknesses: NonNullable<Flat["wallThicknesses"]>;
  wallOpenings: NonNullable<Flat["wallOpenings"]>;
  furnitureTemplates: NonNullable<Flat["furnitureTemplates"]>;
  furniturePlacements: NonNullable<Flat["furniturePlacements"]>;
};

type Props = {
  snapshot: PlannerHistorySnapshot;
  onRestore: (snapshot: PlannerHistorySnapshot) => void;
};

type History = {
  entries: PlannerHistorySnapshot[];
  index: number;
};

type HistoryView = {
  index: number;
  length: number;
  committedKey: string;
};

function snapshotKey(snapshot: PlannerHistorySnapshot) {
  return JSON.stringify(snapshot);
}

export function useUndoRedo({ snapshot, onRestore }: Props) {
  const historyRef = useRef<History>({ entries: [snapshot], index: 0 });
  const currentSnapshotRef = useRef(snapshot);
  const onRestoreRef = useRef(onRestore);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const groupDepthRef = useRef(0);
  const currentKey = snapshotKey(snapshot);
  const [historyView, setHistoryView] = useState<HistoryView>(() => ({
    index: 0,
    length: 1,
    committedKey: currentKey,
  }));

  useLayoutEffect(() => {
    currentSnapshotRef.current = snapshot;
  }, [currentKey, snapshot]);

  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  const commit = useCallback((nextSnapshot: PlannerHistorySnapshot) => {
    const history = historyRef.current;
    const currentEntry = history.entries[history.index];

    if (currentEntry && snapshotKey(currentEntry) === snapshotKey(nextSnapshot)) {
      return;
    }

    const nextEntries = history.entries.slice(0, history.index + 1);
    nextEntries.push(nextSnapshot);

    if (nextEntries.length > HISTORY_LIMIT) {
      nextEntries.shift();
    }

    historyRef.current = {
      entries: nextEntries,
      index: nextEntries.length - 1,
    };
    setHistoryView({
      index: nextEntries.length - 1,
      length: nextEntries.length,
      committedKey: snapshotKey(nextSnapshot),
    });
  }, []);

  useEffect(() => {
    if (groupDepthRef.current > 0) {
      return;
    }

    const currentEntry = historyRef.current.entries[historyRef.current.index];

    if (!currentEntry || snapshotKey(currentEntry) === currentKey) {
      return;
    }

    if (pendingTimerRef.current !== null) {
      clearTimeout(pendingTimerRef.current);
    }

    pendingTimerRef.current = setTimeout(() => {
      pendingTimerRef.current = null;
      commit(currentSnapshotRef.current);
    }, HISTORY_COALESCE_DELAY_MS);

    return () => {
      if (pendingTimerRef.current !== null) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
    };
  }, [commit, currentKey]);

  useEffect(
    () => () => {
      if (pendingTimerRef.current !== null) {
        clearTimeout(pendingTimerRef.current);
      }
    },
    [],
  );

  const reset = useCallback((nextSnapshot: PlannerHistorySnapshot) => {
    if (pendingTimerRef.current !== null) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }

    currentSnapshotRef.current = nextSnapshot;
    historyRef.current = { entries: [nextSnapshot], index: 0 };
    setHistoryView({
      index: 0,
      length: 1,
      committedKey: snapshotKey(nextSnapshot),
    });
  }, []);

  const flushPending = useCallback(() => {
    if (pendingTimerRef.current !== null) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }

    commit(currentSnapshotRef.current);
  }, [commit]);

  const beginGroup = useCallback(() => {
    if (groupDepthRef.current === 0) {
      flushPending();
    }

    groupDepthRef.current += 1;
  }, [flushPending]);

  const endGroup = useCallback(() => {
    if (groupDepthRef.current === 0) {
      return;
    }

    groupDepthRef.current -= 1;

    if (groupDepthRef.current === 0) {
      flushPending();
    }
  }, [flushPending]);

  const undo = useCallback(() => {
    flushPending();
    const history = historyRef.current;

    if (history.index === 0) {
      return;
    }

    history.index -= 1;
    setHistoryView({
      index: history.index,
      length: history.entries.length,
      committedKey: snapshotKey(history.entries[history.index]!),
    });
    onRestoreRef.current(history.entries[history.index]!);
  }, [flushPending]);

  const redo = useCallback(() => {
    const history = historyRef.current;

    if (history.index >= history.entries.length - 1) {
      return;
    }

    history.index += 1;
    setHistoryView({
      index: history.index,
      length: history.entries.length,
      committedKey: snapshotKey(history.entries[history.index]!),
    });
    onRestoreRef.current(history.entries[history.index]!);
  }, []);

  const hasPendingChange = historyView.committedKey !== currentKey;
  const canUndo = historyView.index > 0 || hasPendingChange;
  const canRedo =
    !hasPendingChange && historyView.index < historyView.length - 1;

  return { canUndo, canRedo, undo, redo, reset, beginGroup, endGroup };
}
