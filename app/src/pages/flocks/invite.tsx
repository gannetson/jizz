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
} from '@chakra-ui/react';
import { FormattedMessage } from 'react-intl';
import { useNavigate, useParams } from 'react-router-dom';
import {
  buildFlockInviteWebUrl,
  formatFlockInviteShareMessage,
  getFlock,
  getFlockDetailPath,
  rotateFlockInvite,
  type Flock,
} from '../../api/flocks';
import { authService } from '../../api/services/auth.service';
import { FlockShareBlock } from '../../components/flocks/share-block';
import { BirdrArtImage } from '../../components/birdr-art-image';
import { Page } from '../../shared/components/layout';

export function FlockInvitePage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [flock, setFlock] = useState<Flock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);

  const load = useCallback(async () => {
    if (!slug || !authService.getAccessToken()) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      setLoading(true);
      setFlock(await getFlock(slug));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setFlock(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRotate = async () => {
    if (!slug) return;
    setRotating(true);
    setError(null);
    try {
      await rotateFlockInvite(slug);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to rotate invite');
    } finally {
      setRotating(false);
    }
  };

  if (loading) {
    return (
      <Page>
        <Page.Body>
          <Flex justify="center" py={12}>
            <Spinner size="lg" color="primary.500" />
          </Flex>
        </Page.Body>
      </Page>
    );
  }

  const invite = flock?.invite;
  const inviteWebUrl =
    invite?.token && typeof window !== 'undefined'
      ? buildFlockInviteWebUrl(invite.token, window.location.origin)
      : invite?.invite_url ?? '';
  const inviteShareMessage =
    invite?.share_message ??
    (inviteWebUrl && flock?.name
      ? formatFlockInviteShareMessage(flock.name, inviteWebUrl)
      : '');

  return (
    <Page>
      <Page.Header>
        <Heading color="gray.800" size="lg" m={0}>
          <FormattedMessage id="flocks_invite_members" defaultMessage="Invite members" />
        </Heading>
      </Page.Header>
      <Page.Body>
        <Container maxW="container.md" py={4}>
          {error ? (
            <Alert.Root status="error" mb={4}>
              <AlertIndicator />
              <AlertContent>
                <AlertTitle>{error}</AlertTitle>
              </AlertContent>
            </Alert.Root>
          ) : null}

          {flock ? (
            <Text fontSize="sm" color="gray.600" mb={4}>
              {flock.name}
            </Text>
          ) : null}

          <BirdrArtImage
            filename="birdr-flock-invite.png"
            alt=""
            maxW="240px"
            mx="auto"
            mb={6}
            objectFit="contain"
          />

          {invite && inviteWebUrl ? (
            <>
              {invite.code ? (
                <Box mb={4} textAlign="center">
                  <Text fontSize="sm" color="gray.600" mb={1}>
                    <FormattedMessage id="flocks_invite_code" defaultMessage="Invite code" />
                  </Text>
                  <Text fontSize="2xl" fontWeight="800" letterSpacing="0.12em" fontFamily="mono">
                    {invite.code}
                  </Text>
                </Box>
              ) : null}
              <FlockShareBlock
                titleId="flocks_invite_share"
                titleDefault="Invite members"
                shareUrl={inviteWebUrl}
                shareMessage={inviteShareMessage}
                hintId="flocks_invite_share_hint"
                hintDefault="Share this link so others can join your flock."
              />
              {flock?.is_admin ? (
                <Button
                  variant="outline"
                  mt={4}
                  width="full"
                  loading={rotating}
                  onClick={() => void handleRotate()}
                >
                  <FormattedMessage id="flocks_rotate_invite" defaultMessage="Rotate invite link" />
                </Button>
              ) : null}
            </>
          ) : (
            <Text color="gray.600" mb={4}>
              <FormattedMessage
                id="flocks_invite_unavailable"
                defaultMessage="Invite details are not available."
              />
            </Text>
          )}

          <Button mt={6} variant="outline" onClick={() => navigate(getFlockDetailPath(slug))}>
            <FormattedMessage id="back_to_flock" defaultMessage="Back to flock" />
          </Button>
        </Container>
      </Page.Body>
    </Page>
  );
}

export default FlockInvitePage;
