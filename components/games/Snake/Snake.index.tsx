"use client";

import { useDevice } from "@/hooks/useDevice";
import SnakeDesktop from "./Snake.desktop";
import SnakeMobile from "./Snake.mobile";

type SnakeGameProps = {
  onExit?: () => void;
};

export default function SnakeGame(props: SnakeGameProps) {
  const { isMobile } = useDevice();
  return isMobile ? <SnakeMobile {...props} /> : <SnakeDesktop {...props} />;
}

