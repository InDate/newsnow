import type { NewsItem, SourceID } from "@shared/types"
import { SwipeableItem } from "~/components/common/swipeable-item"
import { dismissedArticlesAtom } from "~/atoms/dismissedAtom"
import { useToast } from "~/hooks/useToast"

interface SwipeableArticleProps {
  item: NewsItem
  sourceId: SourceID
  children: React.ReactNode
  className?: string
}

export function SwipeableArticle({ item, sourceId, children, className }: SwipeableArticleProps) {
  const [, setDismissed] = useAtom(dismissedArticlesAtom)
  const toast = useToast()

  const handleDismiss = () => {
    setDismissed({ type: "dismiss", sourceId, itemId: item.id })
    toast("Article dismissed", {
      type: "info",
      duration: 4000,
      action: {
        label: "Undo",
        onClick: () => {
          setDismissed({ type: "restore", sourceId, itemId: item.id })
        },
      },
    })
  }

  return (
    <SwipeableItem
      rightActions={[
        {
          label: "Dismiss",
          color: "bg-red-500",
          onClick: handleDismiss,
          isDefault: true,
        },
      ]}
      className={className}
    >
      {children}
    </SwipeableItem>
  )
}
