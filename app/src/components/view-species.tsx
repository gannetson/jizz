import {
  Button, Dialog, DialogBackdrop, DialogBody, DialogCloseTrigger, DialogContent, DialogFooter, DialogHeader, DialogRoot,
  Image,
  SimpleGrid,
  useDisclosure
} from "@chakra-ui/react";
import {BsImages} from "react-icons/all";
import AppContext, {Species} from "../core/app-context";
import {useContext} from "react"


export function ViewSpecies({species}: {species?:Species}) {

  const {language} = useContext(AppContext)
  const { open, onOpen, onClose } = useDisclosure()

  if (!species) return <></>

  return (
    <>
      <Button variant={"plain"} colorScheme={'orange'} onClick={onOpen}>
        {language === 'nl' ? species.name_nl : species.name} <BsImages />
      </Button>

      <DialogRoot open={open} onClose={onClose} size={"xl"}>
        <DialogBackdrop />
        <DialogContent>
          <DialogHeader>{language === 'nl' ? species.name_nl : language === 'la' ? species.name_latin : species.name}</DialogHeader>
          <DialogCloseTrigger />
          <DialogBody>
          <SimpleGrid columns={{base: 1, md: 2, xl : 3}}>
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