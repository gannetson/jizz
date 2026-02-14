import axios from '../axios-config';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  username?: string;
}

export interface TokenResponse {
  access: string;
  refresh: string;
  access_token?: string;
  refresh_token?: string;
}

export interface AuthError {
  message: string;
  details?: any;
}

class AuthService {
  // Use REACT_APP_API_URL in production so OAuth start URL hits the backend (not the SPA).
  // If unset in production, defaults to same origin (requires server to proxy /auth/ to Django).
  private baseURL = process.env.NODE_ENV === 'development'
    ? 'http://127.0.0.1:8050'
    : (process.env.REACT_APP_API_URL || 'https://birdr.pro');

  /**
   * Login with email and password using Django JWT
   */
  async loginWithEmail(credentials: LoginCredentials): Promise<TokenResponse> {
    try {
      const response = await axios.post<TokenResponse>(
        `${this.baseURL}/token/`,
        {
          username: credentials.email,
          password: credentials.password,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        access: response.data.access,
        refresh: response.data.refresh,
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Register a new user with email and password
   */
  async register(credentials: RegisterCredentials): Promise<TokenResponse> {
    try {
      const response = await axios.post<any>(
        `${this.baseURL}/api/register/`,
        {
          email: credentials.email,
          password: credentials.password,
          username: credentials.username || credentials.email,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        access: response.data.access,
        refresh: response.data.refresh,
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Get the OAuth redirect URL for social login
   * This redirects to Django's social auth endpoint
   */
  getSocialLoginUrl(provider: 'google-oauth2' | 'apple-id', redirectUri: string): string {
    return `${this.baseURL}/auth/login/${provider}/?redirect_uri=${encodeURIComponent(redirectUri)}`;
  }

  /**
   * Convert OAuth code to JWT tokens using Django's convert-token endpoint
   * This is called from the OAuth callback
   */
  async convertOAuthToken(code: string, provider: 'google-oauth2' | 'apple-id'): Promise<TokenResponse> {
    try {
      const response = await axios.post<any>(
        `${this.baseURL}/token/convert-token/`,
        {
          grant_type: 'convert_token',
          backend: provider,
          token: code,
        }
      );

      return {
        access: response.data.access_token || response.data.access,
        refresh: response.data.refresh_token || response.data.refresh,
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Login with Google OAuth token (alternative method if using Google Sign-In JS SDK)
   * This uses the custom GoogleLoginView endpoint
   */
  async loginWithGoogleToken(token: string): Promise<TokenResponse> {
    try {
      const response = await axios.post<TokenResponse>(
        `${this.baseURL}/api/google-login/`,
        {
          token: token,
        }
      );

      return {
        access: response.data.access,
        refresh: response.data.refresh,
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Request password reset - sends email with reset link
   */
  async requestPasswordReset(email: string, frontendUrl?: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseURL}/api/password-reset/`,
        {
          email,
          frontend_url: frontendUrl || window.location.origin,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Confirm password reset with token and set new password
   */
  async confirmPasswordReset(uid: string, token: string, newPassword: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseURL}/api/password-reset/confirm/`,
        {
          uid,
          token,
          new_password: newPassword,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Refresh access token using refresh token
   * Note: rest_framework_simplejwt returns {"access": "..."} not {"access_token": "..."}
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const response = await axios.post<{ access: string; refresh?: string }>(
        `${this.baseURL}/token/refresh/`,
        {
          refresh: refreshToken,
        }
      );

      // rest_framework_simplejwt returns {"access": "..."}
      return {
        access: response.data.access,
        refresh: response.data.refresh || refreshToken, // Keep old refresh token if new one not provided
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Store tokens in localStorage
   */
  storeTokens(tokens: TokenResponse): void {
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    localStorage.setItem('jw_token', tokens.access); // For backward compatibility
  }

  /**
   * Get stored access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem('access_token') || localStorage.getItem('jw_token');
  }

  /**
   * Get stored refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  /**
   * Clear stored tokens
   */
  clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('jw_token');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  private handleError(error: any): AuthError {
    if (error.response) {
      // Server responded with error
      const message = error.response.data?.detail || 
                     error.response.data?.error || 
                     error.response.data?.message ||
                     'Authentication failed';
      return {
        message,
        details: error.response.data,
      };
    } else if (error.request) {
      // Request made but no response
      return {
        message: 'Network error. Please check your connection.',
      };
    } else {
      // Something else happened
      return {
        message: error.message || 'An unexpected error occurred',
      };
    }
  }
}

export const authService = new AuthService();

