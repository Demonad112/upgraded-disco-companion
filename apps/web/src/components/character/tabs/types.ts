import type { Analysis, AnalyzeOptions } from '@poe2/core'
import type { CharacterHistory } from '@/lib/useCharacterHistory'
import type { ModTiersState } from '@/lib/useModTiers'
import type { PassiveTreeState } from '@/lib/usePassiveTree'
import type { SupportCatalogState } from '@/lib/useSupportCatalog'

/** What every tab panel is given. A panel's own data (support catalogue, tree) is only requested once its tab opens. */
export interface PanelProps {
  analysis: Analysis
  history: CharacterHistory
  tiersState: ModTiersState
  treeState: PassiveTreeState
  catalogState: SupportCatalogState
  analysisOptions: AnalyzeOptions
}
