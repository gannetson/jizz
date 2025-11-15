import {Outlet} from "react-router-dom";
import {
  Box,
  Button,
  Container,
  DrawerRoot,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerBackdrop,
  Flex,
  Heading, Image, Link, Menu,
  Text,
  useDisclosure,
  Avatar,
  HStack
} from "@chakra-ui/react";
import {GiHamburgerMenu} from "react-icons/all";
import {FaUserCircle} from "react-icons/fa";
import {FormattedMessage} from "react-intl";
import {useState, useEffect} from "react";
import SelectCountry from "../../../components/select-country";
import SelectLevel from "../../../components/select-level";
import {useContext} from "react";
import AppContext from "../../../core/app-context";
import {BirdrMenu} from "./menu";
import {UserMenu} from "./user-menu";
import {LoginModal} from "../../../components/auth/login-modal";
import {authService} from "../../../api/services/auth.service";
import {profileService, UserProfile} from "../../../api/services/profile.service";
import {MenuProvider} from "./menu-context";

const Layout = () => {
  const {open: isOpen, onOpen, onClose} = useDisclosure()
  const {open: isUserMenuOpen, onOpen: onUserMenuOpen, onClose: onUserMenuClose} = useDisclosure()
  const {open: isLoginModalOpen, onOpen: onLoginModalOpen, onClose: onLoginModalClose} = useDisclosure()
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState<'login' | 'register'>('login');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const {level, setLevel} = useContext(AppContext);

  useEffect(() => {
    const checkAuth = async () => {
      const token = authService.getAccessToken();
      setIsAuthenticated(!!token);
      
      if (token) {
        try {
          // Get user info from token
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUserEmail(payload.email || payload.username || null);
          
          // Load profile if authenticated
          try {
            const profileData = await profileService.getProfile();
            setProfile(profileData);
          } catch (e) {
            // Profile might not exist yet, that's okay
            setProfile(null);
          }
        } catch (e) {
          // Token might not be a JWT or might be invalid
          setUserEmail(null);
          setProfile(null);
        }
      } else {
        setUserEmail(null);
        setProfile(null);
      }
    };
    checkAuth();
    const interval = setInterval(checkAuth, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUserIconClick = () => {
    if (!isAuthenticated) {
      // If not logged in, open login modal directly
      setLoginModalMode('login');
      onLoginModalOpen();
    } else {
      // If logged in, open the drawer
      onUserMenuOpen();
    }
  };

  return (
    <MenuProvider onOpenMenu={onOpen} onOpenUserMenu={handleUserIconClick}>
      <Outlet/>
      
      {/* Left drawer - Main menu */}
      <DrawerRoot
        open={isOpen}
        placement='start'
        onOpenChange={(e: { open: boolean }) => !e.open && onClose()}
      >
        <DrawerBackdrop/>
        <DrawerContent height="100vh" maxHeight="100vh" display="flex" flexDirection="column" position="fixed" top={0} left={0} right="auto" bottom={0} bg="white">
          <DrawerCloseTrigger/>
          <DrawerHeader bg="white">Menu</DrawerHeader>

          <DrawerBody flex="1" overflowY="auto" minHeight={0} bg="white">
            <BirdrMenu/>
          </DrawerBody>

          <DrawerFooter bg="white">
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
                Contact <Link color='primary.500' href={'mailto:info@goedloek.nl'}>info@goedloek.nl</Link>
              </Box>
            </Flex>
          </DrawerFooter>
        </DrawerContent>
      </DrawerRoot>

      {/* Right drawer - User menu */}
      <DrawerRoot
        open={isUserMenuOpen}
        placement='end'
        onOpenChange={(e: { open: boolean }) => !e.open && onUserMenuClose()}
      >
        <DrawerBackdrop/>
        <DrawerContent height="100vh" maxHeight="100vh" display="flex" flexDirection="column" position="fixed" top={0} right={0} left="auto" bottom={0} bg="white">
          <DrawerCloseTrigger/>
          <DrawerHeader bg="white">
            <FormattedMessage id="account" defaultMessage="Account" />
          </DrawerHeader>

          <DrawerBody flex="1" overflowY="auto" minHeight={0} bg="white" p={6}>
            <UserMenu 
              onOpenLoginModal={(mode) => {
                setLoginModalMode(mode);
                onLoginModalOpen();
                onUserMenuClose();
              }}
            />
          </DrawerBody>
        </DrawerContent>
      </DrawerRoot>

      {/* Login Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={onLoginModalClose}
        defaultMode={loginModalMode}
      />
    </MenuProvider>
  )
};

export default Layout;

