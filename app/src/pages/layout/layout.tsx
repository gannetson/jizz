import {Outlet} from "react-router-dom";
import {
  Box,
  Button,
  Drawer,
  Flex,
  Heading, Image, Link, Menu,
  Text,
  useDisclosure
} from "@chakra-ui/react";
import {GiHamburgerMenu} from "react-icons/all";
import SelectCountry from "../../components/select-country";
import SelectLevel from "../../components/select-level";
import {useContext} from "react";
import AppContext from "../../core/app-context";
import {JizzMenu} from "./menu";

const Layout = () => {
  const {open, onOpen, onClose} = useDisclosure()
  const {level, setLevel} = useContext(AppContext);

  return (
    <>
      <Outlet/>
      <Button variant="ghost" color={'gray.800'} p={2} onClick={onOpen} position={'fixed'} zIndex={20} top={1} left={2}>
        <GiHamburgerMenu/>
      </Button>
      <Drawer.Root
        open={open}
        placement='start'
        onClose={onClose}
      >
        <Drawer.Backdrop />
        <Drawer.Content>
          <Drawer.CloseTrigger/>
          <Drawer.Header>Menu</Drawer.Header>

          <Drawer.Body>
            <JizzMenu/>
          </Drawer.Body>

          <Drawer.Footer>
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
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer.Root>
    </>
  )
};

export default Layout;