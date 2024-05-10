import type { MentionAction } from '../types'
import release from './release'

export const MENTION_ACTIONS: Set<MentionAction> = new Set()

MENTION_ACTIONS.add(release)
