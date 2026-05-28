import type { ChecklistStatusFilterKey } from './checklist-status-filter';

export type ChecklistBannerFilter = ChecklistStatusFilterKey | 'very_rare';

const BANNERS: Record<
  ChecklistStatusFilterKey,
  { id: string; defaultMessage: string }
> = {
  all: {
    id: 'checklist_banner_all',
    defaultMessage: 'These are all the birds that have appeared in your games.',
  },
  identified: {
    id: 'checklist_banner_seen',
    defaultMessage: 'Birds you identified correctly in your games.',
  },
  missed: {
    id: 'checklist_banner_missed',
    defaultMessage:
      "You haven't identified these birds yet. Keep playing for another chance to see them!",
  },
  unseen: {
    id: 'checklist_banner_unseen',
    defaultMessage:
      "These birds haven't appeared in your games yet. Keep playing to discover them!",
  },
};

export function checklistBannerMessage(filter: ChecklistBannerFilter): {
  id: string;
  defaultMessage: string;
} {
  if (filter === 'very_rare') return BANNERS.all;
  return BANNERS[filter];
}
