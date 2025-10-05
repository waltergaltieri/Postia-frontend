import { Seed } from './index'
import { basicDataSeed } from './001_basic_data'
import { campaignDataSeed } from './002_campaign_data'

// Registry of all available seeds
export const seeds: Seed[] = [basicDataSeed, campaignDataSeed]
