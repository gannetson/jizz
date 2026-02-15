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
import { MediaServiceImpl, MediaItem } from '../api/services/media.service';
import { ApiClient, apiClient } from '../api/client';
import { toaster } from '@/components/ui/toaster';
import { BsCheckCircle, BsXCircle } from 'react-icons/bs';
import { UseCountries } from '../user/use-countries';
import {useParams} from "react-router-dom"
import { FaArrowAltCircleRight } from "react-icons/fa";
import { FaQuestion } from "react-icons/fa";

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

  // Preselect country from URL when param is set or changes (e.g. navigation to /media-review/NL)
  useEffect(() => {
    if (countryCode) {
      setSelectedCountry(countryCode.toUpperCase());
    }
  }, [countryCode]);
  const { countries } = UseCountries();
  const { player, language } = useContext(AppContext);
  const intl = useIntl();
  const languageParam = language === 'nl' ? 'nl' : language === 'la' ? 'la' : 'en';

  const countryCollection = useMemo(() => {
    const items = countries.map((c, index) => ({
      label: c.name,
      value: c.code,
      original: c,
      index,
    }));
    return createListCollection({ items });
  }, [countries]);

  const loadMedia = useCallback(async (page: number = 1, reset: boolean = false, countryCode?: string) => {
    try {
      if (reset) {
        setLoading(true);
        setLoadedItemIds(new Set());
        setMedia([]);
      } else {
        setLoadingMore(true);
      }
      
      const data = await mediaService.getMedia('image', page, countryCode, languageParam);
      
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
  }, [intl, languageParam]);

  useEffect(() => {
    loadMedia(1, true, selectedCountry || undefined);
  }, [selectedCountry, languageParam, loadMedia]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasNextPage) {
      loadMedia(currentPage + 1, false, selectedCountry || undefined);
    }
  }, [currentPage, loadingMore, hasNextPage, loadMedia, selectedCountry]);

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
    if (!player) return;
    
    // Mark as reviewed immediately for visual feedback
    setReviewedItems(prev => new Map(prev).set(mediaId, reviewType));
    
    try {
      await mediaService.reviewMedia(mediaId, player.token, reviewType);
      const messages = {
        approved: intl.formatMessage({ id: 'media approved', defaultMessage: 'Media approved.' }),
        rejected: intl.formatMessage({ id: 'media rejected', defaultMessage: 'Media rejected.' }),
        not_sure: intl.formatMessage({ id: 'media not sure', defaultMessage: 'Marked as not sure.' }),
      };
      toaster.create({
        title: messages[reviewType],
        colorPalette: 'success',
        duration: 2000,
      });
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
      <Page.Header>
        <Flex justifyContent="space-between" alignItems="center" width="100%">
          <Heading color={'gray.800'} size={'lg'} m={0}>
            <FormattedMessage id={'media review'} defaultMessage={'Media Review'} />
          </Heading>
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
                  <Select.ValueText placeholder="Select country..." />
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
        </Flex>
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
        {loading ? (
          <Text>Loading...</Text>
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

              return sortedSpecies.map((group) => (
                <Box key={group.speciesId} mb={8}>
                  <Heading size="md" mb={4} color="gray.700">
                    {group.speciesName}
                  </Heading>
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
                      onClick={() => !isReviewed && handleImageClick(item)}
                      cursor={isReviewed ? 'not-allowed' : 'pointer'}
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
                            gap={2}
                            p={2}
                            justifyContent="center"
                            bg="rgba(0, 0, 0, 0.7)"
                            opacity={0}
                            transition="opacity 0.2s"
                            onClick={(e) => e.stopPropagation()}
                            display={{ base: 'none', md: 'flex' }}
                          >
                            <Button
                              size="sm"
                              colorPalette="success"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReview(item.id, 'approved');
                              }}
                              minW="40px"
                              h="40px"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                            >
                              <Icon as={BsCheckCircle} boxSize={5} />
                            </Button>
                            <Button
                              size="sm"
                              colorPalette="warning"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReview(item.id, 'not_sure');
                              }}
                              minW="40px"
                              h="40px"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                            >
                              <Icon as={FaQuestion} boxSize={5} />
                            </Button>
                            <Button
                              size="sm"
                              colorPalette="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReview(item.id, 'rejected');
                              }}
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
                        onClick={(e) => e.stopPropagation()}
                        display={{ base: 'flex', md: 'none' }}
                      >
                        <Button
                          size="sm"
                          colorPalette="success"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReview(item.id, 'approved');
                          }}
                          minW="40px"
                          h="40px"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Icon as={BsCheckCircle} boxSize={5} />
                        </Button>
                        <Button
                          size="sm"
                          colorPalette="warning"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReview(item.id, 'not_sure');
                          }}
                          minW="40px"
                          h="40px"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Icon as={FaQuestion} boxSize={5} />
                        </Button>
                        <Button
                          size="sm"
                          colorPalette="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReview(item.id, 'rejected');
                          }}
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
              ));
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
                      <Button onClick={handleOkay} colorPalette="success">
                        <FormattedMessage id={'okay'} defaultMessage={'Okay!'} />
                      </Button>
                      <Button onClick={handleNotSure} colorPalette="warning">
                        <FormattedMessage id={'not sure'} defaultMessage={'Not Sure'} />
                      </Button>
                      <Button onClick={handleBad} colorPalette="error">
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

