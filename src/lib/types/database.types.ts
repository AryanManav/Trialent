export type Json =
  string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "candidate" | "company" | "admin";

export type ProjectStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "applications_open"
  | "candidate_selected"
  | "in_progress"
  | "submitted"
  | "under_review"
  | "revision_requested"
  | "completed"
  | "cancelled";

export type ApplicationStatus =
  | "submitted"
  | "reviewing"
  | "shortlisted"
  | "interview"
  | "selected"
  | "rejected"
  | "withdrawn";

/**
 * Build only: a paid project for one candidate. Hire only: a free job posting.
 * Freelance: a paid contract, delivered and approved milestone by milestone.
 */
export type OpportunityType = "build" | "hire" | "freelance";
/** Freelance: a fixed price split into milestones, or an hourly rate. */
export type PricingModel = "fixed" | "hourly";
/** 'planned' milestones come with a fixed-price brief; 'hours' are weekly logs. */
export type MilestoneKind = "planned" | "hours";
export type MilestoneStatus =
  "planned" | "submitted" | "changes_requested" | "approved" | "paid" | "cancelled";
export type JobType = "full_time" | "part_time" | "internship" | "contract";
export type WorkArrangement = "remote" | "hybrid" | "onsite";
export type ExperienceLevel = "entry" | "junior" | "mid" | "senior";

/** What kind of work a hire-only role's assessment asks for. */
export type AssessmentType =
  | "coding"
  | "frontend"
  | "backend"
  | "full_stack"
  | "design"
  | "data"
  | "technical"
  | "other";

/** A candidate's hiring assessment: started, or handed in (final). */
export type AssessmentStatus = "in_progress" | "submitted";

/** The topic a project is listed under in Browse. */
export type ProjectCategory =
  | "frontend"
  | "backend"
  | "full_stack"
  | "mobile"
  | "ai_ml"
  | "data"
  | "devops"
  | "design"
  | "other";

export type CompanyWorkStyle = "remote" | "hybrid" | "onsite";

/** Whether the company is recruiting, or only wants the work built. */
export type ProjectPurpose = "hire" | "build";

/** Each selected candidate's own work cycle (project_selections.status). */
export type SelectionWorkStatus =
  | "in_progress"
  | "submitted"
  | "under_review"
  | "revision_requested"
  | "completed"
  | "not_accepted"
  | "cancelled";

export type ProjectWorkMode = "local" | "in_app";

export type ProjectMessageAuthorRole = "candidate" | "company";

export type SubmissionStatus =
  "submitted" | "under_review" | "revision_requested" | "accepted" | "rejected";

export type ProjectOutcomeType =
  | "no_hire"
  | "interview"
  | "hire"
  | "talent_pool"
  | "candidate_withdrew"
  | "project_cancelled";

