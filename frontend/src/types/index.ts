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

export interface InterviewQuestion {
  question_number: number;
  questionNumber?: number;
  topic: string;
  difficulty: 'Junior' | 'Mid' | 'Senior' | 'Staff';
  question_text: string;
  questionText?: string;
  starter_code?: string | null;
  starterCode?: string | null;
  expected_concepts: string[];
  expectedConcepts?: string[];
}

export interface StartedSessionData {
  status: 'in_progress' | 'configured' | 'completed';
  session_id: string;
  sessionId?: string;
  current_question?: InterviewQuestion | null;
  currentQuestion?: InterviewQuestion | null;
  message: string;
  started_at: string;
  startedAt?: string;
  config?: InterviewConfig;
}

export interface LaunchSessionState {
  status: 'idle' | 'starting' | 'started' | 'error';
  errorMessage?: string;
  startedSession?: StartedSessionData;
}

export interface AnswerSubmitResponse {
  status: string;
  answer_id: string;
  answerId?: string;
  session_id: string;
  sessionId?: string;
  question_number: number;
  questionNumber?: number;
  message: string;
  submitted_at: string;
  submittedAt?: string;
}

export interface AnswerSubmissionState {
  status: 'idle' | 'submitting' | 'submitted' | 'error';
  errorMessage?: string;
  response?: AnswerSubmitResponse;
}

export interface EvaluationScores {
  correctness: number;
  technical_depth: number;
  technicalDepth?: number;
  edge_cases: number;
  edgeCases?: number;
  communication: number;
}

export interface AnswerEvaluationData {
  status: string;
  evaluation_id: string;
  evaluationId?: string;
  answer_id: string;
  answerId?: string;
  session_id: string;
  sessionId?: string;
  scores: EvaluationScores;
  overall_score: number;
  overallScore?: number;
  feedback: string;
  strengths: string[];
  missing_concepts: string[];
  missingConcepts?: string[];
  suggestions: string[];
  evaluated_at: string;
  evaluatedAt?: string;
}

export interface EvaluationState {
  status: 'idle' | 'evaluating' | 'evaluated' | 'error';
  errorMessage?: string;
  evaluation?: AnswerEvaluationData;
}

export interface FollowUpQuestionData {
  id: string;
  session_id: string;
  sessionId?: string;
  primary_question_number: number;
  primaryQuestionNumber?: number;
  follow_up_number: number;
  followUpNumber?: number;
  question_text: string;
  questionText?: string;
  expected_concepts: string[];
  expectedConcepts?: string[];
  probing_reason?: string;
  probingReason?: string;
  candidate_answer?: string | null;
  candidateAnswer?: string | null;
  created_at: string;
  createdAt?: string;
  answered_at?: string | null;
  answeredAt?: string | null;
}

export interface FollowUpState {
  status: 'idle' | 'generating' | 'answering' | 'error';
  errorMessage?: string;
  followUps: FollowUpQuestionData[];
}

export interface SessionAdvanceResponse {
  status: 'in_progress' | 'completed';
  session_id: string;
  sessionId?: string;
  current_question?: InterviewQuestion | null;
  currentQuestion?: InterviewQuestion | null;
  question_number: number;
  questionNumber?: number;
  total_questions: number;
  totalQuestions?: number;
  is_completed: boolean;
  isCompleted?: boolean;
  message: string;
  advanced_at: string;
  advancedAt?: string;
}

export interface ProgressionState {
  status: 'idle' | 'advancing' | 'error';
  errorMessage?: string;
}

export interface QuestionReportItemData {
  question_number: number;
  questionNumber?: number;
  topic: string;
  difficulty: string;
  question_text: string;
  questionText?: string;
  starter_code?: string | null;
  starterCode?: string | null;
  expected_concepts: string[];
  expectedConcepts?: string[];
  is_answered: boolean;
  isAnswered?: boolean;
  answer_text?: string | null;
  answerText?: string | null;
  submitted_at?: string | null;
  submittedAt?: string | null;
  is_evaluated: boolean;
  isEvaluated?: boolean;
  correctness_score?: number | null;
  correctnessScore?: number | null;
  technical_depth_score?: number | null;
  technicalDepthScore?: number | null;
  edge_cases_score?: number | null;
  edgeCasesScore?: number | null;
  communication_score?: number | null;
  communicationScore?: number | null;
  overall_score?: number | null;
  overallScore?: number | null;
  feedback?: string | null;
  strengths: string[];
  missing_concepts: string[];
  missingConcepts?: string[];
  suggestions: string[];
  follow_ups: Array<{
    id: string;
    follow_up_number: number;
    followUpNumber?: number;
    question_text: string;
    questionText?: string;
    expected_concepts: string[];
    expectedConcepts?: string[];
    candidate_answer?: string | null;
    candidateAnswer?: string | null;
    answered_at?: string | null;
    answeredAt?: string | null;
    probing_reason?: string | null;
  }>;
}

export interface ScoreBreakdownData {
  correctness_average?: number | null;
  correctnessAverage?: number | null;
  technical_depth_average?: number | null;
  technicalDepthAverage?: number | null;
  edge_cases_average?: number | null;
  edgeCasesAverage?: number | null;
  communication_average?: number | null;
  communicationAverage?: number | null;
  overall_score?: number | null;
  overallScore?: number | null;
}

export interface InterviewReportData {
  status: string;
  report_id: string;
  reportId?: string;
  session_id: string;
  sessionId?: string;
  role: string;
  difficulty: string;
  primary_language: string;
  primaryLanguage?: string;
  total_questions: number;
  totalQuestions?: number;
  answered_questions: number;
  answeredQuestions?: number;
  evaluated_questions: number;
  evaluatedQuestions?: number;
  scores: ScoreBreakdownData;
  overall_score?: number | null;
  overallScore?: number | null;
  performance_rating: string;
  performanceRating?: string;
  summary_narrative: string;
  summaryNarrative?: string;
  strengths: string[];
  improvement_areas: string[];
  improvementAreas?: string[];
  study_recommendations: string[];
  studyRecommendations?: string[];
  per_question_results: QuestionReportItemData[];
  perQuestionResults?: QuestionReportItemData[];
  created_at: string;
  createdAt?: string;
  updated_at: string;
  updatedAt?: string;
}

export interface ReportState {
  status: 'idle' | 'loading' | 'success' | 'error';
  errorMessage?: string;
  report?: InterviewReportData;
}
