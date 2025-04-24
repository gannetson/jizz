import {Outlet} from "react-router-dom";
import {
  Box,
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
  Heading, Image, Link, Menu,
  Radio,
  RadioGroup,
  Text,
  useDisclosure
} from "@chakra-ui/react";
import {GiHamburgerMenu} from "react-icons/all";
import SelectCountry from "../../components/select-country";
import SelectLevel from "../../components/select-level";
import {useContext} from "react";
import AppContext from "../../core/app-context";
import {BirdrMenu} from "./menu";

const Layout = () => {
  const {isOpen, onOpen, onClose} = useDisclosure()
  const {level, setLevel} = useContext(AppContext);

  return (
    <>
      <Outlet/>
      <Button variant="ghost" color={'gray.800'} p={2} onClick={onOpen} position={'fixed'} zIndex={20} top={1} left={2}>
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
            <BirdrMenu/>
          </DrawerBody>

          <DrawerFooter>
            <Flex direction={'column'} gap={4}>
              <Box mb={10}>
                All data & images
                <Link href='https://ebird.org'>
                  <Image _dark={{filter: 'invert(100%)'}} width='80px' src={'/images/ebird.svg'}/>
                </Link>
              </Box>
              <Box>
                Developed by <b>GoedLoek</b>
              </Box>
              <Box>
                Contact <Link color='orange.500' href={'mailto:info@goedloek.nl'}>info@goedloek.nl</Link>
              </Box>
            </Flex>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  )
};

export default Layout;