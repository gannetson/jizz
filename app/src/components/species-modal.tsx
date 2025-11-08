import {
  Box,
  Button, Flex,
  Image, Link,
  Dialog,
  SimpleGrid,
  useDisclosure,
  Portal
} from "@chakra-ui/react";
import {BsImages, BsBoxArrowRight} from "react-icons/all";
import AppContext, {Species} from "../core/app-context";
import {useContext} from "react"
import {FormattedMessage} from "react-intl"


export function SpeciesModal({species, onClose, isOpen}: { species?: Species, onClose: () => void, isOpen: boolean }) {

  const {language} = useContext(AppContext)

  if (!species) return <></>

  return (
    <>
      <Dialog.Root open={isOpen} onOpenChange={(e: { open: boolean }) => !e.open && onClose()} size="xl">
        <Portal>
          <Dialog.Backdrop/>
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>{language === 'nl' ? species.name_nl : language === 'la' ? species.name_latin : species.name}</Dialog.Header>
              <Dialog.CloseTrigger/>
              <Dialog.Body>
                <Link href={'https://ebird.org/species/' + species.code} target="_blank" rel="noopener noreferrer">
                  <Flex gap={2} mb={4} alignItems={'center'}>
                    <FormattedMessage defaultMessage={'View on eBird'} id={'view on eBird'}/>
                    <BsBoxArrowRight/>
                  </Flex>
                </Link>
                <SimpleGrid columns={{base: 1, md: 2, xl: 3}} gap={4}>
                  {species.images.map((img, key) => (
                    <Image width={'300px'} key={key} src={img.url} alt={species.name}/>
                  ))}
                </SimpleGrid>
              </Dialog.Body>

              <Dialog.Footer>
                <Button onClick={onClose} colorPalette="primary">
                  Close
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  );
}