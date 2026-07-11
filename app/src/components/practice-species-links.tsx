import { Box, Flex, Link, Text } from '@chakra-ui/react';
import { SpeciesCoverThumb } from './species-cover-thumb';

function ebirdSpeciesUrl(code: string | null | undefined): string | null {
  const trimmed = code?.trim();
  return trimmed ? `https://ebird.org/species/${trimmed}` : null;
}

function botwSpeciesUrl(code: string | null | undefined): string | null {
  const trimmed = code?.trim();
  return trimmed ? `https://birdsoftheworld.org/bow/species/${trimmed}/cur/introduction` : null;
}

type Props = {
  speciesId: number;
  name: string;
  code?: string | null;
  illustrationUrl?: string | null;
};

export function PracticeSpeciesLinks({
  speciesId,
  name,
  code,
  illustrationUrl,
}: Props) {
  const ebirdUrl = ebirdSpeciesUrl(code);
  const botwUrl = botwSpeciesUrl(code);

  if (!ebirdUrl && !botwUrl) return null;

  return (
    <Flex align="flex-start" gap={3} w="full">
      <SpeciesCoverThumb
        speciesId={speciesId}
        initialUrl={illustrationUrl}
        size="72px"
        alt={name}
      />
      <Box flex={1} minW={0}>
        <Text fontWeight="semibold" color="primary.800" lineClamp={2} mb={1}>
          {name}
        </Text>
        <Flex direction="column" align="flex-start" gap={1}>
          {ebirdUrl ? (
            <Link href={ebirdUrl} target="_blank" rel="noopener noreferrer" fontWeight="semibold" color="primary.600">
              eBird
            </Link>
          ) : null}
          {botwUrl ? (
            <Link href={botwUrl} target="_blank" rel="noopener noreferrer" fontWeight="semibold" color="primary.600">
              Birds of the World
            </Link>
          ) : null}
        </Flex>
      </Box>
    </Flex>
  );
}
