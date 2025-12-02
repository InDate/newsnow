import { motion } from "framer-motion"
import type { SideTransforms, SwipeAction, SwipeSide } from "./types"

interface ActionButtonsProps {
  side: SwipeSide
  actions: SwipeAction[]
  buttonWidth: number
  transforms: SideTransforms
  onButtonClick: (action: SwipeAction, side: SwipeSide) => void
}

export function ActionButtons({
  side,
  actions,
  buttonWidth,
  transforms,
  onButtonClick,
}: ActionButtonsProps) {
  if (actions.length === 0) return null

  const positionClass = side === "left" ? "left-0" : "right-0"

  return (
    <motion.div
      className={$("absolute top-0 bottom-0 flex items-stretch rounded-lg overflow-hidden", positionClass)}
      style={{ opacity: transforms.containerOpacity }}
    >
      {actions.map((action, index) => (
        <motion.button
          key={action.label}
          onClick={() => onButtonClick(action, side)}
          className={$("flex items-center justify-center gap-1 text-white font-medium text-sm", action.color)}
          style={{
            width: index === actions.length - 1 ? transforms.lastButtonWidth : buttonWidth,
            opacity: transforms.buttonOpacities[index],
          }}
        >
          {action.icon}
          {action.label}
        </motion.button>
      ))}
    </motion.div>
  )
}
