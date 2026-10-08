export type Difficulty = 'basic' | 'intermediate' | 'advanced'

export interface FeatureMeta {
  slug: string
  title: string
  summary: string
  tags: string[] // 例如 ['performance', 'composable', 'a11y']
  highlights: string[] // 要強調的技術點
  difficulty: Difficulty
  createdAt: string // YYYY-MM-DD
}
