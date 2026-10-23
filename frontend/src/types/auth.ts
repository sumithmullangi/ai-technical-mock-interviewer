export interface UserPreferences {
  theme?: 'light' | 'dark';
  default_mode?: 'voice' | 'text';
  auto_play_voice?: boolean;
  question_count?: number;
  difficulty?: 'Junior' | 'Mid' | 'Senior' | 'Staff';
  preferred_language?: 'Python' | 'Java' | 'SQL';
  preferred_role?: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  target_role?: string | null;
  experience_level?: string | null;
  preferences?: UserPreferences | null;
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
  updateProfile: (data: {
    full_name?: string;
    target_role?: string;
    experience_level?: string;
    preferences?: UserPreferences;
  }) => Promise<{ success: boolean; error?: string }>;
  changePassword: (data: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export interface UserInterviewHistoryItem {
  status: string;
  session_id: string;
  user_id?: string | null;
  score?: number | null;
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

