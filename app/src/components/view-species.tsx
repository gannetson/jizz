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
import {Species} from "../pages/country";


export function ViewSpecies({species}: {species:Species}) {

  const { isOpen, onOpen, onClose } = useDisclosure()
  return (
    <>
      <Button variant={"link"} onClick={onOpen}>
        {species.name}
      </Button>

      <Modal isOpen={isOpen} onClose={onClose} size={"3xl"}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{species.name}</ModalHeader>
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