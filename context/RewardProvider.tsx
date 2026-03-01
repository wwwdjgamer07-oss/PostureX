"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LevelUpPopup } from "@/components/rewards/LevelUpPopup";
import { LEVEL_UP_EVENT, addXP, type LevelUpPayload } from "@/lib/rewards/engine";

interface RewardContextValue {
  addXP: typeof addXP;
}

const RewardContext = createContext<RewardContextValue | null>(null);

export function RewardProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<LevelUpPayload[]>([]);
  const [active, setActive] = useState<LevelUpPayload | null>(null);
  const lastEventKeyRef = useRef<string>("");
  const lastEventAtRef = useRef(0);

  useEffect(() => {
    const onLevelUp = (event: Event) => {
      const customEvent = event as CustomEvent<LevelUpPayload>;
      const payload = customEvent.detail;
      if (!payload) return;

      const now = Date.now();
      const eventKey = `${payload.level}:${payload.xpGained}:${payload.coinsEarned}:${payload.gemsEarned}:${payload.totalXP}`;
      const duplicate = lastEventKeyRef.current === eventKey && now - lastEventAtRef.current < 650;
      if (duplicate) return;

      lastEventKeyRef.current = eventKey;
      lastEventAtRef.current = now;
      setQueue((currentQueue) => [...currentQueue, payload]);
    };

    window.addEventListener(LEVEL_UP_EVENT, onLevelUp as EventListener);
    return () => {
      window.removeEventListener(LEVEL_UP_EVENT, onLevelUp as EventListener);
    };
  }, []);

  useEffect(() => {
    if (active || queue.length === 0) return;
    setActive(queue[0]);
    setQueue((currentQueue) => currentQueue.slice(1));
  }, [active, queue]);

  const closePopup = useCallback(() => {
    setActive(null);
  }, []);

  const contextValue = useMemo<RewardContextValue>(
    () => ({
      addXP
    }),
    []
  );

  return (
    <RewardContext.Provider value={contextValue}>
      {children}
      <LevelUpPopup open={Boolean(active)} payload={active} onClose={closePopup} />
    </RewardContext.Provider>
  );
}

export function useRewards() {
  const context = useContext(RewardContext);
  if (!context) {
    throw new Error("useRewards must be used within RewardProvider");
  }
  return context;
}

