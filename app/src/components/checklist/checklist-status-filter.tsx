import { Box, Button, HStack, Text } from '@chakra-ui/react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { ChecklistTotals } from '../../api/checklist';

export type ChecklistStatusFilterKey = 'all' | 'identified' | 'missed' | 'unseen';

export const CHECKLIST_STATUS_OPTIONS: {
  value: ChecklistStatusFilterKey;
  labelId: string;
  defaultMessage: string;
  countKey: keyof ChecklistTotals;
}[] = [
  { value: 'all', labelId: 'checklist_filter_all', defaultMessage: 'All', countKey: 'all' },
  {
    value: 'identified',
    labelId: 'checklist_summary_seen',
    defaultMessage: 'Seen',
    countKey: 'identified',
  },
  {
    value: 'missed',
    labelId: 'checklist_summary_missed',
    defaultMessage: 'Missed',
    countKey: 'missed',
  },
  {
    value: 'unseen',
    labelId: 'checklist_summary_unseen',
    defaultMessage: 'Unseen',
    countKey: 'unseen',
  },
];

type Props = {
  value: ChecklistStatusFilterKey;
  onChange: (value: ChecklistStatusFilterKey) => void;
  totals: ChecklistTotals;
};

export function ChecklistStatusFilter({ value, onChange, totals }: Props) {
  const intl = useIntl();

  return (
    <Box mb={4}>
      <Text fontSize="sm" fontWeight="semibold" color="primary.600" mb={2}>
        <FormattedMessage id="checklist_status_filter" defaultMessage="Status" />
      </Text>
      <HStack gap={2} flexWrap="wrap">
        {CHECKLIST_STATUS_OPTIONS.map((opt) => {
          const active = value === opt.value;
          const count = totals[opt.countKey];
          const label = intl.formatMessage({ id: opt.labelId, defaultMessage: opt.defaultMessage });
          return (
            <Button
              key={opt.value}
              variant="outline"
              flex="1"
              minW="88px"
              h="auto"
              py={3}
              px={3}
              flexDirection="column"
              alignItems="flex-start"
              bg={active ? 'primary.500' : 'white'}
              color={active ? 'white' : 'primary.800'}
              borderWidth="2px"
              borderColor={active ? 'primary.500' : 'primary.100'}
              onClick={() => onChange(opt.value)}
              _hover={{ borderColor: 'primary.500', bg: active ? 'primary.600' : 'primary.50' }}
            >
              <Text fontSize="md" fontWeight="bold" lineHeight="short">
                {label}
              </Text>
              <Text fontSize="xs" fontWeight="semibold" mt={1} opacity={active ? 0.95 : 0.75}>
                {count}
              </Text>
            </Button>
          );
        })}
      </HStack>
    </Box>
  );
}
