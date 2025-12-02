import type { MotionValue } from "framer-motion"

export interface SwipeAction {
  label: string
  icon?: React.ReactNode
  color: string
  onClick: () => void
  isDefault?: boolean
}

export interface SideMetrics {
  totalWidth: number
  dismissThreshold: number
  hasActions: boolean
}

export interface SideTransforms {
  buttonOpacities: MotionValue<number>[]
  containerOpacity: MotionValue<number> | undefined
  lastButtonWidth: MotionValue<number>
}

export type SwipeSide = "left" | "right"

export interface SwipeableItemProps {
  children: React.ReactNode
  leftActions?: SwipeAction[]
  rightActions?: SwipeAction[]
  buttonWidth?: number
  className?: string
  contentClassName?: string
}
