import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AlertContent,
  AlertIndicator,
  AlertTitle,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import { FormattedMessage } from 'react-intl';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getFlockDetailPath,
  getFlockInvitePath,
  listFlockMembers,
  type FlockMember,
} from '../../api/flocks';
import { authService } from '../../api/services/auth.service';
import { Page } from '../../shared/components/layout';

function roleLabel(role: string) {
  if (role === 'owner') return { id: 'flocks_role_owner', defaultMessage: 'Owner' };
  if (role === 'admin') return { id: 'flocks_role_admin', defaultMessage: 'Admin' };
  return { id: 'flocks_role_member', defaultMessage: 'Member' };
}

export function FlockMembersPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [members, setMembers] = useState<FlockMember[]>([]);
  const [flockName, setFlockName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug || !authService.getAccessToken()) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      setLoading(true);
      const data = await listFlockMembers(slug);
      setMembers(data.members);
      setFlockName(data.flock_name);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Page>
      <Page.Header>
        <Heading color="gray.800" size="lg" m={0}>
          <FormattedMessage id="flocks_members_title" defaultMessage="Members" />
        </Heading>
      </Page.Header>
      <Page.Body>
        <Container maxW="container.md" py={4}>
          {flockName ? (
            <Text fontSize="sm" color="gray.600" mb={4}>
              {flockName}
            </Text>
          ) : null}

          {error ? (
            <Alert.Root status="error" mb={4}>
              <AlertIndicator />
              <AlertContent>
                <AlertTitle>{error}</AlertTitle>
              </AlertContent>
            </Alert.Root>
          ) : null}

          {loading ? (
            <Flex justify="center" py={8}>
              <Spinner size="sm" color="primary.500" />
            </Flex>
          ) : (
            <VStack align="stretch" gap={2} mb={6}>
              {members.map((m) => {
                const role = roleLabel(m.role);
                return (
                  <Box
                    key={m.user_id}
                    borderWidth="1px"
                    borderColor="gray.200"
                    borderRadius="md"
                    px={4}
                    py={3}
                    bg="white"
                  >
                    <Flex justify="space-between" align="center" gap={3}>
                      <Text fontWeight="600">{m.display_name}</Text>
                      <Text fontSize="sm" color="gray.500">
                        <FormattedMessage id={role.id} defaultMessage={role.defaultMessage} />
                      </Text>
                    </Flex>
                  </Box>
                );
              })}
            </VStack>
          )}

          <Flex gap={3} flexWrap="wrap">
            <Button variant="outline" onClick={() => navigate(getFlockDetailPath(slug))}>
              <FormattedMessage id="back_to_flock" defaultMessage="Back to flock" />
            </Button>
            <Button colorPalette="primary" onClick={() => navigate(getFlockInvitePath(slug))}>
              <FormattedMessage id="flocks_invite_members" defaultMessage="Invite members" />
            </Button>
          </Flex>
        </Container>
      </Page.Body>
    </Page>
  );
}

export default FlockMembersPage;
