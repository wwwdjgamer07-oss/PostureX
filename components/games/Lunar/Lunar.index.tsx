"use client";

import { useDevice } from "@/hooks/useDevice";
import LunarDesktop from "./Lunar.desktop";
import LunarMobile from "./Lunar.mobile";

type LunarGameProps = {
  onExit?: () => void;
};

export default function LunarGame(props: LunarGameProps) {
  const { isMobile } = useDevice();
  return isMobile ? <LunarMobile {...props} /> : <LunarDesktop {...props} />;
}

