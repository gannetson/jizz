import React, {useEffect} from "react";
import {useNavigate, useParams} from "react-router-dom";
import axios from "axios";

export const AuthCallback = () => {

  const {provider} = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const getToken = async () => {
      debugger;
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");

      try {
        const response = await axios.post("/token/convert-token/", {
          grant_type: "convert_token",
          backend: provider,
          token: code,
        });

        // Save access token to localStorage or cookies
        localStorage.setItem("access_token", response.data.access_token);
        navigate("/start");
      } catch (error) {
        console.error("Error during token exchange:", error);
        alert("Authentication failed!");
      }
    };

    getToken();
  }, [provider, navigate]);

  return <div>Authenticating...</div>;
};
