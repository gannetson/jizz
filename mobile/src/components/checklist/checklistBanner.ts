import type { ChecklistStatusFilterKey } from './ChecklistStatusFilter';

type BannerFilter = ChecklistStatusFilterKey | 'very_rare';

const BANNERS: Record<ChecklistStatusFilterKey, { key: string; fallback: string }> = {
  all: {
    key: 'checklist_banner_all',
    fallback: 'These are all the birds that have appeared in your games.',
  },
  identified: {
    key: 'checklist_banner_seen',
    fallback: 'Birds you identified correctly in your games.',
  },
  missed: {
    key: 'checklist_banner_missed',
    fallback:
      "You haven't identified these birds yet. Keep playing for another chance to see them!",
  },
  unseen: {
    key: 'checklist_banner_unseen',
    fallback:
      "These birds haven't appeared in your games yet. Keep playing to discover them!",
  },
};

export function checklistBannerMessage(filter: BannerFilter): { key: string; fallback: string } {
  if (filter === 'very_rare') return BANNERS.all;
  return BANNERS[filter];
}
