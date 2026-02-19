import { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import {
  Box,
  Flex,
  Heading,
  Image,
  Button,
  Dialog,
  Text,
  SimpleGrid,
  Icon,
  Select,
  Portal,
  createListCollection,
  ListRoot, ListItem
} from '@chakra-ui/react';
import { Page } from '../shared/components/layout';
import { FormattedMessage, useIntl } from 'react-intl';
import AppContext from '../core/app-context';
import type { Species } from '../core/app-context';
import { MediaServiceImpl, MediaItem, SpeciesReviewStatsResponse, type ReviewLevel } from '../api/services/media.service';
import SpeciesCombobox from '../components/species-combobox';
import { ApiClient, apiClient } from '../api/client';
import { authService } from '../api/services/auth.service';
import { toaster } from '@/components/ui/toaster';
import { BsCheckCircle, BsXCircle } from 'react-icons/bs';
import { UseCountries } from '../user/use-countries';
import {useParams} from "react-router-dom"
import { FaArrowAltCircleRight, FaTrophy } from "react-icons/fa";
import { FaQuestion } from "react-icons/fa";
import Confetti from "react-confetti";
import { keyframes } from "@emotion/react";

const {
  Root: DialogRoot,
  Backdrop: DialogBackdrop,
  Positioner: DialogPositioner,
  Content: DialogContent,
  Header: DialogHeader,
  Body: DialogBody,
  CloseTrigger: DialogCloseTrigger,
} = Dialog;

const mediaService = new MediaServiceImpl(apiClient);

const glowKeyframes = keyframes`
  0%, 100% { box-shadow: 0 0 20px 4px rgba(234, 179, 8, 0.6), 0 0 40px 8px rgba(34, 197, 94, 0.3); }
  50% { box-shadow: 0 0 32px 8px rgba(234, 179, 8, 0.8), 0 0 60px 12px rgba(34, 197, 94, 0.5); }
`;

export const MediaReviewPage = () => {
  const { countryCode } = useParams<{ countryCode: string }>();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reviewedItems, setReviewedItems] = useState<Map<number, 'approved' | 'rejected' | 'not_sure'>>(new Map());
  const [loadedItemIds, setLoadedItemIds] = useState<Set<number>>(new Set());
  const [selectedCountry, setSelectedCountry] = useState<string>(countryCode ?? '');
  const [speciesStats, setSpeciesStats] = useState<SpeciesReviewStatsResponse | null>(null);
  const [speciesStatsLoading, setSpeciesStatsLoading] = useState(true);
  const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video' | 'audio'>('image');
  const [showConfetti, setShowConfetti] = useState(false);
  const [celebrationSpeciesName, setCelebrationSpeciesName] = useState<string | null>(null);
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [speciesListLoading, setSpeciesListLoading] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null);
  const [reviewLevel, setReviewLevel] = useState<ReviewLevel>('fast');
  const [tenApprovedSpeciesName, setTenApprovedSpeciesName] = useState<string | null>(null);

  // Preselect country from URL when param is set or changes (e.g. navigation to /media-review/NL)
  useEffect(() => {
    if (countryCode) {
      setSelectedCountry(countryCode.toUpperCase());
    }
  }, [countryCode]);

  // Clear species filter when country changes
  useEffect(() => {
    setSelectedSpecies(null);
  }, [selectedCountry]);

  const { countries } = UseCountries();
  const { player, language } = useContext(AppContext);
  const intl = useIntl();
  const languageParam = language === 'nl' ? 'nl' : language === 'la' ? 'la' : 'en';

  // Load species for selected country (for filter dropdown)
  useEffect(() => {
    if (!selectedCountry) {
      setSpeciesList([]);
      return;
    }
    let cancelled = false;
    setSpeciesListLoading(true);
    fetch(`/api/species/?countryspecies__country=${selectedCountry}&language=${languageParam}`, { cache: 'no-cache' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const arr = Array.isArray(data) ? data : data?.results ?? data?.data ?? [];
        if (!cancelled) setSpeciesList(arr);
      })
      .catch(() => {
        if (!cancelled) setSpeciesList([]);
      })
      .finally(() => {
        if (!cancelled) setSpeciesListLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedCountry, languageParam]);

  const countryCollection = useMemo(() => {
    const items = countries.map((c, index) => ({
      label: c.name,
      value: c.code,
      original: c,
      index,
    }));
    return createListCollection({ items });
  }, [countries]);

  const mediaTypeCollection = useMemo(
    () =>
      createListCollection({
        items: [
          { label: intl.formatMessage({ id: 'media type images', defaultMessage: 'Images' }), value: 'image' },
          { label: intl.formatMessage({ id: 'media type videos', defaultMessage: 'Videos' }), value: 'video' },
          { label: intl.formatMessage({ id: 'media type audio', defaultMessage: 'Audio' }), value: 'audio' },
        ],
      }),
    [intl]
  );

  const levelCollection = useMemo(
    () =>
      createListCollection({
        items: [
          { label: intl.formatMessage({ id: 'review level fast', defaultMessage: 'Fast' }), value: 'fast' },
          { label: intl.formatMessage({ id: 'review level full', defaultMessage: 'Full' }), value: 'full' },
          { label: intl.formatMessage({ id: 'review level thorough', defaultMessage: 'Thorough' }), value: 'thorough' },
        ],
      }),
    [intl]
  );

  const loadMedia = useCallback(
    async (
      page: number = 1,
      reset: boolean = false,
      countryCode?: string,
      mediaType: 'image' | 'video' | 'audio' = 'image',
      speciesId?: number,
      level: ReviewLevel = 'fast'
    ) => {
      try {
        if (reset) {
          setLoading(true);
          setLoadedItemIds(new Set());
          setMedia([]);
        } else {
          setLoadingMore(true);
        }

        const data = await mediaService.getMedia(mediaType, page, countryCode, languageParam, speciesId, level);
      
      // Use functional updates to access current state
      setLoadedItemIds(currentLoadedIds => {
        // Filter out items we've already loaded (including reviewed ones)
        const newItems = data.results.filter(item => !currentLoadedIds.has(item.id));
        
        if (reset) {
          setMedia(newItems);
          return new Set(newItems.map(item => item.id));
        } else {
          // Filter out duplicates
          setMedia(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const filtered = newItems.filter(item => !existingIds.has(item.id));
            return [...prev, ...filtered];
          });
          
          // Update loaded IDs
          const updated = new Set(currentLoadedIds);
          newItems.forEach(item => updated.add(item.id));
          return updated;
        }
      });
      
      setHasNextPage(data.next !== null);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading media:', error);
      toaster.create({
        title: intl.formatMessage({ id: 'error loading media', defaultMessage: 'Error loading media' }),
        colorPalette: 'error',
        duration: 4000,
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  },
    [intl, languageParam]
  );

  useEffect(() => {
    loadMedia(1, true, selectedCountry || undefined, selectedMediaType, selectedSpecies?.id, reviewLevel);
  }, [selectedCountry, selectedMediaType, selectedSpecies?.id, reviewLevel, languageParam, loadMedia]);

  useEffect(() => {
    let cancelled = false;
    setSpeciesStatsLoading(true);
    mediaService
      .getSpeciesReviewStats(selectedCountry || undefined, selectedMediaType, languageParam)
      .then((data) => {
        if (!cancelled) setSpeciesStats(data);
      })
      .catch(() => {
        if (!cancelled) setSpeciesStats(null);
      })
      .finally(() => {
        if (!cancelled) setSpeciesStatsLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedCountry, selectedMediaType, languageParam]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasNextPage) {
      loadMedia(currentPage + 1, false, selectedCountry || undefined, selectedMediaType, selectedSpecies?.id, reviewLevel);
    }
  }, [currentPage, loadingMore, hasNextPage, loadMedia, selectedCountry, selectedMediaType, selectedSpecies?.id, reviewLevel]);

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      // Don't load if already loading or no more pages
      if (loadingMore || !hasNextPage) {
        return;
      }

      // Check if we're near the bottom of the page
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Load more when within 800px of the bottom
      if (scrollTop + windowHeight >= documentHeight - 800) {
        loadMore();
      }
    };

    // Use throttling to avoid too many calls
    let ticking = false;
    const throttledHandleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledHandleScroll, { passive: true });
    // Also check on initial load in case content is shorter than viewport
    handleScroll();
    
    return () => window.removeEventListener('scroll', throttledHandleScroll);
  }, [loadMore, loadingMore, hasNextPage]);

  const handleImageClick = (item: MediaItem) => {
    setSelectedMedia(item);
    setIsDialogOpen(true);
  };

  const handleReview = async (mediaId: number, reviewType: 'approved' | 'rejected' | 'not_sure') => {
    const canReview = !!player || !!authService.getAccessToken();
    if (!canReview) {
      toaster.create({
        title: intl.formatMessage({ id: 'login to review', defaultMessage: 'Please log in to review media.' }),
        colorPalette: 'warning',
        duration: 4000,
      });
      return;
    }

    const item = media.find((m) => m.id === mediaId) ?? selectedMedia;
    const speciesId = item?.species_id;
    const speciesName = item?.species_name;

    // Mark as reviewed immediately for visual feedback
    setReviewedItems(prev => new Map(prev).set(mediaId, reviewType));

    try {
      // When authenticated (JWT), do not send player_token; backend uses request.user
      const playerToken = authService.getAccessToken() ? undefined : player?.token;
      await mediaService.reviewMedia(mediaId, playerToken, reviewType);
      const speciesStatForToast = speciesStats?.species?.find((s) => s.id === speciesId);
      const approvedAfter = speciesStatForToast
        ? speciesStatForToast.approved + (reviewType === 'approved' ? 1 : 0)
        : 0;
      const messages = {
        approved:
          reviewLevel === 'fast'
            ? intl.formatMessage(
                { id: 'media approved count', defaultMessage: 'Media approved {count}/10' },
                { count: approvedAfter },
              )
            : intl.formatMessage({ id: 'media approved', defaultMessage: 'Media approved.' }),
        rejected: intl.formatMessage({ id: 'media rejected', defaultMessage: 'Media rejected.' }),
        not_sure: intl.formatMessage({ id: 'media not sure', defaultMessage: 'Marked as not sure.' }),
      };
      toaster.create({
        title: messages[reviewType],
        colorPalette: 'success',
        duration: 2000,
      });

      // Update species stats optimistically so counts (approved, rejected, not_sure) stay in sync for 10-approved and UI
      if (speciesStats && speciesId != null) {
        setSpeciesStats((prev) => {
          if (!prev) return prev;
          const species = prev.species.find((s) => s.id === speciesId);
          if (!species) return prev;
          const unreviewed = Math.max(0, species.unreviewed - 1);
          const approved = species.approved + (reviewType === 'approved' ? 1 : 0);
          const rejected = species.rejected + (reviewType === 'rejected' ? 1 : 0);
          const not_sure = species.not_sure + (reviewType === 'not_sure' ? 1 : 0);
          const isNowFullyReviewed = unreviewed === 0;
          const hadTenApprovedBefore = species.approved >= 10;
          const isNowReviewed = !isNowFullyReviewed && approved >= 10;
          const wasPartlyAndNowReviewed = species.unreviewed > 0 && species.approved < 10 && isNowReviewed;
          const summary = {
            ...prev.summary,
            fully_reviewed: prev.summary.fully_reviewed + (isNowFullyReviewed ? 1 : 0),
            reviewed: (prev.summary.reviewed ?? 0) + (wasPartlyAndNowReviewed ? 1 : 0) - (isNowFullyReviewed && hadTenApprovedBefore ? 1 : 0),
            partly_reviewed: Math.max(
              0,
              prev.summary.partly_reviewed
                - (isNowFullyReviewed && !hadTenApprovedBefore ? 1 : 0)
                - (wasPartlyAndNowReviewed ? 1 : 0),
            ),
          };
          return {
            ...prev,
            species: prev.species.map((s) =>
              s.id === speciesId
                ? { ...s, unreviewed, approved, rejected, not_sure }
                : s
            ),
            summary,
          };
        });
      }

      // Celebrate when all media for this species are now reviewed (species fully reviewed)
      const speciesStat = speciesStats?.species?.find((s) => s.id === speciesId);
      const unreviewedAfter = speciesStat ? Math.max(0, speciesStat.unreviewed - 1) : null;
      const isSpeciesFullyReviewed =
        speciesId != null &&
        speciesName &&
        unreviewedAfter === 0;

      if (isSpeciesFullyReviewed) {
        setShowConfetti(true);
        setCelebrationSpeciesName(speciesName);
        setTimeout(() => setShowConfetti(false), 6000);
        setTimeout(() => setCelebrationSpeciesName(null), 12000);
      }

      // Fast mode: when 10th media approved for this species (using updated approved count), celebrate and reload
      if (
        reviewLevel === 'fast' &&
        reviewType === 'approved' &&
        speciesId != null &&
        speciesName &&
        approvedAfter >= 10
      ) {
        setTenApprovedSpeciesName(speciesName);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 6000);
        setTimeout(() => setTenApprovedSpeciesName(null), 12000);
        loadMedia(1, true, selectedCountry || undefined, selectedMediaType, selectedSpecies?.id ?? undefined, reviewLevel);
      }

      // Close dialog if this item was selected
      if (selectedMedia?.id === mediaId) {
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error('Error reviewing media:', error);
      // Remove from reviewed set on error
      setReviewedItems(prev => {
        const newMap = new Map(prev);
        newMap.delete(mediaId);
        return newMap;
      });
      toaster.create({
        title: intl.formatMessage({ id: 'error reviewing media', defaultMessage: 'Error reviewing media' }),
        colorPalette: 'error',
        duration: 4000,
      });
    }
  };

  const handleOkay = async () => {
    if (!selectedMedia) return;
    await handleReview(selectedMedia.id, 'approved');
  };

  const handleBad = async () => {
    if (!selectedMedia) return;
    await handleReview(selectedMedia.id, 'rejected');
  };

  const handleNotSure = async () => {
    if (!selectedMedia) return;
    await handleReview(selectedMedia.id, 'not_sure');
  };

  return (
    <Page>
      {showConfetti && (
        <Box
          position="fixed"
          inset={0}
          zIndex={9999}
          pointerEvents="none"
          aria-hidden
        >
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            run={showConfetti}
            recycle={false}
            numberOfPieces={400}
          />
        </Box>
      )}
      {celebrationSpeciesName && (
        <Portal>
          <Flex
            position="fixed"
            inset={0}
            zIndex={10000}
            align="center"
            justify="center"
            p={6}
            bg="blackAlpha.600"
            onClick={() => setCelebrationSpeciesName(null)}
            pointerEvents="auto"
            aria-live="polite"
          >
            <Box
              onClick={(e) => e.stopPropagation()}
              position="relative"
              bg="green.600"
              color="white"
              borderRadius="2xl"
              p={8}
              maxW="420px"
              textAlign="center"
              animation={`${glowKeyframes} 1.5s ease-in-out infinite`}
              borderWidth="4px"
              borderColor="yellow.300"
              borderStyle="solid"
            >
              <Icon as={FaTrophy} boxSize={16} mb={4} color="yellow.200" />
              <Heading size="xl" mb={2}>
                <FormattedMessage id="well done" defaultMessage="Well done!" />
              </Heading>
              <Text fontSize="xl" fontWeight="bold" mb={2}>
                {celebrationSpeciesName}
              </Text>
              <Text fontSize="lg" opacity={0.95}>
                <FormattedMessage id="species fully reviewed message" defaultMessage="is now fully reviewed!" />
              </Text>
              <Button
                mt={6}
                size="lg"
                colorPalette="yellow"
                variant="outline"
                borderWidth="2px"
                onClick={() => setCelebrationSpeciesName(null)}
              >
                <FormattedMessage id="dismiss" defaultMessage="Dismiss" />
              </Button>
            </Box>
          </Flex>
        </Portal>
      )}
      {tenApprovedSpeciesName && (
        <Portal>
          <Flex
            position="fixed"
            inset={0}
            zIndex={10000}
            align="center"
            justify="center"
            p={6}
            bg="blackAlpha.600"
            onClick={() => setTenApprovedSpeciesName(null)}
            pointerEvents="auto"
            aria-live="polite"
          >
            <Box
              onClick={(e) => e.stopPropagation()}
              position="relative"
              bg="blue.600"
              color="white"
              borderRadius="2xl"
              p={8}
              maxW="420px"
              textAlign="center"
              animation={`${glowKeyframes} 1.5s ease-in-out infinite`}
              borderWidth="4px"
              borderColor="blue.200"
              borderStyle="solid"
            >
              <Icon as={FaTrophy} boxSize={16} mb={4} color="blue.200" />
              <Heading size="xl" mb={2}>
                <FormattedMessage id="ten approved title" defaultMessage="10 approved!" />
              </Heading>
              <Text fontSize="xl" fontWeight="bold" mb={2}>
                {tenApprovedSpeciesName}
              </Text>
              <Text fontSize="lg" opacity={0.95}>
                <FormattedMessage id="ten approved message" defaultMessage="Loading next species..." />
              </Text>
              <Button
                mt={6}
                size="lg"
                colorPalette="blue"
                variant="outline"
                borderWidth="2px"
                onClick={() => setTenApprovedSpeciesName(null)}
              >
                <FormattedMessage id="dismiss" defaultMessage="Dismiss" />
              </Button>
            </Box>
          </Flex>
        </Portal>
      )}
      <Page.Header>
        <Heading color={'gray.800'} size={'lg'} m={0}>
          <FormattedMessage id={'media review'} defaultMessage={'Media Review'} />
        </Heading>
      </Page.Header>
      <Page.Body>
          <Box backgroundColor={'blue.100'} borderColor={'blue.700'} color={'blue.700'} border={'2px solid'} padding={4}>
            <Text fontWeight={'bold'}>
              <FormattedMessage id={'media review intro'} defaultMessage={"Great that you are here and thank you for helping out improving the Birdr app!"} />
            </Text>
            <Text pt={2}>
              <FormattedMessage
                id={'media review more'}
                defaultMessage={"To collect over one million images of birds I used and automated script. I tried to make it really smart, so it will collect the right pictures. Unfortunately it is not smart enough :-(. There are pictures of low quality, that have multiple species, nests, feathers or even just something completely different. Appears we still need that 'human touch'! That's were you come in. Here's how you can help."} />
            </Text>

            <Text fontWeight={'bold'} pt={4}>
              <FormattedMessage id={'media review instruction title'} defaultMessage={"Instructions"} />
            </Text>
            <ListRoot pt={2} as='ol' listStyle={'cirlce'} gap={2}>
              <ListItem flexDirection={'row'} gap={2} display={'flex'} alignItems={'center'}>
                <FaArrowAltCircleRight />
                <FormattedMessage
                  id={'media review instructions 1'}
                  defaultMessage={"Select a country in top right corner"} />
                </ListItem>
              <ListItem flexDirection={'row'} gap={2} display={'flex'} alignItems={'center'}>
                <FaArrowAltCircleRight />
                <FormattedMessage
                  id={'media review instructions 2'}
                  defaultMessage={"Scroll trough the list"} />
              </ListItem>
              <ListItem flexDirection={'row'} gap={2} display={'flex'} alignItems={'center'}>
                <FaArrowAltCircleRight />
                <FormattedMessage
                  id={'media review instructions 3'}
                  defaultMessage={"For each picture, hover over. Optional: Click it if you want to see the full image."} />
              </ListItem>
              <ListItem flexDirection={'row'} gap={2} display={'flex'} alignItems={'center'}>
                <FaArrowAltCircleRight />
                <Box>
                <FormattedMessage
                  id={'media review instructions 4'}
                  defaultMessage={"Click {ok} if the picture is ok, {question} if you don't know or {bad} if it should be removed."}
                  values={{
                    ok: (
                      <Icon as={BsCheckCircle} boxSize={5} color="green.600" display="inline" verticalAlign="middle" mx={0.5} />
                    ),
                    question: (
                      <Icon as={FaQuestion} boxSize={5} color="orange.600" display="inline" verticalAlign="middle" mx={0.5} />
                    ),
                    bad: (
                      <Icon as={BsXCircle} boxSize={5} color="red.600" display="inline" verticalAlign="middle" mx={0.5} />
                    ),
                  }}
                />
                </Box>
              </ListItem>
            </ListRoot>
          </Box>
          <Flex gap={3} alignItems="center" flexWrap="wrap" mt={4} mb={4}>
            <Box minW="160px">
              <Select.Root
                collection={mediaTypeCollection}
                value={[selectedMediaType]}
                onValueChange={(details: { value: string[] }) => {
                  const v = details.value[0];
                  if (v === 'image' || v === 'video' || v === 'audio') setSelectedMediaType(v);
                }}
              >
                <Select.HiddenSelect />
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText placeholder={intl.formatMessage({ id: 'media type placeholder', defaultMessage: 'Media type...' })} />
                  </Select.Trigger>
                  <Select.IndicatorGroup>
                    <Select.Indicator />
                  </Select.IndicatorGroup>
                </Select.Control>
                <Portal>
                  <Select.Positioner>
                    <Select.Content>
                      {mediaTypeCollection.items.map((item: any) => (
                        <Select.Item key={item.value} item={item}>
                          <Select.ItemIndicator />
                          <Select.ItemText>{item.label}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Portal>
              </Select.Root>
            </Box>
            <Box minW="140px">
              <Select.Root
                collection={levelCollection}
                value={[reviewLevel]}
                onValueChange={(details: { value: string[] }) => {
                  const v = details.value[0];
                  if (v === 'fast' || v === 'full' || v === 'thorough') setReviewLevel(v);
                }}
              >
                <Select.HiddenSelect />
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText placeholder={intl.formatMessage({ id: 'review level fast', defaultMessage: 'Level...' })} />
                  </Select.Trigger>
                  <Select.IndicatorGroup>
                    <Select.Indicator />
                  </Select.IndicatorGroup>
                </Select.Control>
                <Portal>
                  <Select.Positioner>
                    <Select.Content>
                      {levelCollection.items.map((item: any) => (
                        <Select.Item key={item.value} item={item}>
                          <Select.ItemIndicator />
                          <Select.ItemText>{item.label}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Portal>
              </Select.Root>
            </Box>
            <Box minW="200px">
              <Select.Root
                collection={countryCollection}
                value={selectedCountry ? [selectedCountry] : []}
                onValueChange={(details: { value: string[] }) => {
                  const countryCode = details.value[0] || '';
                  setSelectedCountry(countryCode);
                }}
              >
                <Select.HiddenSelect />
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText placeholder={intl.formatMessage({ id: 'select country placeholder', defaultMessage: 'Select country...' })} />
                  </Select.Trigger>
                  <Select.IndicatorGroup>
                    <Select.Indicator />
                  </Select.IndicatorGroup>
                </Select.Control>
                <Portal>
                  <Select.Positioner>
                    <Select.Content>
                      {countryCollection.items.map((item: any) => (
                        <Select.Item key={item.value} item={item}>
                          <Select.ItemIndicator />
                          <Select.ItemText>{item.label}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Portal>
              </Select.Root>
            </Box>
            {selectedCountry && (
              <Box minW="220px">
                <SpeciesCombobox
                  species={speciesList}
                  playerLanguage={language === 'nl' ? 'nl' : language === 'la' ? 'la' : 'en'}
                  value={selectedSpecies}
                  isClearable
                  onSelect={(s) => setSelectedSpecies(s)}
                  onClear={() => setSelectedSpecies(null)}
                  loading={speciesListLoading}
                  placeholder={<FormattedMessage id="filter by species" defaultMessage="Filter by species..." />}
                  emptyMessage={<FormattedMessage id="no species found" defaultMessage="No species found" />}
                />
              </Box>
            )}
          </Flex>
          {!speciesStatsLoading && speciesStats && (
            <Flex gap={6} mt={4} mb={4} flexWrap="wrap" fontWeight="bold">
              <Text color="primary.500">
                <FormattedMessage id="species reviewed" defaultMessage="{count} reviewed" values={{ count: speciesStats.summary.reviewed ?? 0 }} />
              </Text>
              <Text color="green.700">
                <FormattedMessage id="species fully reviewed" defaultMessage="{count} fully reviewed" values={{ count: speciesStats.summary.fully_reviewed }} />
              </Text>
              <Text color="orange.600">
                <FormattedMessage id="species partly reviewed" defaultMessage="{count} partly reviewed" values={{ count: speciesStats.summary.partly_reviewed }} />
              </Text>
              <Text color="gray.600">
                <FormattedMessage id="species not reviewed" defaultMessage="{count} not reviewed" values={{ count: speciesStats.summary.not_reviewed }} />
              </Text>
            </Flex>
          )}
        {loading ? (
          <Text><FormattedMessage id="loading" defaultMessage="Loading..." /></Text>
        ) : (
          <Box>
            {(() => {
              // Group media by species_id
              const groupedBySpecies = media.reduce((acc, item) => {
                const speciesId = item.species_id;
                if (!acc[speciesId]) {
                  acc[speciesId] = {
                    speciesId,
                    speciesName: item.species_name,
                    items: [],
                  };
                }
                acc[speciesId].items.push(item);
                return acc;
              }, {} as Record<number, { speciesId: number; speciesName: string; items: MediaItem[] }>);

              // Sort by species_id
              const sortedSpecies = Object.values(groupedBySpecies).sort(
                (a, b) => a.speciesId - b.speciesId
              );

              const speciesStatsMap = speciesStats?.species
                ? Object.fromEntries(speciesStats.species.map((s) => [s.id, s]))
                : null;

              return sortedSpecies.map((group) => {
                const stats = speciesStatsMap?.[group.speciesId];
                return (
                <Box key={group.speciesId} mb={8}>
                  <Heading size="md" mb={2} color="gray.700">
                    {group.speciesName}
                  </Heading>
                  {stats != null && (
                    <Text fontSize="sm" color="gray.600" mb={4}>
                      <FormattedMessage
                        id="species review stats line"
                        defaultMessage="{total} media · {unreviewed} unreviewed · {approved} approved · {rejected} rejected · {notSure} not sure"
                        values={{
                          total: stats.total_media,
                          unreviewed: stats.unreviewed,
                          approved: stats.approved,
                          rejected: stats.rejected,
                          notSure: stats.not_sure,
                        }}
                      />
                    </Text>
                  )}
                  {!stats && <Box mb={4} />}
                  <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} gap={4}>
                    {group.items.map((item) => {
                const reviewType = reviewedItems.get(item.id);
                const isReviewed = reviewType !== undefined;
                
                // Determine overlay color based on review type
                const overlayColor = reviewType === 'approved' 
                  ? 'rgba(34, 197, 94, 0.3)' // green
                  : reviewType === 'rejected'
                  ? 'rgba(239, 68, 68, 0.3)' // red
                  : reviewType === 'not_sure'
                  ? 'rgba(251, 146, 60, 0.3)' // orange
                  : 'transparent';
                
                return (
                  <Box
                    key={item.id}
                    borderRadius="8px"
                    overflow="hidden"
                    border="1px solid"
                    borderColor="gray.200"
                    position="relative"
                    opacity={isReviewed ? 0.5 : 1}
                    filter={isReviewed ? 'blur(2px)' : 'none'}
                    transition="opacity 0.3s, filter 0.3s, border-color 0.2s, transform 0.2s"
                    _hover={!isReviewed ? {
                      borderColor: 'primary.500',
                      transform: 'scale(1.02)',
                      '& [data-buttons-overlay]': {
                        opacity: 1,
                      },
                    } : {}}
                  >
                    <Box
                      width="100%"
                      height="150px"
                      overflow="hidden"
                      bg="gray.100"
                      position="relative"
                    >
                      <Image
                        src={item.url}
                        alt={item.species_name}
                        width="100%"
                        height="100%"
                        objectFit="cover"
                        cursor={isReviewed ? 'not-allowed' : 'pointer'}
                        onClick={() => !isReviewed && handleImageClick(item)}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150"%3E%3Crect fill="%23ddd" width="150" height="150"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EImage%3C/text%3E%3C/svg%3E';
                        }}
                      />
                      {/* Colored overlay for reviewed items */}
                      {isReviewed && (
                        <Box
                          position="absolute"
                          top={0}
                          left={0}
                          right={0}
                          bottom={0}
                          bg={overlayColor}
                          zIndex={2}
                          pointerEvents="none"
                        />
                      )}
                      {/* Buttons overlay - desktop only, visible on hover */}
                      {!isReviewed && (
                        <Flex
                          data-buttons-overlay
                          position="absolute"
                          bottom={0}
                          left={0}
                          right={0}
                          zIndex={3}
                          gap={2}
                          p={2}
                          justifyContent="center"
                          bg="rgba(0, 0, 0, 0.7)"
                          opacity={0}
                          transition="opacity 0.2s"
                          pointerEvents="auto"
                          display={{ base: 'none', md: 'flex' }}
                        >
                          <Button
                            type="button"
                            size="sm"
                            colorPalette="success"
                            onClick={() => handleReview(item.id, 'approved')}
                            minW="40px"
                            h="40px"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                          >
                            <Icon as={BsCheckCircle} boxSize={5} />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            colorPalette="warning"
                            onClick={() => handleReview(item.id, 'not_sure')}
                            minW="40px"
                            h="40px"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                          >
                            <Icon as={FaQuestion} boxSize={5} />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            colorPalette="error"
                            onClick={() => handleReview(item.id, 'rejected')}
                            minW="40px"
                            h="40px"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                          >
                            <Icon as={BsXCircle} boxSize={5} />
                          </Button>
                        </Flex>
                      )}
                    </Box>
                    {/* Buttons below image - mobile only */}
                    {!isReviewed && (
                      <Flex
                        gap={2}
                        p={2}
                        justifyContent="center"
                        bg="gray.100"
                        borderTopWidth="1px"
                        borderColor="gray.200"
                        display={{ base: 'flex', md: 'none' }}
                      >
                        <Button
                          type="button"
                          size="sm"
                          colorPalette="success"
                          onClick={() => handleReview(item.id, 'approved')}
                          minW="40px"
                          h="40px"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Icon as={BsCheckCircle} boxSize={5} />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          colorPalette="warning"
                          onClick={() => handleReview(item.id, 'not_sure')}
                          minW="40px"
                          h="40px"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Icon as={FaQuestion} boxSize={5} />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          colorPalette="error"
                          onClick={() => handleReview(item.id, 'rejected')}
                          minW="40px"
                          h="40px"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Icon as={BsXCircle} boxSize={5} />
                        </Button>
                      </Flex>
                    )}
                  </Box>
                );
                    })}
                  </SimpleGrid>
                </Box>
                );
              });
            })()}

            {media.length === 0 && !loading && (
              <Text textAlign="center" mt={8}>
                <FormattedMessage id={'no media found'} defaultMessage={'No media found'} />
              </Text>
            )}
            {loadingMore && (
              <Text textAlign="center" mt={4} mb={4}>
                <FormattedMessage id={'loading more'} defaultMessage={'Loading more...'} />
              </Text>
            )}
          </Box>
        )}

        {/* Dialog for larger image view */}
        <DialogRoot open={isDialogOpen} onOpenChange={(e: { open: boolean }) => {
          if (!e.open) {
            setIsDialogOpen(false);
          }
        }}>
          <DialogBackdrop />
          <DialogPositioner>
            <DialogContent maxW="90vw" maxH="90vh">
              <DialogCloseTrigger />
              <DialogHeader>
                <FormattedMessage id={'media details'} defaultMessage={'Media Details'} />
              </DialogHeader>
              <DialogBody>
                {selectedMedia && (
                  <Flex direction="column" gap={4} align="center">
                    <Box maxW="800px" maxH="600px" overflow="hidden" borderRadius="8px">
                      <Image
                        src={selectedMedia.url}
                        alt={selectedMedia.species_name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect fill="%23ddd" width="800" height="600"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EImage not available%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </Box>
                    <Box textAlign="center">
                      <Text fontWeight="bold">{selectedMedia.species_name}</Text>
                      {selectedMedia.contributor && (
                        <Text fontSize="sm" color="gray.600">
                          <FormattedMessage id={'contributor'} defaultMessage={'Contributor'} />: {selectedMedia.contributor}
                        </Text>
                      )}
                      {selectedMedia.source && (
                        <Text fontSize="sm" color="gray.600">
                          <FormattedMessage id={'source'} defaultMessage={'Source'} />: {selectedMedia.source}
                        </Text>
                      )}
                    </Box>
                    <Flex gap={4} mt={4}>
                      <Button type="button" onClick={handleOkay} colorPalette="success">
                        <FormattedMessage id={'okay'} defaultMessage={'Okay!'} />
                      </Button>
                      <Button type="button" onClick={handleNotSure} colorPalette="warning">
                        <FormattedMessage id={'not sure'} defaultMessage={'Not Sure'} />
                      </Button>
                      <Button type="button" onClick={handleBad} colorPalette="error">
                        <FormattedMessage id={'bad'} defaultMessage={'Bad!'} />
                      </Button>
                    </Flex>
                  </Flex>
                )}
              </DialogBody>
            </DialogContent>
          </DialogPositioner>
        </DialogRoot>
      </Page.Body>
    </Page>
  );
};

