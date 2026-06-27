import { Box, Image, Spinner, Text } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { fetchSpeciesCover } from '../api/fetch-species-cover';
import { resolveMediaUrl } from '../api/baseUrl';

type Props = {
  speciesId: number;
  initialUrl?: string | null;
  size?: string;
  alt?: string;
};

export function SpeciesCoverThumb({ speciesId, initialUrl, size = '48px', alt = '' }: Props) {
  const [url, setUrl] = useState<string | null>(() => resolveMediaUrl(initialUrl));
  const [loading, setLoading] = useState(!initialUrl);

  useEffect(() => {
    setUrl(resolveMediaUrl(initialUrl));
    let cancelled = false;
    setLoading(true);
    fetchSpeciesCover(speciesId)
      .then((data) => {
        if (!cancelled) {
          setUrl(resolveMediaUrl(data.illustration_url));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUrl((prev) => prev ?? null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [speciesId, initialUrl]);

  return (
    <Box
      w={size}
      h={size}
      flexShrink={0}
      borderRadius="md"
      overflow="hidden"
      bg="primary.50"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      {url ? (
        <Image src={url} alt={alt} w="full" h="full" objectFit="cover" />
      ) : loading ? (
        <Spinner size="sm" color="primary.400" />
      ) : (
        <Text fontSize="xs" color="primary.400">
          —
        </Text>
      )}
    </Box>
  );
}
