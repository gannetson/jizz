import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import axios from 'axios';

// Define types for the response from Google login and the response from your backend
interface GoogleLoginResponse {
  credential: string;
}

interface ApiResponse {
  access: string;
}

const clientId = "56451813101-pab6limmhoe0tqhtf0oel1tht3ja0rqq.apps.googleusercontent.com"

const GoogleAuth = () => {
  const handleLoginSuccess = async (response: GoogleLoginResponse) => {
    try {
      const res = await axios.post<ApiResponse>(
        "http://localhost:8050/token/convert-token/",
        { token: response.credential }
      );
      localStorage.setItem("jw_token", res.data.access);
      alert("Login successful!");
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <GoogleLogin onSuccess={(response) => handleLoginSuccess(response as GoogleLoginResponse)} onError={() => console.log("Login Failed")} />
    </GoogleOAuthProvider>
  );
};

export default GoogleAuth;
