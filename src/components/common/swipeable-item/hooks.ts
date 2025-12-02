import { useMemo } from "react"
import { type MotionValue, useTransform } from "framer-motion"
import type { SideMetrics, SideTransforms } from "./types"

export function useSideMetrics(
  actionCount: number,
  buttonWidth: number,
  dismissExtra: number,
): SideMetrics {
  return useMemo(() => ({
    totalWidth: buttonWidth * actionCount,
    dismissThreshold: buttonWidth * actionCount + dismissExtra,
    hasActions: actionCount > 0,
  }), [actionCount, buttonWidth, dismissExtra])
}

export function useSideTransforms(
  x: MotionValue<number>,
  actionCount: number,
  buttonWidth: number,
  totalWidth: number,
  isRight: boolean,
): SideTransforms {
  // For right actions (revealed when swiping left, negative x):
  //   - At x=0, opacity should be 0
  //   - As x goes negative, opacity increases
  // For left actions (revealed when swiping right, positive x):
  //   - At x=0, opacity should be 0
  //   - As x goes positive, opacity increases

  const buttonOpacities = Array.from({ length: actionCount }, (_, index) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useTransform(
      x,
      isRight
        ? [-(index + 1) * buttonWidth, -index * buttonWidth, 0]
        : [0, index * buttonWidth, (index + 1) * buttonWidth],
      isRight
        ? [1, 1, 0]
        : [0, 1, 1],
    ))

  const lastButtonWidth = useTransform(x, (val) => {
    const absVal = isRight ? Math.abs(val) : val
    return absVal <= totalWidth
      ? buttonWidth
      : buttonWidth + (absVal - totalWidth)
  })

  return {
    buttonOpacities,
    containerOpacity: buttonOpacities[0],
    lastButtonWidth,
  }
}

export function getSnapTarget(
  currentX: number,
  leftMetrics: SideMetrics,
  rightMetrics: SideMetrics,
): number | "dismiss-left" | "dismiss-right" {
  // Swiping left (negative x) - check right actions
  if (currentX < -rightMetrics.dismissThreshold && rightMetrics.hasActions) {
    return "dismiss-left"
  }
  if (currentX < -rightMetrics.totalWidth / 2 && rightMetrics.hasActions) {
    return -rightMetrics.totalWidth
  }

  // Swiping right (positive x) - check left actions
  if (currentX > leftMetrics.dismissThreshold && leftMetrics.hasActions) {
    return "dismiss-right"
  }
  if (currentX > leftMetrics.totalWidth / 2 && leftMetrics.hasActions) {
    return leftMetrics.totalWidth
  }

  return 0
}
