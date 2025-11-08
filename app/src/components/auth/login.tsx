import React from "react";
import {Button, VStack} from "@chakra-ui/react";
import GoogleAuth from "./google"
import {GoogleLogin} from "@react-oauth/google"

export const Login = () => {

  const handleSocialLogin = async (provider: string) => {
    const redirectUri = `${window.location.origin}/login/${provider}`;
    debugger
    const authUrl = `/auth/login/${provider}/?redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = authUrl;
  };

  return (
    <VStack gap={4}>
      <Button colorPalette="error" onClick={() => handleSocialLogin("google-oauth2")}>
        Login with Google
      </Button>
      <GoogleAuth />
      <Button colorPalette="blackAlpha" onClick={() => handleSocialLogin("apple")}>
        Login with Apple
      </Button>
      <Button colorPalette="blue" onClick={() => handleSocialLogin("microsoft")}>
        Login with Microsoft
      </Button>
    </VStack>
  );
};
