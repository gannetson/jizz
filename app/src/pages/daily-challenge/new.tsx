import React, { useState, useEffect } from "react";
import {
  VStack,
  Text,
  Heading,
  Container,
  Button,
  Alert,
  AlertIndicator,
  Box,
  Input,
  SimpleGrid,
} from "@chakra-ui/react";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";
import {
  createDailyChallenge,
  startDailyChallenge,
} from "../../api/services/daily-challenge.service";
import { UseCountries } from "../../user/use-countries";
import { Page } from "../../shared/components/layout";

const MEDIA_OPTIONS = [
  { value: "images", label: "Images" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
];

const LEVEL_OPTIONS = [
  { value: "beginner", label: "Beginner" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" },
];

export const DailyChallengeNewPage = () => {
  const navigate = useNavigate();
  const { countries } = UseCountries();
  const filteredCountries = Array.isArray(countries) ? countries.filter((c) => !c.code.includes("NL-NH")) : [];
  const [countryCode, setCountryCode] = useState<string>("");
  const [media, setMedia] = useState("images");
  const [level, setLevel] = useState("advanced");
  const [length, setLength] = useState(10);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (filteredCountries.length > 0 && !countryCode) {
      const nl = filteredCountries.find((c) => c.code === "NL") || filteredCountries[0];
      setCountryCode(nl.code);
    }
  }, [filteredCountries, countryCode]);

  const handleCreateAndStart = async () => {
    if (!countryCode) {
      setError("Select a country");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const challenge = await createDailyChallenge({
        country: countryCode,
        media,
        length,
        duration_days: 7,
        level,
      });
      await startDailyChallenge(challenge.id);
      navigate(`/daily-challenge/${challenge.id}`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to create challenge");
    } finally {
      setCreating(false);
    }
  };

  const country = filteredCountries.find((c) => c.code === countryCode);

  return (
    <Page>
      <Page.Header>
        <Heading color="gray.800" size="lg" m={0}>
          <FormattedMessage id="new_daily_challenge" defaultMessage="New daily challenge" />
        </Heading>
      </Page.Header>
      <Page.Body>
        <Container maxW="container.md" py={4}>
          <Text fontSize="sm" color="gray.600" mb={6}>
            <FormattedMessage
              id="daily_challenge_new_hint"
              defaultMessage="Play solo or invite friends after creating. You can start now and add friends later."
            />
          </Text>

          {error && (
            <Alert.Root status="error" mb={4}>
              <AlertIndicator />
              <Alert.Content>
                <Alert.Title>{error}</Alert.Title>
              </Alert.Content>
            </Alert.Root>
          )}

          <VStack align="stretch" gap={4}>
            <Box>
              <Text fontWeight="600" mb={2}>
                <FormattedMessage id="country" defaultMessage="Country" />
              </Text>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: 'var(--chakra-radii-md)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'var(--chakra-colors-gray-200)',
                }}
              >
                <option value="">Select country</option>
                {filteredCountries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Box>

            <Box>
              <Text fontWeight="600" mb={2}>
                <FormattedMessage id="media_type" defaultMessage="Media type" />
              </Text>
              <SimpleGrid columns={3} gap={2}>
                {MEDIA_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={media === opt.value ? "solid" : "outline"}
                    colorPalette="primary"
                    onClick={() => setMedia(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </SimpleGrid>
            </Box>

            <Box>
              <Text fontWeight="600" mb={2}>
                <FormattedMessage id="level" defaultMessage="Level" />
              </Text>
              <SimpleGrid columns={3} gap={2}>
                {LEVEL_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={level === opt.value ? "solid" : "outline"}
                    colorPalette="primary"
                    onClick={() => setLevel(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </SimpleGrid>
            </Box>

            <Box>
              <Text fontWeight="600" mb={2}>
                <FormattedMessage id="number_of_questions" defaultMessage="Number of questions" />
              </Text>
              <Input
                type="number"
                min={1}
                value={length}
                onChange={(e) => setLength(Math.max(1, parseInt(e.target.value, 10) || 10))}
              />
            </Box>

            <Button
              colorPalette="primary"
              size="lg"
              onClick={handleCreateAndStart}
              disabled={creating || !country}
            >
              {creating ? (
                <FormattedMessage id="creating" defaultMessage="Creating..." />
              ) : (
                <FormattedMessage id="create_and_start" defaultMessage="Create and start (solo)" />
              )}
            </Button>
          </VStack>
        </Container>
      </Page.Body>
    </Page>
  );
};

export default DailyChallengeNewPage;
