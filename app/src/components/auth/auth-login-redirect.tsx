import React, { useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Box, Spinner, Text, VStack } from "@chakra-ui/react";

/**
 * When the SPA is wrongly served at /auth/login/:provider (e.g. production
 * serves index.html for all routes), redirect to the backend so Django handles OAuth.
 */
const getApiBaseUrl = () =>
  process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:8050"
    : (process.env.REACT_APP_API_URL || window.location.origin);

export const AuthLoginRedirect = () => {
  const { provider } = useParams<{ provider: string }>();
  const { search } = useLocation();

  useEffect(() => {
    const apiBase = getApiBaseUrl();
    const target = `${apiBase}/auth/login/${provider}/${search || ""}`;
    window.location.replace(target);
  }, [provider, search]);

  return (
    <Box display="flex" alignItems="center" justifyContent="center" minH="100vh">
      <VStack gap={4}>
        <Spinner size="lg" />
        <Text>Redirecting to login…</Text>
      </VStack>
    </Box>
  );
};
