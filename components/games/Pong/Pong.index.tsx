"use client";

import { useDevice } from "@/hooks/useDevice";
import PongDesktop from "./Pong.desktop";
import PongMobile from "./Pong.mobile";

type PongGameProps = {
  onExit?: () => void;
};

export default function PongGame(props: PongGameProps) {
  const { isMobile } = useDevice();
  return isMobile ? <PongMobile {...props} /> : <PongDesktop {...props} />;
}

