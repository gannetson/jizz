import { Box, Button, Flex, Heading, Text } from '@chakra-ui/react';
import { format } from 'date-fns';
import { FormattedMessage } from 'react-intl';
import { Link as RouterLink } from 'react-router-dom';
import type { UpdateListItem } from '../../core/updates';

export function UpdateListItemCard({ update }: { update: UpdateListItem }) {
  return (
    <RouterLink to={`/updates/${update.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <Box
        display="block"
        border="1px solid"
        borderColor="primary.100"
        borderRadius="12px"
        overflow="hidden"
        _hover={{ borderColor: 'primary.300', boxShadow: 'sm' }}
      >
        <Box bg="primary.100" px={4} py={3} display="flex" flexDirection="row" alignItems="center" gap={2}>
          <Heading size="sm" color="primary.800" flex="1">
            {update.title}
          </Heading>
          <Text color="primary.700" fontSize="lg" lineHeight="1" aria-hidden>
            ›
          </Text>
        </Box>
        <Box px={4} py={3}>
          <Text color="primary.700" fontSize="sm" lineClamp={3}>
            {update.excerpt}
          </Text>
          <Flex justify="space-between" align="center" mt={3} color="primary.600" fontSize="sm">
            <Text>{update.user.first_name || update.user.username}</Text>
            <Text fontStyle="italic">{format(new Date(update.created), 'PP')}</Text>
          </Flex>
          {update.thumbs_up_count > 0 && (
            <Text mt={2} fontSize="sm" color="primary.600">
              👍 {update.thumbs_up_count}
            </Text>
          )}
          <Flex justify="flex-end" mt={3} pt={3} borderTopWidth="1px" borderTopColor="primary.100">
            <Text fontSize="sm" fontWeight="semibold" color="primary.700">
              <FormattedMessage id="read_more" defaultMessage="Read more" /> →
            </Text>
          </Flex>
        </Box>
      </Box>
    </RouterLink>
  );
}

export function UpdateThumbsUpButton({
  updateId,
  active,
  count,
  disabled,
  onToggle,
}: {
  updateId: number;
  active: boolean;
  count: number;
  disabled?: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <Flex align="center" gap={3} mt={4}>
      <Button
        size="sm"
        variant={active ? 'solid' : 'outline'}
        colorPalette="primary"
        disabled={disabled}
        onClick={() => onToggle(!active)}
      >
        👍 <FormattedMessage id="thumbs_up" defaultMessage="Thumbs up" />
      </Button>
      <Text color="primary.600" fontSize="sm">
        {count}
      </Text>
    </Flex>
  );
}
