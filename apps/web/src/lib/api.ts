const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface CreateRoomResponse {
  roomCode: string;
  inviteUrl: string;
  expiresAt: string;
}

export interface ApiError {
  error: string;
  timestamp?: string;
}

class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async createRoom(): Promise<CreateRoomResponse> {
    return this.request<CreateRoomResponse>('/api/room/create', {
      method: 'POST',
    });
  }

  async getRoomInfo(code: string) {
    return this.request(`/api/room/${code}`);
  }
}

export const apiService = new ApiService();
