export function detectMobile() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function hasMobileSensorSupport() {
  if (typeof window === "undefined") return false;
  return "DeviceMotionEvent" in window || "DeviceOrientationEvent" in window;
}

export async function requestSensorPermission() {
  if (typeof window === "undefined") return false;
  const motionType = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
  if (typeof motionType.requestPermission === "function") {
    try {
      const result = await motionType.requestPermission();
      return result === "granted";
    } catch {
      return false;
    }
  }
  return true;
}

