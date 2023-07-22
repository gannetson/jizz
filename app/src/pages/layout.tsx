import {Outlet} from "react-router-dom";
import {
  Button,
  Container,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Heading,
  Radio,
  RadioGroup,
  Text,
  useDisclosure
} from "@chakra-ui/react";
import {GiHamburgerMenu} from "react-icons/all";
import SelectCountry from "../components/select-country";


export interface Country {
  code: string
  name: string
}

export interface PageProperties {
  level?: string
  setLevel?: (level: string) => void
  country?: Country
  setCountry?: (country:Country) => void
}


const Layout = ({level, setLevel, country, setCountry}: PageProperties) => {
  const {isOpen, onOpen, onClose} = useDisclosure()

  return (
    <>
      <Button variant="ghost" position="absolute" p={6} onClick={onOpen}>
        <GiHamburgerMenu/>
      </Button>
      <Drawer
        isOpen={isOpen}
        placement='left'
        onClose={onClose}
      >
        <DrawerOverlay/>
        <DrawerContent>
          <DrawerCloseButton/>
          <DrawerHeader>Menu</DrawerHeader>

          <DrawerBody>
            <SelectCountry country={country} setCountry={setCountry} />
            <Heading py={6} size={'md'}>Level</Heading>
            <RadioGroup onChange={setLevel} value={level}>
              <Flex direction={'column'} gap={4}>
                <Radio value='beginner'>
                  <Text>Beginner</Text>
                  <Text fontSize={'xs'}>Easy multiple choice</Text>
                </Radio>
                <Radio value='advanced'>
                  <Text>Advanced</Text>
                  <Text fontSize={'xs'}>Hard multiple choice</Text>
                </Radio>
                <Radio value='expert'>
                  <Text>Expert</Text>
                  <Text fontSize={'xs'}>Text input</Text>
                </Radio>
              </Flex>
            </RadioGroup>

          </DrawerBody>

          <DrawerFooter>
            Developed by GoedLoek
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <Container>
        <Outlet/>
      </Container>
    </>
  )
};

export default Layout;