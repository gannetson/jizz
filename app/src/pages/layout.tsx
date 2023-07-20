import {Outlet} from "react-router-dom";
import {
  Button,
  Container,
  Drawer, DrawerBody,
  DrawerCloseButton,
  DrawerContent, DrawerFooter,
  DrawerHeader,
  DrawerOverlay, Flex, Heading, HStack, Link, Radio, RadioGroup, Text, useDisclosure, VStack
} from "@chakra-ui/react";
import {GiHamburgerMenu} from "react-icons/all";


export interface PageProperties {
  level?: string
  setLevel?: (level: string) => void
}


const Layout = ({level, setLevel}: PageProperties) => {
  const {isOpen, onOpen, onClose} = useDisclosure()

  return (
    <>
      <Button variant="ghost" onClick={onOpen}>
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
            <Heading py={6} size={'md'}>Country</Heading>
            <Flex direction={'column'}  gap={4}>
              <Link href={'/countries/TH'}>Thailand</Link>
              <Link href={'/countries/LA'}>Laos</Link>
              <Link href={'/countries/VN'}>Vietnam</Link>
              <Link href={'/countries/KH'}>Cambodia</Link>
              <Link href={'/countries/QA'}>Qatar</Link>
            </Flex>
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