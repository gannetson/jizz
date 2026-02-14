import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { Box, Alert, AlertIndicator } from '@chakra-ui/react';
import { authService, AuthError } from '../../api/services/auth.service';
import { useState } from 'react';

// Define types for the response from Google login
interface GoogleLoginResponse {
  credential: string;
}

const GoogleAuth = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleLoginSuccess = async (response: GoogleLoginResponse) => {
    setError(null);
    try {
      const tokens = await authService.loginWithGoogleToken(response.credential);
      authService.storeTokens(tokens);
      navigate("/start");
    } catch (err: any) {
      const authError = err as AuthError;
      setError(authError.message || "Google login failed. Please try again.");
      console.error("Login failed", err);
    }
  };

  return (
    <Box>
      {error && (
        <Alert.Root status="error" mb={2}>
          <AlertIndicator />
          <Alert.Content>
            <Alert.Title fontSize="sm">{error}</Alert.Title>
          </Alert.Content>
        </Alert.Root>
      )}
      <GoogleLogin
        onSuccess={(response) => handleLoginSuccess(response as GoogleLoginResponse)}
        onError={() => {
          setError("Google login was cancelled or failed.");
          console.log("Login Failed");
        }}
      />
    </Box>
  );
};

export default GoogleAuth;
