import type { SourceID } from "@shared/types"
import { filterModalStateAtom } from "~/atoms/filterAtom"

export function useFilterModal() {
  const [state, setState] = useAtom(filterModalStateAtom)

  return {
    opened: state.open,
    sourceId: state.sourceId,
    open: useCallback((sourceId?: SourceID) => {
      setState({ open: true, sourceId: sourceId ?? null })
    }, [setState]),
    close: useCallback(() => {
      setState({ open: false, sourceId: null })
    }, [setState]),
    toggle: useCallback(() => {
      setState(prev => ({
        open: !prev.open,
        sourceId: prev.open ? null : prev.sourceId,
      }))
    }, [setState]),
  }
}
