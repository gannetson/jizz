import axios from '../axios-config';
import { authService } from './auth.service';

export interface UserProfile {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar: File | null;
  avatar_url: string | null;
  receive_updates: boolean;
  language: string;
  country_code: string | null;
  country_name: string | null;
  is_staff: boolean;
  is_superuser: boolean;
}

export interface ProfileUpdateData {
  username?: string;
  first_name?: string;
  last_name?: string;
  avatar?: File | null;
  receive_updates?: boolean;
  language?: string;
  country_code?: string | null;
}

class ProfileService {
  private baseURL = process.env.NODE_ENV === 'development' 
    ? 'http://127.0.0.1:8050' 
    : 'https://birdr.pro';

  /**
   * Get current user's profile
   */
  async getProfile(): Promise<UserProfile> {
    try {
      const response = await axios.get<UserProfile>(
        `${this.baseURL}/api/profile/`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(data: ProfileUpdateData): Promise<UserProfile> {
    try {
      const formData = new FormData();
      
      if (data.username) {
        formData.append('username', data.username);
      }
      if (data.first_name !== undefined) {
        formData.append('first_name', data.first_name || '');
      }
      if (data.last_name !== undefined) {
        formData.append('last_name', data.last_name || '');
      }
      if (data.avatar) {
        formData.append('avatar', data.avatar);
      } else if (data.avatar === null) {
        // To remove avatar, send empty string or null
        formData.append('avatar', '');
      }
      if (data.receive_updates !== undefined) {
        formData.append('receive_updates', data.receive_updates.toString());
      }
      if (data.language !== undefined) {
        formData.append('language', data.language);
      }
      if (data.country_code !== undefined) {
        formData.append('country_code', data.country_code || '');
      }

      const response = await axios.put<UserProfile>(
        `${this.baseURL}/api/profile/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (axios.isAxiosError(error) && error.response) {
      const message = error.response.data?.error || 
                     error.response.data?.detail || 
                     error.response.data?.message || 
                     'Failed to update profile.';
      return new Error(message);
    }
    return new Error('An unexpected error occurred.');
  }
}

export const profileService = new ProfileService();

