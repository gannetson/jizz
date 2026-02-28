import {
  Box,
  Button, Flex,
  Image, Link,
  Dialog,
  SimpleGrid,
  VStack,
  AspectRatio,
  Text,
  HStack
} from "@chakra-ui/react";
import {BsImages, BsBoxArrowRight} from "react-icons/all";
import AppContext, {Species} from "../core/app-context";
import React, {useContext, useState} from "react"
import {FormattedMessage} from "react-intl"
import ReactPlayer from "react-player"
import { MediaCredits } from "./media-credits"
import { FlagMediaButton } from "./flag-media-button"
import { createPortal } from "react-dom"

// Add global styles for nested modal z-index
// This ensures the species modal appears above parent modals (like game detail modal)
if (typeof document !== 'undefined') {
  const styleId = 'species-modal-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Target Chakra UI Dialog backdrop and content */
      .species-modal-wrapper [role="dialog"],
      .species-modal-wrapper [data-part="backdrop"],
      .species-modal-wrapper [data-part="positioner"],
      .species-modal-wrapper [data-part="content"] {
        z-index: 1400 !important;
      }
      /* Ensure backdrop is below content but above parent modal */
      .species-modal-wrapper [data-part="backdrop"] {
        z-index: 1399 !important;
      }
      .species-modal-wrapper [data-part="positioner"],
      .species-modal-wrapper [data-part="content"] {
        z-index: 1401 !important;
      }
    `;
    document.head.appendChild(style);
  }
}

export function SpeciesModal({species, onClose, isOpen}: { species?: Species, onClose: () => void, isOpen: boolean }) {

  const {speciesLanguage} = useContext(AppContext)
  const [activeTab, setActiveTab] = useState<'images' | 'videos' | 'sounds'>('images')

  if (!species) return null

  const displayName = species.name_translated || (speciesLanguage === 'nl' ? species.name_nl : speciesLanguage === 'la' ? species.name_latin : species.name)

  const DialogPositionerComponent = Dialog.Positioner as React.FC<any>;
  const DialogContentComponent = Dialog.Content as React.FC<any>;
  const DialogBackdropComponent = Dialog.Backdrop as React.FC<any>;
  const DialogHeaderComponent = Dialog.Header as React.FC<any>;
  const DialogBodyComponent = Dialog.Body as React.FC<any>;
  const DialogFooterComponent = Dialog.Footer as React.FC<any>;
  const DialogCloseTriggerComponent = Dialog.CloseTrigger as React.FC<any>;

  // Use portal to render outside parent modal's DOM tree to avoid z-index issues
  const modalContent = (
    <Box className="species-modal-wrapper">
      <Dialog.Root open={isOpen} onOpenChange={(e: { open: boolean }) => !e.open && onClose()} size="xl">
        <DialogBackdropComponent/>
        <DialogPositionerComponent>
          <DialogContentComponent>
            <DialogHeaderComponent>{displayName}</DialogHeaderComponent>
            <DialogCloseTriggerComponent/>
            <DialogBodyComponent>
                <Link href={'https://ebird.org/species/' + species.code} target="_blank" rel="noopener noreferrer">
                  <Flex gap={2} mb={4} alignItems={'center'}>
                    <FormattedMessage defaultMessage={'View on eBird'} id={'view on eBird'}/>
                    <BsBoxArrowRight/>
                  </Flex>
                </Link>
                
                {/* Tab Buttons */}
                <HStack gap={2} mb={4} borderBottomWidth="1px" pb={2}>
                  <Button
                    variant={activeTab === 'images' ? 'solid' : 'ghost'}
                    colorPalette={activeTab === 'images' ? 'primary' : 'gray'}
                    onClick={() => setActiveTab('images')}
                    size="sm"
                  >
                    <FormattedMessage defaultMessage={'Images'} id={'images'}/> ({species.images.length})
                  </Button>
                  <Button
                    variant={activeTab === 'videos' ? 'solid' : 'ghost'}
                    colorPalette={activeTab === 'videos' ? 'primary' : 'gray'}
                    onClick={() => setActiveTab('videos')}
                    size="sm"
                  >
                    <FormattedMessage defaultMessage={'Videos'} id={'videos'}/> ({species.videos.length})
                  </Button>
                  <Button
                    variant={activeTab === 'sounds' ? 'solid' : 'ghost'}
                    colorPalette={activeTab === 'sounds' ? 'primary' : 'gray'}
                    onClick={() => setActiveTab('sounds')}
                    size="sm"
                  >
                    <FormattedMessage defaultMessage={'Sounds'} id={'sounds'}/> ({species.sounds.length})
                  </Button>
                </HStack>
                
                {/* Tab Content */}
                {activeTab === 'images' && (
                  species.images.length > 0 ? (
                    <VStack gap={4} align="stretch">
                      {species.images.map((img, key) => (
                        <Box key={key}>
                          <Box 
                            width="100%" 
                            display="flex" 
                            justifyContent="center" 
                            alignItems="center"
                            bg="gray.50"
                            borderRadius="md"
                            p={2}
                          >
                            <Image 
                              src={img.url} 
                              alt={displayName}
                              maxWidth="100%"
                              maxHeight="100%"
                              borderRadius="md"
                            />
                          </Box>
                          <Flex justifyContent="space-between" alignItems="center" mt={2}>
                            <MediaCredits media={img} />
                            <FlagMediaButton media={img} />
                          </Flex>
                        </Box>
                      ))}
                    </VStack>
                  ) : (
                    <Text color="gray.500">
                      <FormattedMessage defaultMessage={'No images available'} id={'no_images'}/>
                    </Text>
                  )
                )}
                
                {activeTab === 'videos' && (
                  species.videos.length > 0 ? (
                    <VStack gap={4} align="stretch">
                      {species.videos.map((video, key) => (
                        <Box key={key}>
                          <AspectRatio ratio={16 / 9} width="100%">
                            <ReactPlayer
                              url={video.url}
                              controls={true}
                              width="100%"
                              height="100%"
                            />
                          </AspectRatio>
                          <Flex justifyContent="space-between" alignItems="center" mt={2}>
                            <MediaCredits media={video} />
                            <FlagMediaButton media={video} />
                          </Flex>
                        </Box>
                      ))}
                    </VStack>
                  ) : (
                    <Text color="gray.500">
                      <FormattedMessage defaultMessage={'No videos available'} id={'no_videos'}/>
                    </Text>
                  )
                )}
                
                {activeTab === 'sounds' && (
                  species.sounds.length > 0 ? (
                    <VStack gap={4} align="stretch">
                      {species.sounds.map((sound, key) => (
                        <Box key={key}>
                          <Box>
                            <audio controls style={{ width: '100%' }}>
                              <source src={sound.url} type="audio/mpeg" />
                              Your browser does not support the audio element.
                            </audio>
                          </Box>
                          <Flex justifyContent="space-between" alignItems="center" mt={2}>
                            <MediaCredits media={sound} />
                            <FlagMediaButton media={sound} />
                          </Flex>
                        </Box>
                      ))}
                    </VStack>
                  ) : (
                    <Text color="gray.500">
                      <FormattedMessage defaultMessage={'No sounds available'} id={'no_sounds'}/>
                    </Text>
                  )
                )}
              </DialogBodyComponent>

              <DialogFooterComponent>
                <Button onClick={onClose} colorPalette="primary">
                  Close
                </Button>
              </DialogFooterComponent>
          </DialogContentComponent>
        </DialogPositionerComponent>
      </Dialog.Root>
    </Box>
  );

  // Render in portal if modal is open and document is available (browser environment)
  if (isOpen && typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
}