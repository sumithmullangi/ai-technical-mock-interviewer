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
