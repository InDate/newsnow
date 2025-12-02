import { animate, motion, useMotionValue } from "framer-motion"
import { useCallback, useEffect, useRef, useState } from "react"
import { getSnapTarget, useSideMetrics, useSideTransforms } from "./hooks"
import { ActionButtons } from "./ActionButtons"
import type { SwipeAction, SwipeSide, SwipeableItemProps } from "./types"

export type { SwipeAction, SwipeSide, SwipeableItemProps }

const DEFAULT_BUTTON_WIDTH = 70
const DEFAULT_DISMISS_EXTRA = 200
const EMPTY_ACTIONS: SwipeAction[] = []

// Global state to absorb momentum after dismiss
let isAbsorbingMomentum = false
let lastWheelEventTime = 0

export function SwipeableItem({
  children,
  leftActions = EMPTY_ACTIONS,
  rightActions = EMPTY_ACTIONS,
  buttonWidth = DEFAULT_BUTTON_WIDTH,
  className,
  contentClassName,
}: SwipeableItemProps) {
  const [isDismissing, setIsDismissing] = useState<SwipeSide | false>(false)
  const x = useMotionValue(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const isDismissingRef = useRef(false)
  const pendingActionRef = useRef<(() => void) | null>(null)

  // Compute metrics using shared hook
  const leftMetrics = useSideMetrics(leftActions.length, buttonWidth, DEFAULT_DISMISS_EXTRA)
  const rightMetrics = useSideMetrics(rightActions.length, buttonWidth, DEFAULT_DISMISS_EXTRA)

  // Create transforms using shared hook
  const leftTransforms = useSideTransforms(x, leftActions.length, buttonWidth, leftMetrics.totalWidth, false)
  const rightTransforms = useSideTransforms(x, rightActions.length, buttonWidth, rightMetrics.totalWidth, true)

  // Find the default actions for each side
  const rightDefaultAction = rightActions.find(a => a.isDefault) ?? rightActions[rightActions.length - 1]
  const leftDefaultAction = leftActions.find(a => a.isDefault) ?? leftActions[leftActions.length - 1]

  // Start dismiss animation - action is called after animation completes
  const startDismiss = useCallback((direction: SwipeSide) => {
    if (isDismissingRef.current) return
    isDismissingRef.current = true
    isAbsorbingMomentum = true
    lastWheelEventTime = performance.now()
    setIsDismissing(direction)
    // Store the action to call after animation completes
    pendingActionRef.current = direction === "left"
      ? rightDefaultAction?.onClick ?? null
      : leftDefaultAction?.onClick ?? null
  }, [rightDefaultAction, leftDefaultAction])

  // Handle animation completion - trigger the pending action
  const handleAnimationComplete = useCallback(() => {
    if (isDismissing && pendingActionRef.current) {
      pendingActionRef.current()
      pendingActionRef.current = null
    }
  }, [isDismissing])

  // Snap back when mouse leaves
  const handleMouseLeave = useCallback(() => {
    if (isDismissingRef.current) return
    if (wheelTimeoutRef.current) {
      clearTimeout(wheelTimeoutRef.current)
    }
    animate(x, 0, { duration: 0.15 })
  }, [x])

  // Wheel handler for trackpad gestures
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= 2) return

      const now = performance.now()

      // After dismiss, absorb momentum until events stop for 150ms
      if (isAbsorbingMomentum) {
        const timeSinceLastEvent = now - lastWheelEventTime
        lastWheelEventTime = now

        // If there's been a gap of 150ms+, momentum has stopped - allow new gestures
        if (timeSinceLastEvent > 150) {
          isAbsorbingMomentum = false
        } else {
          // Still receiving momentum events - absorb them
          e.preventDefault()
          e.stopPropagation()
          return
        }
      }

      if (isDismissingRef.current) return

      e.preventDefault()
      e.stopPropagation()

      // Compute bounds based on available actions
      const minX = rightMetrics.hasActions ? -rightMetrics.dismissThreshold * 1.5 : 0
      const maxX = leftMetrics.hasActions ? leftMetrics.dismissThreshold * 1.5 : 0
      const newX = Math.min(maxX, Math.max(minX, x.get() - e.deltaX))
      x.set(newX)

      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current)
      }

      // Auto-dismiss when threshold crossed (either direction)
      const target = getSnapTarget(newX, leftMetrics, rightMetrics)
      if (target === "dismiss-left") {
        startDismiss("left")
        return
      }
      if (target === "dismiss-right") {
        startDismiss("right")
        return
      }

      // Snap after wheel stops
      wheelTimeoutRef.current = setTimeout(() => {
        const finalX = x.get()
        const snapTarget = getSnapTarget(finalX, leftMetrics, rightMetrics)
        if (typeof snapTarget === "number") {
          animate(x, snapTarget, { duration: 0.15 })
        }
      }, 50)
    }

    container.addEventListener("wheel", handleWheel, { passive: false })
    return () => {
      container.removeEventListener("wheel", handleWheel)
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current)
      }
    }
  }, [x, startDismiss, leftMetrics, rightMetrics])

  // Touch drag handler
  const handleDragEnd = useCallback(() => {
    const target = getSnapTarget(x.get(), leftMetrics, rightMetrics)
    if (target === "dismiss-left") {
      startDismiss("left")
    } else if (target === "dismiss-right") {
      startDismiss("right")
    } else {
      animate(x, target, { duration: 0.15 })
    }
  }, [x, leftMetrics, rightMetrics, startDismiss])

  // Handle button click
  const handleButtonClick = useCallback((action: SwipeAction, side: SwipeSide) => {
    if (action.isDefault) {
      startDismiss(side === "left" ? "right" : "left")
    } else {
      action.onClick()
      animate(x, 0, { duration: 0.15 })
    }
  }, [startDismiss, x])

  // Compute drag constraints
  const dragLeft = rightMetrics.hasActions ? -rightMetrics.dismissThreshold * 1.2 : 0
  const dragRight = leftMetrics.hasActions ? leftMetrics.dismissThreshold * 1.2 : 0

  return (
    <motion.div
      initial={{ opacity: 1, x: 0 }}
      animate={
        isDismissing
          ? { opacity: 0, x: isDismissing === "left" ? "-100%" : "100%" }
          : { opacity: 1, x: 0 }
      }
      transition={{ duration: 0.2, ease: "easeIn" }}
      onAnimationComplete={handleAnimationComplete}
      className="overflow-hidden"
    >
      <div
        ref={containerRef}
        className={$("relative overflow-hidden rounded-lg", className)}
        onMouseLeave={handleMouseLeave}
      >
        <ActionButtons
          side="left"
          actions={leftActions}
          buttonWidth={buttonWidth}
          transforms={leftTransforms}
          onButtonClick={handleButtonClick}
        />

        <ActionButtons
          side="right"
          actions={rightActions}
          buttonWidth={buttonWidth}
          transforms={rightTransforms}
          onButtonClick={handleButtonClick}
        />

        <motion.div
          style={{ x }}
          drag="x"
          dragConstraints={{ left: dragLeft, right: dragRight }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          className={$("relative cursor-grab active:cursor-grabbing", contentClassName)}
        >
          {children}
        </motion.div>
      </div>
    </motion.div>
  )
}
