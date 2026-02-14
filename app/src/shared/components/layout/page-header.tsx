import {ReactElement, ReactNode} from "react";
import {Flex, Button, HStack, Avatar, Text} from "@chakra-ui/react";
import {GiHamburgerMenu} from "react-icons/all";
import {FaUserCircle} from "react-icons/fa";
import {useMenu} from "./menu-context";
import {useState, useEffect} from "react";
import {authService} from "../../../api/services/auth.service";
import {profileService, UserProfile} from "../../../api/services/profile.service";

const PageHeader = ({children}: {children: ReactElement | ReactNode[]} ) => {
  const {onOpenMenu, onOpenUserMenu} = useMenu();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = authService.getAccessToken();
      setIsAuthenticated(!!token);
      
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUserEmail(payload.email || payload.username || null);
          
          try {
            const profileData = await profileService.getProfile();
            setProfile(profileData);
          } catch (e) {
            setProfile(null);
          }
        } catch (e) {
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

  return (
    <Flex
      direction={'row'}
      justifyContent='space-between'
      alignItems={'center'}
      pl={2} pr={2} py={2}
      backgroundColor={'primary.200'}
      position={'fixed'}
      width={'full'}
      zIndex={10}
      shadow={'md'}
      gap={2}
    >
      {/* Left menu button */}
      <Button variant="ghost" color={'gray.800'} p={2} onClick={onOpenMenu} size="sm">
        <GiHamburgerMenu size={20}/>
      </Button>
      
      {/* Center content (title) */}
      <Flex flex={1} justifyContent="center" alignItems="center">
        {children}
      </Flex>
      
      {/* Right user menu button */}
      <Button 
        variant="ghost" 
        color={'gray.800'} 
        p={2} 
        onClick={onOpenUserMenu} 
        size="sm"
      >
        {isAuthenticated ? (
          <HStack gap={2}>
            <Avatar.Root size="sm">
              {profile?.avatar_url ? (
                <Avatar.Image src={profile.avatar_url} alt={profile.username || userEmail || "User"} />
              ) : null}
              <Avatar.Fallback>
                {(profile?.username || userEmail || "User").charAt(0).toUpperCase()}
              </Avatar.Fallback>
            </Avatar.Root>
            <Text fontSize="sm" fontWeight="medium" display={{ base: 'none', md: 'block' }}>
              {profile?.username || userEmail || "User"}
            </Text>
          </HStack>
        ) : (
          <FaUserCircle size={20}/>
        )}
      </Button>
    </Flex>
  )
};

export default PageHeader;

