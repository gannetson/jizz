import React, { useState } from 'react';
import { Box, Button, Flex, Heading, Link, TagRoot, Text, VStack } from '@chakra-ui/react';
import { FormattedMessage } from 'react-intl';
import copy from 'copy-to-clipboard';
import { QRCodeSVG } from 'qrcode.react';
import { buildWhatsAppShareUrl } from '../../api/flocks';

type FlockShareBlockProps = {
  titleId: string;
  titleDefault: string;
  shareUrl: string;
  shareMessage: string;
  hintId?: string;
  hintDefault?: string;
  qrCaptionId?: string;
  qrCaptionDefault?: string;
};

export function FlockShareBlock({
  titleId,
  titleDefault,
  shareUrl,
  shareMessage,
  hintId = 'flocks_share_hint',
  hintDefault = 'Share this link so others can join or view your result.',
  qrCaptionId = 'scan to join',
  qrCaptionDefault = 'Scan this QR code to join the game',
}: FlockShareBlockProps) {
  const [copied, setCopied] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const copyLink = () => {
    copy(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyMessage = () => {
    copy(shareMessage);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const whatsAppUrl = buildWhatsAppShareUrl(shareMessage);
  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const nativeShare = async () => {
    try {
      await navigator.share({ title: 'Birdr', text: shareMessage, url: shareUrl });
    } catch {
      // user cancelled
    }
  };

  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="lg" p={4} bg="white">
      <Heading size="sm" mb={3}>
        <FormattedMessage id={titleId} defaultMessage={titleDefault} />
      </Heading>
      <Text fontSize="sm" color="gray.600" mb={4}>
        <FormattedMessage id={hintId} defaultMessage={hintDefault} />
      </Text>

      {canNativeShare ? (
        <Button colorPalette="primary" mb={4} onClick={() => void nativeShare()}>
          <FormattedMessage id="share" defaultMessage="Share" />
        </Button>
      ) : null}
      <Flex gap={4} align="center" flexWrap="wrap" mb={4}>
        <FormattedMessage id="link" defaultMessage="Link" />
        <TagRoot onClick={copyLink} fontSize="md" cursor="pointer">
          {shareUrl}
        </TagRoot>
        {copied ? (
          <FormattedMessage id="copied" defaultMessage="copied!" />
        ) : (
          <Link onClick={copyLink}>
            <FormattedMessage id="copy" defaultMessage="copy" />
          </Link>
        )}
      </Flex>

      <Flex gap={4} align="center" flexWrap="wrap" mb={4}>
        <FormattedMessage id="flocks_share_message" defaultMessage="Share message" />
        {copiedMessage ? (
          <FormattedMessage id="copied" defaultMessage="copied!" />
        ) : (
          <Link onClick={copyMessage}>
            <FormattedMessage id="copy" defaultMessage="copy" />
          </Link>
        )}
        <Link href={whatsAppUrl} target="_blank" rel="noopener noreferrer">
          <FormattedMessage id="flocks_share_whatsapp" defaultMessage="WhatsApp" />
        </Link>
      </Flex>

      <VStack gap={4} align="start">
        <Box p={4} bg="white" borderRadius="lg" boxShadow="md" border="1px solid orange">
          <QRCodeSVG
            value={shareUrl}
            size={200}
            level="H"
            imageSettings={{
              src: '/images/birdr-logo.png',
              height: 40,
              width: 40,
              excavate: true,
            }}
          />
        </Box>
        <Text fontSize="sm" color="gray.600">
          <FormattedMessage id={qrCaptionId} defaultMessage={qrCaptionDefault} />
        </Text>
      </VStack>
    </Box>
  );
}

export default FlockShareBlock;
