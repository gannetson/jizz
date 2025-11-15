import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  VStack,
  HStack,
  Input,
  Text,
  Heading,
  Avatar,
  Container,
  Field,
  Alert,
  AlertIndicator,
  Spinner,
  Link,
  Checkbox,
} from "@chakra-ui/react";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";
import { profileService, UserProfile, ProfileUpdateData } from "../api/services/profile.service";
import { authService } from "../api/services/auth.service";
import { Page } from "../shared/components/layout";
import { UseCountries } from "../user/use-countries";
import { UseLanguages } from "../user/use-languages";
import { ProfileLanguageSelect } from "../components/profile-language-select";
import { ProfileCountrySelect } from "../components/profile-country-select";

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { countries } = UseCountries();
  const { languages } = UseLanguages();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [receiveUpdates, setReceiveUpdates] = useState(false);
  const [language, setLanguage] = useState("en");
  const [countryCode, setCountryCode] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      // Check if user is authenticated
      if (!authService.getAccessToken()) {
        navigate("/login");
        return;
      }

      try {
        setLoading(true);
        const profileData = await profileService.getProfile();
        setProfile(profileData);
        setUsername(profileData.username);
        setAvatarPreview(profileData.avatar_url);
        setReceiveUpdates(profileData.receive_updates || false);
        setLanguage(profileData.language || "en");
        setCountryCode(profileData.country_code || null);
      } catch (err: any) {
        setError(err.message || "Failed to load profile");
        if (err.message?.includes("401") || err.message?.includes("Unauthorized")) {
          authService.clearTokens();
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const updateData: ProfileUpdateData = {};
      
      if (username !== profile?.username) {
        updateData.username = username;
      }
      
      if (avatarFile) {
        updateData.avatar = avatarFile;
      } else if (!avatarPreview && profile?.avatar_url) {
        // Avatar was removed (preview is null/empty but profile had an avatar)
        updateData.avatar = null;
      }

      if (receiveUpdates !== (profile?.receive_updates || false)) {
        updateData.receive_updates = receiveUpdates;
      }

      if (language !== (profile?.language || "en")) {
        updateData.language = language;
      }

      if (countryCode !== (profile?.country_code || null)) {
        updateData.country_code = countryCode;
      }

      if (Object.keys(updateData).length === 0) {
        setSuccess("No changes to save");
        setSaving(false);
        return;
      }

      const updatedProfile = await profileService.updateProfile(updateData);
      setProfile(updatedProfile);
      setAvatarPreview(updatedProfile.avatar_url);
      setAvatarFile(null);
      setReceiveUpdates(updatedProfile.receive_updates || false);
      setLanguage(updatedProfile.language || "en");
      setCountryCode(updatedProfile.country_code || null);
      setSuccess("Profile updated successfully!");
      
      // Refresh auth state to update username in token if changed
      if (updateData.username) {
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Page>
        <Page.Header>
          <Heading color={'gray.800'} size={'lg'} m={0}>
            <FormattedMessage id="profile" defaultMessage="Profile" />
          </Heading>
        </Page.Header>
        <Page.Body>
          <VStack gap={4}>
            <Spinner size="xl" colorPalette="primary" />
            <Text>Loading profile...</Text>
          </VStack>
        </Page.Body>
      </Page>
    );
  }

  return (
    <Page>
      <Page.Header>
        <Heading color={'gray.800'} size={'lg'} m={0}>
          <FormattedMessage id="profile" defaultMessage="Profile" />
        </Heading>
      </Page.Header>
      <Page.Body>
        <Container maxW="md" py={8}>
          <VStack gap={6} align="stretch">

        {error && (
          <Alert.Root status="error">
            <AlertIndicator />
            <Alert.Content>
              <Alert.Title>{error}</Alert.Title>
            </Alert.Content>
          </Alert.Root>
        )}

        {success && (
          <Alert.Root status="info">
            <AlertIndicator />
            <Alert.Content>
              <Alert.Title>{success}</Alert.Title>
            </Alert.Content>
          </Alert.Root>
        )}

        <Box as="form" onSubmit={handleSubmit}>
          <VStack gap={6} align="stretch">
            {/* Avatar Section */}
            <VStack gap={4}>
              <Avatar.Root size="2xl" style={{ width: '120px', height: '120px' }}>
                {avatarPreview ? (
                  <Avatar.Image src={avatarPreview} alt={username || "User"} />
                ) : null}
                <Avatar.Fallback>
                  {(username || "User").charAt(0).toUpperCase()}
                </Avatar.Fallback>
              </Avatar.Root>
              
              <Box position="relative">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  display="none"
                  id="avatar-upload"
                />
                <Link
                  as="button"
                  type="button"
                  colorPalette="primary"
                  textDecoration="underline"
                  cursor="pointer"
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                >
                  <FormattedMessage id="change_avatar" defaultMessage="Change Avatar" />
                </Link>
              </Box>
            </VStack>

            {/* Username Field */}
            <Field.Root>
              <Field.Label>
                <FormattedMessage id="username" defaultMessage="Username" />
              </Field.Label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
            </Field.Root>

            {/* Email (read-only) */}
            <Field.Root>
              <Field.Label>
                <FormattedMessage id="email" defaultMessage="Email" />
              </Field.Label>
              <Input
                type="email"
                value={profile?.email || ""}
                disabled
                bg="gray.50"
              />
              <Text fontSize="sm" color="gray.500">
                <FormattedMessage 
                  id="email_cannot_be_changed" 
                  defaultMessage="Email cannot be changed" 
                />
              </Text>
            </Field.Root>

            {/* Receive Updates Checkbox */}
            <Field.Root>
              <Checkbox.Root
                checked={receiveUpdates}
                onCheckedChange={(e: { checked: boolean }) => {
                  setReceiveUpdates(e.checked === true);
                }}
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control cursor="pointer">
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <Checkbox.Label>
                  <FormattedMessage 
                    id="receive_updates" 
                    defaultMessage="Receive updates about Birdr app" 
                  />
                </Checkbox.Label>
              </Checkbox.Root>
            </Field.Root>

            {/* Language Preference */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                <FormattedMessage id="preferred_language" defaultMessage="Preferred Language" />
              </Text>
              <ProfileLanguageSelect
                languages={languages}
                value={language}
                onChange={setLanguage}
              />
            </Box>

            {/* Country Preference */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                <FormattedMessage id="preferred_country" defaultMessage="Preferred Country" />
              </Text>
              <ProfileCountrySelect
                countries={countries.filter((c) => !c.code.includes('NL-NH'))}
                value={countryCode}
                onChange={setCountryCode}
              />
            </Box>

            {/* Submit Button */}
            <Button
              type="submit"
              colorPalette="primary"
              width="full"
              loading={saving}
              loadingText="Saving..."
            >
              <FormattedMessage id="save_changes" defaultMessage="Save Changes" />
            </Button>
          </VStack>
        </Box>
          </VStack>
        </Container>
      </Page.Body>
    </Page>
  );
};

export default ProfilePage;

