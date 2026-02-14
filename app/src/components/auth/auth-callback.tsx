import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Spinner, Text, VStack } from "@chakra-ui/react";
import { authService, AuthError } from "../../api/services/auth.service";

export const AuthCallback = () => {
  const { provider } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const getToken = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");
      const accessToken = searchParams.get("access_token");
      const error = searchParams.get("error");

      // Handle OAuth errors
      if (error) {
        console.error("OAuth error:", error);
        alert(`Authentication failed: ${error}`);
        navigate("/login");
        return;
      }

      // If we already have an access token (Django might return it directly)
      if (accessToken) {
        const refreshToken = searchParams.get("refresh_token");
        if (refreshToken) {
          authService.storeTokens({
            access: accessToken,
            refresh: refreshToken,
          });
          navigate("/start");
          return;
        }
      }

      // If we have a code, exchange it for tokens
      if (code) {
        // Map URL provider name to Django backend name
        const backendMap: Record<string, 'google-oauth2' | 'apple-id'> = {
          google: 'google-oauth2',
          apple: 'apple-id',
        };

        const backend = provider ? backendMap[provider] : undefined;

        if (!backend) {
          console.error(`Unknown provider: ${provider}`);
          navigate("/login");
          return;
        }

        try {
          const tokens = await authService.convertOAuthToken(code, backend);
          authService.storeTokens(tokens);
          navigate("/start");
        } catch (error: any) {
          console.error("Error during token exchange:", error);
          const authError = error as AuthError;
          alert(authError.message || "Authentication failed!");
          navigate("/login");
        }
      } else {
        console.error("No authorization code or token received");
        navigate("/login");
      }
    };

    getToken();
  }, [provider, navigate]);

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minH="100vh"
    >
      <VStack gap={4}>
        <Spinner size="xl" colorPalette="primary" />
        <Text>Authenticating...</Text>
      </VStack>
    </Box>
  );
};
