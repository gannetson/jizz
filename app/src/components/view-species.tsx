import {
  Button,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  useDisclosure
} from "@chakra-ui/react";
import {BsImages} from "react-icons/all";
import AppContext, {Species} from "../core/app-context";
import {useContext} from "react"


export function ViewSpecies({species}: {species?:Species}) {

  const {language} = useContext(AppContext)
  const { isOpen, onOpen, onClose } = useDisclosure()

  if (!species) return <></>

  return (
    <>
      <Button variant={"link"} colorScheme={'orange'} onClick={onOpen} rightIcon={<BsImages />}>
        {language === 'nl' ? species.name_nl : species.name}
      </Button>

      <Modal isOpen={isOpen} onClose={onClose} size={"3xl"}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{language === 'nl' ? species.name_nl : language === 'la' ? species.name_latin : species.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
          <SimpleGrid columns={{base: 1, md: 2, xl : 3}} spacing={4}>
            {species.images.map((img, key) => (
              <Image width={'300px'} key={key} src={img.url} alt={species.name}/>
            ))}
          </SimpleGrid>
          </ModalBody>

          <ModalFooter>
            <Button onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}