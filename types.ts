export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
  ERROR = 'ERROR'
}

export type ModelMode = 'fast' | 'search' | 'deep';

export interface UserPreferences {
  city: string;
  experienceLevel: string;
  focusArea: string;
}

export interface UserInput {
  resumeText: string;
  city: string;
  experienceLevel: string;
  yearsExperience: string;
  mode: ModelMode;
  moreRoles: boolean;
  imageData?: string; // base64
  imageMimeType?: string;
}

export interface JobCardData {
  job_title: string;
  demand_level: "High" | "Medium" | "Low";
  match_score: number;
  experience_target: string;
  why_it_matches: string;
  what_you_do_in_this_job: string[];
  skills_you_already_have: string[];
  skills_to_build_next: string[];
  first_steps_to_get_started: string[];
  estimated_salary_expectation: string;
  recommended_certifications: string[];
  google_job_search_query: string;
  google_job_search_url: string;
  risk_or_caution_note: string;
}

export interface GroundingUrl {
  uri: string;
  title?: string;
}

export interface ResumeAudit {
  ats_compatibility_score: number;
  formatting_issues: string[];
  content_improvements: string[];
  key_strengths: string[];
}

export interface CareerAnalysis {
  summary_of_profile: string;
  flashcards: JobCardData[];
  overall_advice: string;
  disclaimer: string;
  grounding_urls?: GroundingUrl[];
  resume_audit?: ResumeAudit;
}

export interface InterviewQuestion {
  question: string;
  type: 'Technical' | 'Behavioral';
  tip: string;
}

export interface InterviewPrepData {
  questions: InterviewQuestion[];
  missing_keywords: string[];
}