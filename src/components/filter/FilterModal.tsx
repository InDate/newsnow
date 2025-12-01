import { Command } from "cmdk"
import { AnimatePresence, motion } from "framer-motion"
import type { FilterConfig, FilterRule } from "@shared/filter"
import { createFilterRule } from "@shared/filter"
import type { SourceID } from "@shared/types"
import { filterConfigAtom } from "~/atoms/filterAtom"
import { useFilterModal } from "~/hooks/useFilterModal"

import "./filter.css"

export function FilterModal() {
  const { opened, sourceId, toggle, close } = useFilterModal()
  const [config, setConfig] = useAtom(filterConfigAtom)

  // If sourceId is set, we're in source-specific mode
  const isSourceMode = sourceId !== null
  const currentSource = isSourceMode ? sources[sourceId] : null

  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if (e.key === "F" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault()
        toggle()
      }
    }
    document.addEventListener("keydown", keydown)
    return () => {
      document.removeEventListener("keydown", keydown)
    }
  }, [toggle])

  // Add a rule (global or source-specific)
  const addRule = useCallback((rule: FilterRule) => {
    setConfig((prev) => {
      if (rule.scope === "global") {
        return {
          ...prev,
          globalRules: [...prev.globalRules, rule],
          updatedTime: Date.now(),
        }
      } else {
        const sid = rule.scope as SourceID
        const existingRules = prev.sourceRules[sid] ?? []
        return {
          ...prev,
          sourceRules: {
            ...prev.sourceRules,
            [sid]: [...existingRules, rule],
          },
          updatedTime: Date.now(),
        }
      }
    })
  }, [setConfig])

  // Update a rule (finds it in global or source rules)
  const updateRule = useCallback((id: string, updates: Partial<FilterRule>) => {
    setConfig((prev) => {
      // Check global rules first
      const globalIndex = prev.globalRules.findIndex(r => r.id === id)
      if (globalIndex !== -1) {
        const newGlobalRules = [...prev.globalRules]
        newGlobalRules[globalIndex] = { ...newGlobalRules[globalIndex], ...updates }
        return {
          ...prev,
          globalRules: newGlobalRules,
          updatedTime: Date.now(),
        }
      }

      // Check source rules
      for (const sid of Object.keys(prev.sourceRules)) {
        const sourceRules = prev.sourceRules[sid]
        const sourceIndex = sourceRules.findIndex(r => r.id === id)
        if (sourceIndex !== -1) {
          const newSourceRules = [...sourceRules]
          newSourceRules[sourceIndex] = { ...newSourceRules[sourceIndex], ...updates }
          return {
            ...prev,
            sourceRules: {
              ...prev.sourceRules,
              [sid]: newSourceRules,
            },
            updatedTime: Date.now(),
          }
        }
      }

      return prev
    })
  }, [setConfig])

  // Remove a rule (finds it in global or source rules)
  const removeRule = useCallback((id: string) => {
    setConfig((prev) => {
      // Check global rules first
      if (prev.globalRules.some(r => r.id === id)) {
        return {
          ...prev,
          globalRules: prev.globalRules.filter(r => r.id !== id),
          updatedTime: Date.now(),
        }
      }

      // Check source rules
      for (const sid of Object.keys(prev.sourceRules)) {
        const sourceRules = prev.sourceRules[sid]
        if (sourceRules.some(r => r.id === id)) {
          const newSourceRules = sourceRules.filter(r => r.id !== id)
          const newSourceRulesMap = { ...prev.sourceRules }
          if (newSourceRules.length === 0) {
            delete newSourceRulesMap[sid]
          } else {
            newSourceRulesMap[sid] = newSourceRules
          }
          return {
            ...prev,
            sourceRules: newSourceRulesMap,
            updatedTime: Date.now(),
          }
        }
      }

      return prev
    })
  }, [setConfig])

  return (
    <Command.Dialog
      open={opened}
      onOpenChange={toggle}
      label="Content Filters"
    >
      <div className="filter-header">
        <span className="filter-title">
          {isSourceMode
            ? (
                <span className="flex items-center gap-2">
                  <span
                    className="w-5 h-5 rounded bg-cover"
                    style={{
                      backgroundImage: `url(/icons/${sourceId.split("-")[0]}.png)`,
                    }}
                  />
                  {currentSource?.name}
                  {currentSource?.title && (
                    <span className="op-60 text-sm">
                      (
                      {currentSource.title}
                      )
                    </span>
                  )}
                </span>
              )
            : "Content Filters"}
        </span>
        <button type="button" className="filter-close" onClick={close}>
          <span className="i-ph:x" />
        </button>
      </div>

      <div className="filter-content">
        {isSourceMode
          ? (
              <SourceMode
                sourceId={sourceId}
                config={config}
                onAddRule={addRule}
                onUpdateRule={updateRule}
                onRemoveRule={removeRule}
              />
            )
          : (
              <GlobalMode
                config={config}
                onAddRule={addRule}
                onUpdateRule={updateRule}
                onRemoveRule={removeRule}
              />
            )}
      </div>
    </Command.Dialog>
  )
}

