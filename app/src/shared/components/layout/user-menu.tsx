import { Flex, Link, Button, VStack, Text, Separator, Avatar, Box } from "@chakra-ui/react";
import { useState, useEffect, useContext } from "react";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";
import { authService } from "../../../api/services/auth.service";
import { profileService, UserProfile, getAvatarUrl } from "../../../api/services/profile.service";
import AppContext from "../../../core/app-context";
import { AppLanguageSelect } from "../../../components/app-language-select";
import type { AppLocale } from "../../../i18n/app-locales";

type UserMenuProps = {
  onOpenLoginModal?: (mode: 'login' | 'register') => void;
};

export const UserMenu = ({ onOpenLoginModal }: UserMenuProps) => {
  const navigate = useNavigate();
  const { appLanguage, setAppLanguage } = useContext(AppContext);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const checkAuth = async () => {
    const token = authService.getAccessToken();
    if (!token) {
      setIsAuthenticated(false);
      setUserEmail(null);
      setProfile(null);
      return;
    }
    const ok = await authService.ensureValidAccessToken();
    const access = authService.getAccessToken();
    if (!ok || !access) {
      setIsAuthenticated(false);
      setUserEmail(null);
      setProfile(null);
      return;
    }
    setIsAuthenticated(true);
    try {
      const payload = JSON.parse(atob(access.split('.')[1]));
      setUserEmail(payload.email || payload.username || null);
      try {
        const profileData = await profileService.getProfile();
        setProfile(profileData);
      } catch {
        setProfile(null);
      }
    } catch {
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

  const languageToggle = (
    <Box>
      <Text fontSize="sm" color="gray.600" mb={1}>
        <FormattedMessage id="app_language" defaultMessage="App language" />
      </Text>
      <AppLanguageSelect
        value={appLanguage || 'en'}
        onChange={(locale: AppLocale) => setAppLanguage?.(locale)}
      />
    </Box>
  );

  if (!isAuthenticated) {
    return (
      <VStack gap={4} align="stretch" fontSize="lg">
        <Text fontSize="xl" fontWeight="bold" mb={2}>
          <FormattedMessage id="account" defaultMessage="Account" />
        </Text>
        {languageToggle}
        <Separator />
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
            {getAvatarUrl(profile) ? (
              <Avatar.Image src={getAvatarUrl(profile)!} alt={profile?.username || "User"} />
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
      
      {languageToggle}
      <Separator />
      
      <Link href="/my-games" textDecoration="none">
        <FormattedMessage id="my_games" defaultMessage="My Games" />
      </Link>
      <Link href="/checklist" textDecoration="none">
        <FormattedMessage id="checklist_title" defaultMessage="My Checklist" />
      </Link>
      <Link href="/trouble-spots" textDecoration="none">
        <FormattedMessage id="trouble_spots" defaultMessage="My tricky birds" />
      </Link>
      <Link href="/settings" textDecoration="none">
        <FormattedMessage id="settings" defaultMessage="Profile" />
      </Link>
      <Link href="/media-review" textDecoration="none">
        <FormattedMessage id="review_media" defaultMessage="Review media" />
      </Link>
      {profile?.country_code && (
        <Link href={`/media-review/${profile.country_code.toUpperCase()}`} textDecoration="none">
          <FormattedMessage
            id="review_country"
            defaultMessage="Review {country}"
            values={{ country: profile.country_name || profile.country_code }}
          />
        </Link>
      )}

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

