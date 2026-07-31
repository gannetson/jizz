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
  getFlocksPath,
  leaveFlock,
  listFlockMembers,
  removeFlockMember,
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewerUserId, setViewerUserId] = useState<number | null>(null);
  const [canLeave, setCanLeave] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);
  const [leaving, setLeaving] = useState(false);
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
      setIsAdmin(data.is_admin);
      setViewerUserId(data.viewer_user_id);
      setCanLeave(data.can_leave);
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

  const handleRemove = async (member: FlockMember) => {
    if (
      !window.confirm(
        `Remove ${member.display_name} from this flock? They can rejoin with an invite.`
      )
    ) {
      return;
    }
    setError(null);
    setBusyUserId(member.user_id);
    try {
      await removeFlockMember(slug, member.user_id);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Leave this flock? You can rejoin later with an invite.')) {
      return;
    }
    setError(null);
    setLeaving(true);
    try {
      await leaveFlock(slug);
      navigate(getFlocksPath());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to leave flock');
      setLeaving(false);
    }
  };

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
                const canRemove =
                  isAdmin &&
                  m.role !== 'owner' &&
                  m.user_id !== viewerUserId;
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
                      <Box flex="1" minW={0}>
                        <Text fontWeight="600">{m.display_name}</Text>
                        <Text fontSize="sm" color="gray.500">
                          <FormattedMessage id={role.id} defaultMessage={role.defaultMessage} />
                        </Text>
                      </Box>
                      {canRemove ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          colorPalette="red"
                          loading={busyUserId === m.user_id}
                          onClick={() => void handleRemove(m)}
                        >
                          <FormattedMessage id="flocks_remove_member" defaultMessage="Remove" />
                        </Button>
                      ) : null}
                    </Flex>
                  </Box>
                );
              })}
            </VStack>
          )}

          <Flex gap={3} flexWrap="wrap" align="center">
            <Button variant="outline" onClick={() => navigate(getFlockDetailPath(slug))}>
              <FormattedMessage id="back_to_flock" defaultMessage="Back to flock" />
            </Button>
            <Button colorPalette="primary" onClick={() => navigate(getFlockInvitePath(slug))}>
              <FormattedMessage id="flocks_invite_members" defaultMessage="Invite members" />
            </Button>
            {canLeave ? (
              <Button
                variant="ghost"
                colorPalette="red"
                loading={leaving}
                onClick={() => void handleLeave()}
              >
                <FormattedMessage id="flocks_leave" defaultMessage="Leave flock" />
              </Button>
            ) : null}
          </Flex>
        </Container>
      </Page.Body>
    </Page>
  );
}

export default FlockMembersPage;
