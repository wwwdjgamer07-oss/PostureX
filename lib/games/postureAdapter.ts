export interface GamePostureSample {
  shoulderTilt: number;
  headForwardAngle: number;
  spineAngle: number;
  postureScore: number;
  alignmentPercent: number;
  stability: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getBalanceValue(sample: GamePostureSample) {
  const tiltInfluence = sample.shoulderTilt / 18;
  const headInstability = sample.headForwardAngle / 28;
  const spineInstability = sample.spineAngle / 22;
  const drift = tiltInfluence + headInstability * 0.35 + spineInstability * 0.25;
  return clamp(drift, -1, 1);
}

export function getSlouchState(sample: GamePostureSample) {
  const headSeverity = clamp((sample.headForwardAngle - 10) / 20, 0, 1);
  const spineSeverity = clamp((sample.spineAngle - 9) / 18, 0, 1);
  const shoulderSeverity = clamp((Math.abs(sample.shoulderTilt) - 5) / 14, 0, 1);
  const severity = clamp(headSeverity * 0.45 + spineSeverity * 0.35 + shoulderSeverity * 0.2, 0, 1);
  return {
    isSlouching: severity > 0.2,
    severity
  };
}

export function getAlignmentStability(sample: GamePostureSample) {
  return clamp(sample.alignmentPercent * 0.65 + sample.stability * 0.35, 0, 100);
}

export function getCorrectionResponse(previous: GamePostureSample | null, current: GamePostureSample) {
  if (!previous) {
    return {
      speed: 0,
      smoothness: 100,
      accuracy: getAlignmentStability(current)
    };
  }

  const tiltDelta = Math.abs(current.shoulderTilt - previous.shoulderTilt);
  const headDelta = Math.abs(current.headForwardAngle - previous.headForwardAngle);
  const spineDelta = Math.abs(current.spineAngle - previous.spineAngle);

  const speed = clamp((tiltDelta + headDelta + spineDelta) / 3, 0, 100);
  const smoothness = clamp(100 - (tiltDelta * 2.6 + headDelta * 1.8 + spineDelta * 1.9), 0, 100);
  const accuracy = getAlignmentStability(current);

  return { speed, smoothness, accuracy };
}
