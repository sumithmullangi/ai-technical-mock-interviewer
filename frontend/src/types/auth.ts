export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  session_token: string;
  access_token?: string;
  token_type: string;
  expires_at: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (fullName: string, email: string, password: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export interface UserInterviewHistoryItem {
  status: string;
  session_id: string;
  user_id?: string | null;
  config: {
    role: string;
    difficulty: 'Junior' | 'Mid' | 'Senior' | 'Staff';
    primary_language?: 'Python' | 'Java' | 'SQL';
    primaryLanguage?: 'Python' | 'Java' | 'SQL';
    question_count?: number;
    questionCount?: number;
  };
  message?: string;
  created_at?: string;
  createdAt?: string;
}