interface GlobalModeProps {
  config: FilterConfig
  onAddRule: (rule: FilterRule) => void
  onUpdateRule: (id: string, updates: Partial<FilterRule>) => void
  onRemoveRule: (id: string) => void
}

function GlobalMode({ config, onAddRule, onUpdateRule, onRemoveRule }: GlobalModeProps) {
  const [newPattern, setNewPattern] = useState("")
  const [newType, setNewType] = useState<FilterRule["type"]>("exclude")
  const [newScope, setNewScope] = useState<"global" | SourceID>("global")

  // Get all available sources for the dropdown
  const sourceList = useMemo(() => {
    return typeSafeObjectEntries(sources)
      .filter(([_, source]) => !source.redirect && !source.disable)
      .map(([id, source]) => ({
        id,
        name: source.name,
        title: source.title,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [])

  // Combine all rules for display
  const allRules = useMemo(() => {
    const rules: Array<FilterRule & { sourceInfo?: { name: string, title?: string } }> = []

    // Add global rules
    for (const rule of config.globalRules) {
      rules.push(rule)
    }

    // Add source-specific rules
    for (const sid of Object.keys(config.sourceRules)) {
      const sourceRules = config.sourceRules[sid]
      const source = sources[sid as SourceID]
      for (const rule of sourceRules) {
        rules.push({
          ...rule,
          sourceInfo: source ? { name: source.name, title: source.title } : undefined,
        })
      }
    }

    return rules.sort((a, b) => b.createdAt - a.createdAt)
  }, [config])

  const handleAdd = () => {
    if (newPattern.trim()) {
      onAddRule(createFilterRule(newPattern.trim(), newType, newScope))
      setNewPattern("")
    }
  }

  return (
    <div className="advanced-mode">
      <div className="rules-list">
        {allRules.length === 0
          ? (
              <p className="no-rules">No filter rules configured yet.</p>
            )
          : (
              <AnimatePresence>
                {allRules.map(rule => (
                  <RuleItem
                    key={rule.id}
                    rule={rule}
                    onUpdateRule={onUpdateRule}
                    onRemoveRule={onRemoveRule}
                  />
                ))}
              </AnimatePresence>
            )}
      </div>

      <div className="add-rule">
        <input
          type="text"
          className="add-rule-input"
          placeholder="Enter keyword..."
          value={newPattern}
          onChange={e => setNewPattern(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd()
          }}
        />
        <select
          className="add-rule-type"
          value={newType}
          onChange={e => setNewType(e.target.value as FilterRule["type"])}
        >
          <option value="exclude">Exclude</option>
          <option value="include">Include</option>
          <option value="require">Require</option>
        </select>
        <select
          className="add-rule-scope"
          value={newScope}
          onChange={e => setNewScope(e.target.value as "global" | SourceID)}
        >
          <option value="global">All Sources</option>
          <optgroup label="Specific Source">
            {sourceList.map(source => (
              <option key={source.id} value={source.id}>
                {source.name}
                {source.title ? ` (${source.title})` : ""}
              </option>
            ))}
          </optgroup>
        </select>
        <button type="button" className="add-rule-btn" onClick={handleAdd}>
          <span className="i-ph:plus" />
          Add
        </button>
      </div>

      <div className="syntax-help">
        <p className="syntax-title">Filter Types:</p>
        <ul>
          <li>
            <strong>Exclude:</strong>
            {" "}
            Hide items containing the keyword
          </li>
          <li>
            <strong>Include:</strong>
            {" "}
            Show items matching ANY include keyword
          </li>
          <li>
            <strong>Require:</strong>
            {" "}
            Items must contain ALL required keywords
          </li>
        </ul>
      </div>
    </div>
  )
}

interface SourceModeProps {
  sourceId: SourceID
  config: FilterConfig
  onAddRule: (rule: FilterRule) => void
  onUpdateRule: (id: string, updates: Partial<FilterRule>) => void
  onRemoveRule: (id: string) => void
}

function SourceMode({ sourceId, config, onAddRule, onUpdateRule, onRemoveRule }: SourceModeProps) {
  const [newPattern, setNewPattern] = useState("")
  const [newType, setNewType] = useState<FilterRule["type"]>("exclude")

  // Get rules that apply to this source (global + source-specific)
  const applicableRules = useMemo(() => {
    const globalRules = config.globalRules.map(r => ({ ...r, isGlobal: true }))
    const sourceRules = (config.sourceRules[sourceId] ?? []).map(r => ({ ...r, isGlobal: false }))
    return [...sourceRules, ...globalRules].sort((a, b) => b.createdAt - a.createdAt)
  }, [config, sourceId])

  const sourceSpecificCount = applicableRules.filter(r => !r.isGlobal).length
  const globalCount = applicableRules.filter(r => r.isGlobal).length

  const handleAdd = () => {
    if (newPattern.trim()) {
      onAddRule(createFilterRule(newPattern.trim(), newType, sourceId))
      setNewPattern("")
    }
  }

  return (
    <div className="source-mode">
      <div className="source-mode-info">
        <span className="i-ph:info-duotone" />
        Filters for this source only. Global filters also apply.
      </div>

      <div className="rules-section">
        <h3 className="rules-section-title">
          <span className="i-ph:funnel-duotone" />
          Source Filters
          <span className="rules-count">{sourceSpecificCount}</span>
        </h3>
        <div className="rules-list">
          {sourceSpecificCount === 0
            ? (
                <p className="no-rules-small">No source-specific filters yet.</p>
              )
            : (
                <AnimatePresence>
                  {applicableRules.filter(r => !r.isGlobal).map(rule => (
                    <RuleItem
                      key={rule.id}
                      rule={rule}
                      onUpdateRule={onUpdateRule}
                      onRemoveRule={onRemoveRule}
                      compact
                    />
                  ))}
                </AnimatePresence>
              )}
        </div>
      </div>

      <div className="add-rule compact">
        <input
          type="text"
          className="add-rule-input"
          placeholder="Enter keyword to filter..."
          value={newPattern}
          onChange={e => setNewPattern(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd()
          }}
        />
        <select
          className="add-rule-type"
          value={newType}
          onChange={e => setNewType(e.target.value as FilterRule["type"])}
        >
          <option value="exclude">Exclude</option>
          <option value="include">Include</option>
          <option value="require">Require</option>
        </select>
        <button type="button" className="add-rule-btn" onClick={handleAdd}>
          <span className="i-ph:plus" />
          Add
        </button>
      </div>

      {globalCount > 0 && (
        <div className="rules-section global-rules">
          <h3 className="rules-section-title">
            <span className="i-ph:globe-duotone" />
            Global Filters (also applied)
            <span className="rules-count">{globalCount}</span>
          </h3>
          <div className="rules-list">
            <AnimatePresence>
              {applicableRules.filter(r => r.isGlobal).map(rule => (
                <RuleItem
                  key={rule.id}
                  rule={rule}
                  onUpdateRule={onUpdateRule}
                  onRemoveRule={onRemoveRule}
                  compact
                  isGlobalInSourceView
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  )
}

interface RuleItemProps {
  rule: FilterRule & { sourceInfo?: { name: string, title?: string }, isGlobal?: boolean }
  onUpdateRule: (id: string, updates: Partial<FilterRule>) => void
  onRemoveRule: (id: string) => void
  compact?: boolean
  isGlobalInSourceView?: boolean
}

function RuleItem({ rule, onUpdateRule, onRemoveRule, compact, isGlobalInSourceView }: RuleItemProps) {
  return (
    <motion.div
      className={$("rule-item", compact && "compact", isGlobalInSourceView && "global-in-source")}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
    >
      <label className="rule-toggle">
        <input
          type="checkbox"
          checked={rule.enabled}
          onChange={e => onUpdateRule(rule.id, { enabled: e.target.checked })}
        />
        <span className="toggle-slider" />
      </label>
      <span className={$("rule-pattern", !rule.enabled && "disabled")}>
        "
        {rule.pattern}
        "
      </span>
      <span className={$("rule-type", rule.type)}>
        {rule.type}
      </span>
      {!compact && (
        <span className={$("rule-scope", rule.scope !== "global" && "source-specific")}>
          {rule.scope === "global"
            ? (
                <>
                  <span className="i-ph:globe-duotone" />
                  all
                </>
              )
            : (
                <>
                  <span
                    className="source-icon"
                    style={{
                      backgroundImage: `url(/icons/${(rule.scope as string).split("-")[0]}.png)`,
                    }}
                  />
                  {rule.sourceInfo?.name ?? rule.scope}
                </>
              )}
        </span>
      )}
      <button
        type="button"
        className="rule-delete"
        onClick={() => onRemoveRule(rule.id)}
        title="Delete rule"
      >
        <span className="i-ph:trash-duotone inline-block" />
      </button>
    </motion.div>
  )
}
