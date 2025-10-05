import { Migration } from './index'
import { migration001InitialSchema } from './001_initial_schema'

// Registry of all available migrations
export const migrations: Migration[] = [migration001InitialSchema]
