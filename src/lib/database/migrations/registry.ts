import { Migration } from './index'
import { migration001InitialSchema } from './001_initial_schema'
import { migration002AiContentGeneration } from './002_ai_content_generation'
import { migration008CreateAnalysisTables } from './008_create_analysis_tables'

// Registry of all available migrations
export const migrations: Migration[] = [
  migration001InitialSchema,
  migration002AiContentGeneration,
  migration008CreateAnalysisTables,
]
