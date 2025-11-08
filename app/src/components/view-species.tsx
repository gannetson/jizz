import {
  Box,
  Button, Flex,
  Image, Link,
  DialogRoot,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogBackdrop,
  SimpleGrid,
  useDisclosure
} from "@chakra-ui/react";
import {BsImages, BsBoxArrowRight} from "react-icons/all";
import AppContext, {Species} from "../core/app-context";
import {useContext} from "react"
import {FormattedMessage} from "react-intl"


export function ViewSpecies({species}: { species?: Species }) {

  const {language} = useContext(AppContext)
  const {open: isOpen, onOpen, onClose} = useDisclosure()

  if (!species) return <></>

  return (
    <>
      <Button variant={"outline"} size='sm' onClick={onOpen}>
        {language === 'nl' ? species.name_nl : species.name}
        <BsImages style={{ marginLeft: '8px' }} />
      </Button>

      <DialogRoot open={isOpen} onOpenChange={(e: { open: boolean }) => !e.open && onClose()} size="xl">
        <DialogBackdrop/>
        <DialogContent>
          <DialogHeader>{language === 'nl' ? species.name_nl : language === 'la' ? species.name_latin : species.name}</DialogHeader>
          <DialogCloseTrigger/>
          <DialogBody>
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
          </DialogBody>

          <DialogFooter>
            <Button onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </>
  );
}