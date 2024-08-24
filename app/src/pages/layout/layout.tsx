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
  Heading, Menu,
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
import {JizzMenu} from "./menu";

const Layout = () => {
  const {isOpen, onOpen, onClose} = useDisclosure()
  const {level, setLevel} = useContext(AppContext);

  return (
    <>
      <Outlet/>
      <Button variant="ghost" color={'gray.800'} p={2} onClick={onOpen} position={'fixed'} zIndex={20} top={2} left={2}>
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
            <JizzMenu />
          </DrawerBody>

          <DrawerFooter>
            Developed by GoedLoek
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  )
};

export default Layout;