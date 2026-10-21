export interface HealthStatus {
  status: 'ok' | 'error' | 'loading';
  app?: string;
  version?: string;
  error?: string;
}

export interface InterviewConfig {
  role: string;
  difficulty: 'Junior' | 'Mid' | 'Senior' | 'Staff';
  primaryLanguage: 'Python' | 'Java' | 'SQL';
  questionCount: number;
}

export interface ConfiguredSession {
  status: string;
  session_id?: string;
  sessionId?: string;
  config: InterviewConfig;
  message: string;
  created_at?: string;
  createdAt?: string;
}

export interface SubmissionState {
  status: 'idle' | 'submitting' | 'success' | 'error';
  errorMessage?: string;
  sessionData?: ConfiguredSession;
}
