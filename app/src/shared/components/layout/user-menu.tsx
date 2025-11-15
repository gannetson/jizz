import { Flex, Link, Button, VStack, Text, Separator, Avatar } from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";
import { authService } from "../../../api/services/auth.service";
import { profileService, UserProfile } from "../../../api/services/profile.service";

type UserMenuProps = {
  onOpenLoginModal?: (mode: 'login' | 'register') => void;
};

export const UserMenu = ({ onOpenLoginModal }: UserMenuProps) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const checkAuth = async () => {
    // Check if user is authenticated
    const token = authService.getAccessToken();
    setIsAuthenticated(!!token);
    
    // Try to get user info from token (if available)
    if (token) {
      try {
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

  useEffect(() => {
    checkAuth();
    // Check auth state periodically (every 5 seconds) to catch logout from other tabs
    const interval = setInterval(checkAuth, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    authService.clearTokens();
    setIsAuthenticated(false);
    setUserEmail(null);
    setProfile(null);
    navigate("/");
    // Refresh the page to clear any cached state
    window.location.reload();
  };

  if (!isAuthenticated) {
    return (
      <VStack gap={4} align="stretch" fontSize="lg">
        <Text fontSize="xl" fontWeight="bold" mb={2}>
          <FormattedMessage id="account" defaultMessage="Account" />
        </Text>
        <Button
          variant="ghost"
          justifyContent="flex-start"
          width="full"
          onClick={() => onOpenLoginModal?.('login')}
        >
          <FormattedMessage id="login" defaultMessage="Login" />
        </Button>
        <Button
          variant="ghost"
          justifyContent="flex-start"
          width="full"
          onClick={() => onOpenLoginModal?.('register')}
        >
          <FormattedMessage id="register" defaultMessage="Register" />
        </Button>
        <Separator />
        <Text fontSize="sm" color="gray.500">
          <FormattedMessage 
            id="login_to_save_progress" 
            defaultMessage="Login to save your progress and compete on leaderboards" 
          />
        </Text>
      </VStack>
    );
  }

  return (
    <VStack gap={4} align="stretch" fontSize="lg">
      <Flex direction="column" gap={2} mb={2}>
        <Flex alignItems="center" gap={3}>
          <Avatar.Root size="md">
            {profile?.avatar_url ? (
              <Avatar.Image src={profile.avatar_url} alt={profile.username || "User"} />
            ) : null}
            <Avatar.Fallback>
              {(profile?.username || userEmail || "User").charAt(0).toUpperCase()}
            </Avatar.Fallback>
          </Avatar.Root>
          <VStack align="start" gap={0}>
            <Text fontSize="xl" fontWeight="bold">
              {profile?.username || userEmail || "User"}
            </Text>
            {userEmail && (
              <Text fontSize="sm" color="gray.500">
                {userEmail}
              </Text>
            )}
          </VStack>
        </Flex>
      </Flex>
      
      <Separator />
      
      <Link href="/profile" textDecoration="none">
        <FormattedMessage id="view_profile" defaultMessage="View Profile" />
      </Link>
      <Link href="/scores" textDecoration="none">
        <FormattedMessage id="my_scores" defaultMessage="My Scores" />
      </Link>
      <Link href="/settings" textDecoration="none">
        <FormattedMessage id="settings" defaultMessage="Settings" />
      </Link>
      
      {(profile?.is_staff || profile?.is_superuser) && (
        <>
          <Separator />
          <Link href="/admin" target="_blank" textDecoration="none">
            <FormattedMessage id="admin" defaultMessage="Admin" />
          </Link>
        </>
      )}
      
      <Separator />
      
      <Button
        variant="ghost"
        colorPalette="error"
        onClick={handleLogout}
        justifyContent="flex-start"
        width="full"
      >
        <FormattedMessage id="logout" defaultMessage="Logout" />
      </Button>
    </VStack>
  );
};

export default UserMenu;

