"use client";

import { useDevice } from "@/hooks/useDevice";
import BreakoutDesktop from "./Breakout.desktop";
import BreakoutMobile from "./Breakout.mobile";

type BreakoutGameProps = {
  onExit?: () => void;
};

export default function BreakoutGame(props: BreakoutGameProps) {
  const { isMobile } = useDevice();
  return isMobile ? <BreakoutMobile {...props} /> : <BreakoutDesktop {...props} />;
}

