import type { SourceID } from "@shared/types"
import { useUpdateQuery } from "./query"

export function useRefetch() {
  const { enableLogin, loggedIn, login } = useLogin()
  const toaster = useToast()
  const updateQuery = useUpdateQuery()
  /**
   * force refresh
   */
  const refresh = useCallback((...sources: SourceID[]) => {
    if (enableLogin && !loggedIn) {
      toaster("Login to force refresh data", {
        type: "warning",
        action: {
          label: "Login",
          onClick: login,
        },
      })
    } else {
      refetchSources.clear()
      sources.forEach(id => refetchSources.add(id))
      updateQuery(...sources)
    }
  }, [loggedIn, toaster, login, enableLogin, updateQuery])

  return {
    refresh,
    refetchSources,
  }
}