export type PaymentStatus =
  "pending" | "paid" | "processing" | "completed" | "refunded" | "failed" | "disputed";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          avatar_url: string | null;
          email_verified: boolean;
          terms_version: string | null;
          terms_accepted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: UserRole;
          avatar_url?: string | null;
          email_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: UserRole;
          avatar_url?: string | null;
          email_verified?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      candidate_profiles: {
        Row: {
          id: string;
          user_id: string;
          is_discoverable: boolean;
          headline: string | null;
          bio: string | null;
          location: string | null;
          education: string | null;
          graduation_year: number | null;
          resume_url: string | null;
          github_url: string | null;
          portfolio_url: string | null;
          linkedin_url: string | null;
          banner_url: string | null;
          availability: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          is_discoverable?: boolean;
          headline?: string | null;
          bio?: string | null;
          location?: string | null;
          education?: string | null;
          graduation_year?: number | null;
          resume_url?: string | null;
          github_url?: string | null;
          portfolio_url?: string | null;
          linkedin_url?: string | null;
          banner_url?: string | null;
          availability?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          is_discoverable?: boolean;
          headline?: string | null;
          bio?: string | null;
          location?: string | null;
          education?: string | null;
          graduation_year?: number | null;
          resume_url?: string | null;
          github_url?: string | null;
          portfolio_url?: string | null;
          linkedin_url?: string | null;
          banner_url?: string | null;
          availability?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "candidate_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      candidate_activity: {
        Row: {
          id: string;
          candidate_id: string;
          activity_type: string;
          activity_date: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          activity_type: string;
          activity_date?: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          activity_type?: string;
          activity_date?: string;
          metadata?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "candidate_activity_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidate_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      candidate_skills: {
        Row: {
          id: string;
          candidate_id: string;
          skill_name: string;
          skill_level: string;
          years_experience: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          skill_name: string;
          skill_level?: string;
          years_experience?: number;
          created_at?: string;
        };
        Update: {
          skill_name?: string;
          skill_level?: string;
          years_experience?: number;
        };
        Relationships: [
          {
            foreignKeyName: "candidate_skills_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidate_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      candidate_projects: {
        Row: {
          id: string;
          candidate_id: string;
          title: string;
          description: string;
          technologies: string[];
          repository_url: string | null;
          live_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          title: string;
          description: string;
          technologies?: string[];
          repository_url?: string | null;
          live_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          technologies?: string[];
          repository_url?: string | null;
          live_url?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "candidate_projects_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidate_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      companies: {
        Row: {
          id: string;
          name: string;
          website: string | null;
          description: string | null;
          industry: string | null;
          company_size: string | null;
          location: string | null;
          logo_url: string | null;
          verified: boolean;
          tech_stack: string[];
          work_style: CompanyWorkStyle | null;
          perks: string | null;
          hiring_process: string | null;
          founded_year: number | null;
          linkedin_url: string | null;
          github_url: string | null;
          careers_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          website?: string | null;
          description?: string | null;
          industry?: string | null;
          company_size?: string | null;
          location?: string | null;
          logo_url?: string | null;
          verified?: boolean;
          tech_stack?: string[];
          work_style?: CompanyWorkStyle | null;
          perks?: string | null;
          hiring_process?: string | null;
          founded_year?: number | null;
          linkedin_url?: string | null;
          github_url?: string | null;
          careers_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          website?: string | null;
          description?: string | null;
          industry?: string | null;
          company_size?: string | null;
          location?: string | null;
          logo_url?: string | null;
          verified?: boolean;
          tech_stack?: string[];
          work_style?: CompanyWorkStyle | null;
          perks?: string | null;
          hiring_process?: string | null;
          founded_year?: number | null;
          linkedin_url?: string | null;
          github_url?: string | null;
          careers_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      company_members: {
        Row: {
          id: string;
          company_id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          user_id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          role?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          company_id: string;
          title: string;
          slug: string;
          description: string;
          problem_statement: string;
          context: string;
          requirements: string[];
          deliverables: string[];
          acceptance_criteria: string[];
          evaluation_criteria: string[];
          work_mode: ProjectWorkMode;
          max_applicants: number | null;
          withdrawal_reason: string | null;
          purpose: ProjectPurpose;
          openings: number;
          category: ProjectCategory;
          expected_hours: number;
          payment_amount: number;
          currency: string;
          application_deadline: string;
          project_deadline: string;
          status: ProjectStatus;
          opportunity_type: OpportunityType;
          job_type: JobType | null;
          work_arrangement: WorkArrangement | null;
          job_location: string | null;
          experience_level: ExperienceLevel | null;
          compensation: string | null;
          responsibilities: string[];
          nice_to_have: string[];
          closed_at: string | null;
          assessment_title: string | null;
          assessment_type: AssessmentType | null;
          assessment_description: string | null;
          assessment_requirements: string[];
          assessment_technologies: string[];
          pricing_model: PricingModel | null;
          hourly_rate: number | null;
          hours_per_week: number | null;
          duration_weeks: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          title: string;
          slug: string;
          description: string;
          problem_statement: string;
          context: string;
          requirements?: string[];
          deliverables?: string[];
          acceptance_criteria?: string[];
          evaluation_criteria?: string[];
          work_mode?: ProjectWorkMode;
          max_applicants?: number | null;
          withdrawal_reason?: string | null;
          purpose?: ProjectPurpose;
          openings?: number;
          category?: ProjectCategory;
          expected_hours?: number;
          payment_amount: number;
          currency?: string;
          application_deadline: string;
          project_deadline: string;
          status?: ProjectStatus;
          opportunity_type?: OpportunityType;
          job_type?: JobType | null;
          work_arrangement?: WorkArrangement | null;
          job_location?: string | null;
          experience_level?: ExperienceLevel | null;
          compensation?: string | null;
          responsibilities?: string[];
          nice_to_have?: string[];
          assessment_title?: string | null;
          assessment_type?: AssessmentType | null;
          assessment_description?: string | null;
          assessment_requirements?: string[];
          assessment_technologies?: string[];
          pricing_model?: PricingModel | null;
          hourly_rate?: number | null;
          hours_per_week?: number | null;
          duration_weeks?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          slug?: string;
          description?: string;
          problem_statement?: string;
          context?: string;
          requirements?: string[];
          deliverables?: string[];
          acceptance_criteria?: string[];
          evaluation_criteria?: string[];
          work_mode?: ProjectWorkMode;
          max_applicants?: number | null;
          withdrawal_reason?: string | null;
          purpose?: ProjectPurpose;
          openings?: number;
          category?: ProjectCategory;
          expected_hours?: number;
          payment_amount?: number;
          currency?: string;
          application_deadline?: string;
          project_deadline?: string;
          status?: ProjectStatus;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_skills: {
        Row: {
          id: string;
          project_id: string;
          skill_name: string;
          is_required: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          skill_name: string;
          is_required?: boolean;
          created_at?: string;
        };
        Update: {
          skill_name?: string;
          is_required?: boolean;
        };
        Relationships: [];
      };
      applications: {
        Row: {
          id: string;
          project_id: string;
          candidate_id: string;
          cover_message: string;
          relevant_experience: string | null;
          status: ApplicationStatus;
          decision_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          candidate_id: string;
          cover_message: string;
          relevant_experience?: string | null;
          status?: ApplicationStatus;
          decision_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          cover_message?: string;
          relevant_experience?: string | null;
          status?: ApplicationStatus;
          decision_note?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      assessment_submissions: {
        Row: {
          id: string;
          application_id: string;
          project_id: string;
          candidate_id: string;
          status: AssessmentStatus;
          repository_url: string | null;
          live_url: string | null;
          notes: string | null;
          completed_requirements: number[];
          started_at: string;
          submitted_at: string | null;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      freelance_milestones: {
        Row: {
          id: string;
          project_id: string;
          position: number;
          kind: MilestoneKind;
          title: string;
          description: string | null;
          amount: number;
          hours: number | null;
          period_start: string | null;
          due_date: string | null;
          status: MilestoneStatus;
          work_url: string | null;
          work_note: string | null;
          review_note: string | null;
          submitted_at: string | null;
          reviewed_at: string | null;
          paid_at: string | null;
          payment_confirmed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        /** Only the plan, while posting; everything after goes through functions. */
        Insert: {
          project_id: string;
          position: number;
          kind?: "planned";
          title: string;
          description?: string | null;
          amount: number;
          due_date?: string | null;
        };
        Update: never;
        Relationships: [];
      };
      project_selections: {
        Row: {
          id: string;
          project_id: string;
          candidate_id: string;
          selected_by: string | null;
          selected_at: string;
          status: SelectionWorkStatus;
        };
        Insert: {
          id?: string;
          project_id: string;
          candidate_id: string;
          selected_by?: string | null;
          selected_at?: string;
          status?: SelectionWorkStatus;
        };
        Update: {
          status?: SelectionWorkStatus;
        };
        Relationships: [];
      };
      project_submissions: {
        Row: {
          id: string;
          project_id: string;
          candidate_id: string;
          repository_url: string;
          deployment_url: string | null;
          submission_notes: string;
          submitted_at: string;
          status: SubmissionStatus;
          review_note: string | null;
          reopen_project: boolean | null;
          reviewed_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          candidate_id: string;
          repository_url: string;
          deployment_url?: string | null;
          submission_notes: string;
          submitted_at?: string;
          status?: SubmissionStatus;
          review_note?: string | null;
          reopen_project?: boolean | null;
          reviewed_at?: string | null;
        };
        Update: {
          repository_url?: string;
          deployment_url?: string | null;
          submission_notes?: string;
          status?: SubmissionStatus;
          review_note?: string | null;
          reopen_project?: boolean | null;
          reviewed_at?: string | null;
        };
        Relationships: [];
      };
      submission_attachments: {
        Row: {
          id: string;
          submission_id: string;
          storage_path: string;
          file_name: string;
          size_bytes: number;
          content_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          storage_path: string;
          file_name: string;
          size_bytes: number;
          content_type?: string | null;
          created_at?: string;
        };
        Update: {
          [_ in never]: never;
        };
        Relationships: [];
      };
      project_messages: {
        Row: {
          id: string;
          project_id: string;
          candidate_id: string;
          author_id: string | null;
          author_role: ProjectMessageAuthorRole;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          candidate_id: string;
          author_id?: string | null;
          author_role: ProjectMessageAuthorRole;
          body: string;
          created_at?: string;
        };
        Update: {
          [_ in never]: never;
        };
        Relationships: [];
      };
      project_feedback: {
        Row: {
          id: string;
          project_id: string;
          candidate_id: string;
          company_id: string;
          reviewer_id: string | null;
          requirements_completed: boolean;
          technical_quality: string;
          completeness: string;
          testing_quality: string;
          documentation_quality: string;
          deadline_met: boolean;
          revisions_required: number;
          written_feedback: string;
          what_was_missing: string | null;
          would_interview_or_hire: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          candidate_id: string;
          company_id: string;
          reviewer_id?: string | null;
          requirements_completed?: boolean;
          technical_quality: string;
          completeness: string;
          testing_quality: string;
          documentation_quality: string;
          deadline_met?: boolean;
          revisions_required?: number;
          written_feedback: string;
          what_was_missing?: string | null;
          would_interview_or_hire: string;
          created_at?: string;
        };
        Update: {
          requirements_completed?: boolean;
          technical_quality?: string;
          completeness?: string;
          testing_quality?: string;
          documentation_quality?: string;
          deadline_met?: boolean;
          revisions_required?: number;
          written_feedback?: string;
          what_was_missing?: string | null;
          would_interview_or_hire?: string;
        };
        Relationships: [];
      };
      project_outcomes: {
        Row: {
          id: string;
          project_id: string;
          candidate_id: string;
          outcome: ProjectOutcomeType;
          reason: string | null;
          interview_date: string | null;
          hired_at: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          candidate_id: string;
          outcome: ProjectOutcomeType;
          reason?: string | null;
          interview_date?: string | null;
          hired_at?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          outcome?: ProjectOutcomeType;
          reason?: string | null;
          interview_date?: string | null;
          hired_at?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          project_id: string;
          company_id: string;
          candidate_id: string | null;
          provider: string;
          provider_payment_id: string | null;
          amount: number;
          currency: string;
          status: PaymentStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          company_id: string;
          candidate_id?: string | null;
          provider?: string;
          provider_payment_id?: string | null;
          amount: number;
          currency?: string;
          status?: PaymentStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          provider_payment_id?: string | null;
          status?: PaymentStatus;
          updated_at?: string;
        };
        Relationships: [];
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          company_id: string | null;
          candidate_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          company_id?: string | null;
          candidate_id?: string | null;
          created_at?: string;
        };
        Update: { [_ in never]: never };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          link_url: string | null;
          project_id: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          title: string;
          message: string;
          type?: string;
          link_url?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          read?: boolean;
        };
        Relationships: [];
      };
      admin_notes: {
        Row: {
          id: string;
          admin_id: string | null;
          target_type: string;
          target_id: string;
          note: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id?: string | null;
          target_type: string;
          target_id: string;
          note: string;
          created_at?: string;
        };
        Update: {
          note?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          metadata: Json;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          metadata?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          action?: string;
          metadata?: Json;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      freelance_milestone_plan: {
        Args: { target_project_id: string };
        Returns: {
          position: number;
          title: string;
          description: string | null;
          amount: number;
          due_date: string | null;
        }[];
      };
      submit_freelance_milestone: {
        Args: { target_milestone_id: string; work_link: string; note: string };
        Returns: undefined;
      };
      log_freelance_hours: {
        Args: {
          target_project_id: string;
          week_start: string;
          worked: number;
          note: string;
          work_link: string;
        };
        Returns: string;
      };
      review_freelance_milestone: {
        Args: { target_milestone_id: string; decision: string; note: string };
        Returns: undefined;
      };
      mark_freelance_milestone_paid: {
        Args: { target_milestone_id: string };
        Returns: undefined;
      };
      confirm_freelance_payment: {
        Args: { target_milestone_id: string };
        Returns: undefined;
      };
      complete_freelance_contract: {
        Args: { target_project_id: string };
        Returns: string;
      };
      accept_terms: {
        Args: { accepted_version: string };
        Returns: undefined;
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_company_member: {
        Args: { lookup_company_id: string };
        Returns: boolean;
      };
      get_current_candidate_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      create_company_with_owner: {
        Args: {
          company_name: string;
          company_website?: string | null;
          company_description?: string | null;
          company_industry?: string | null;
          company_size?: string | null;
          company_location?: string | null;
        };
        Returns: string;
      };
      claim_signup_role: {
        Args: { requested_role: string };
        Returns: UserRole;
      };
      withdraw_application: {
        Args: { target_application_id: string };
        Returns: undefined;
      };
      has_applied_to_project: {
        Args: { target_project_id: string };
        Returns: boolean;
      };
      account_deletion_blockers: {
        Args: Record<string, never>;
        Returns: string[];
      };
      delete_my_account: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      search_directory: {
        Args: { query: string };
        Returns: {
          kind: string;
          id: string;
          title: string;
          subtitle: string | null;
          image_url: string | null;
          location: string | null;
          /** Added by 20261003000000; absent until that migration runs. */
          skills?: string[] | null;
          verified_count?: number | null;
          open_projects?: number | null;
          company_size?: string | null;
        }[];
      };
      candidate_public_profile: {
        Args: { target_candidate_id: string };
        Returns: Json | null;
      };
      follow_stats: {
        Args: { target_company_id?: string | null; target_candidate_id?: string | null };
        Returns: { followers: number; following: boolean }[];
      };
      company_ready_to_post: {
        Args: { target_company_id: string };
        Returns: boolean;
      };
      save_assessment: {
        Args: {
          target_project_id: string;
          repository: string | null;
          live: string | null;
          note: string | null;
          done: number[];
          submit: boolean;
        };
        Returns: AssessmentStatus;
      };
      delete_project: {
        Args: { target_project_id: string };
        Returns: undefined;
      };
      project_application_counts: {
        Args: { project_ids: string[] };
        Returns: { project_id: string; applications: number }[];
      };
      company_track_record: {
        Args: { target_company_id: string };
        Returns: {
          open_projects: number;
          completed_evaluations: number;
          hires: number;
          interviews: number;
          cancelled_projects: number;
          /** Added by 20261004000000; absent until that migration runs. */
          projects_posted?: number | null;
        }[];
      };
      company_history: {
        Args: { target_company_id: string };
        Returns: {
          project_id: string;
          slug: string;
          title: string;
          opportunity_type: OpportunityType;
          status: ProjectStatus;
          openings: number;
          hired: number;
          accepted: number;
          applications: number;
          payment_amount: number;
          currency: string;
          posted_at: string;
          closed_at: string;
          /** Added by 20261007000000. */
          assessment_title?: string | null;
        }[];
      };
      profile_social: {
        Args: { target_company_id?: string | null; target_candidate_id?: string | null };
        Returns: { followers: number; following: number; viewer_follows: boolean }[];
      };
      profile_connections: {
        Args: {
          direction: string;
          target_company_id?: string | null;
          target_candidate_id?: string | null;
        };
        Returns: {
          kind: string;
          id: string;
          title: string;
          subtitle: string | null;
          image_url: string | null;
          viewer_follows: boolean;
          is_viewer: boolean;
          followed_at: string;
        }[];
      };
      candidate_github_username: {
        Args: { target_candidate_id: string };
        Returns: string | null;
      };
    };
    Enums: {
      user_role: UserRole;
      project_status: ProjectStatus;
      application_status: ApplicationStatus;
      submission_status: SubmissionStatus;
      project_outcome_type: ProjectOutcomeType;
      payment_status: PaymentStatus;
      project_work_mode: ProjectWorkMode;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
