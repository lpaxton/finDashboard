/*
 * Types for the Advisor Platform API.
 *
 * GENERATED FROM openapi.yaml. Do not edit by hand: run `npm run types`.
 * `npm test` fails if this file and the contract disagree.
 *
 * Contract version 0.3.0-draft.
 */

export interface Error {
  /** Example: "not_found". */
  code: string;
  message: string;
  traceId?: string;
}

/** Where the data came from, so the UI can show freshness and provenance. */
export type Source = 'greenmeadows' | 'crm' | 'calendar' | 'platform';

export interface Session {
  id: string;
  /** Example: "Dana Whitfield". */
  name: string;
  /** Job title for display. Example: "Senior advisor". */
  role: string;
  /** Permission roles. A solo advisor may hold both principal and advisor. */
  roles: Array<'principal' | 'advisor' | 'associate' | 'client'>;
  /** Views this user may open, in default order. */
  views: Array<'firm' | 'advisor' | 'client'>;
  firm: {
    id: string;
    name: string;
  };
}

/** Assets under management with its month change and 12-month history. */
export interface AumBlock {
  /** Example: 412600000. */
  value: number;
  /** Fraction, 0.018 = 1.8%. Example: 0.018. */
  changeMtd: number;
  /** Last 12 month-end values, oldest first. */
  trend: TrendPoint[];
}

export interface Summary {
  aum: AumBlock;
  households: number;
  meetingsThisWeek: number;
  tasksOpen: number;
  tasksDueToday: number;
  /** Format: date-time. */
  dataAsOf: string;
}

export type HouseholdStatus = 'on_track' | 'needs_review' | 'overdue_contact' | 'onboarding' | 'forms_incomplete';

export interface HouseholdSummary {
  id: string;
  name: string;
  aum: number;
  /** Fraction. Example: 0.012. */
  change30d: number;
  /** From the CRM. Null when unknown. Format: date-time. */
  lastContactAt?: string | null;
  status: HouseholdStatus;
  accountCount?: number;
  /** Format: date-time. */
  dataAsOf?: string;
}

export interface HouseholdPage {
  items: HouseholdSummary[];
  page: number;
  size: number;
  totalItems: number;
}

export interface AccountSummary {
  /** Example: "****4821". */
  maskedNumber: string;
  /** Example: "Individual brokerage". */
  type: string;
  /** From Green Meadows account status. Example: "active". */
  status: string;
  openingStatus?: 'igo' | 'igox' | 'nigo';
  balance: number;
  todayGainLoss?: number;
  totalGainLoss?: number;
}

export type HouseholdDetail = HouseholdSummary & {
  accounts?: AccountSummary[];
};

export type PrepStatus = 'ready' | 'needs_prep';

export interface Meeting {
  id: string;
  /** Format: date-time. */
  startsAt: string;
  durationMinutes?: number;
  householdId: string;
  householdName: string;
  /** Example: "Annual review". */
  type: string;
  prepStatus: PrepStatus;
  /** AI-drafted prep brief. Draft until the advisor accepts it. */
  brief?: string | null;
  /** Systems the brief drew from, for citation. */
  briefSources?: Source[];
}

export interface MeetingList {
  items: Meeting[];
}

export type TaskStatus = 'open' | 'done';

export type TaskOrigin = 'manual' | 'meeting' | 'alert';

export interface Task {
  id: string;
  title: string;
  householdId?: string | null;
  householdName?: string | null;
  /** Format: date. */
  dueDate?: string | null;
  status: TaskStatus;
  origin: TaskOrigin;
  originMeetingId?: string | null;
  /** Format: date-time. */
  createdAt?: string;
}

export interface TaskCreate {
  title: string;
  householdId?: string;
  /** Format: date. */
  dueDate?: string;
  origin?: TaskOrigin;
  originMeetingId?: string;
}

export interface TaskUpdate {
  title?: string;
  /** Format: date. */
  dueDate?: string | null;
  status?: TaskStatus;
}

export interface TaskList {
  items: Task[];
  openCount: number;
}

export type Severity = 'high' | 'medium' | 'low';

export type AlertStatus = 'open' | 'dismissed' | 'resolved';

export interface AlertAction {
  type: 'review' | 'open_queue' | 'draft_email' | 'send_reminder';
  /** Example: "Review". */
  label: string;
  /** Household, queue or item the action opens. */
  targetId?: string;
}

export interface Alert {
  id: string;
  severity: Severity;
  title: string;
  householdId?: string | null;
  /** Null for practice-level alerts. */
  householdName?: string | null;
  source?: Source;
  status: AlertStatus;
  action?: AlertAction;
  /** Format: date-time. */
  createdAt: string;
}

export interface AlertUpdate {
  status: AlertStatus;
}

export interface AlertList {
  items: Alert[];
}

export type SignalKind = 'tax_loss_harvesting' | 'concentration' | 'allocation_drift' | 'idle_cash';

export interface Signal {
  id: string;
  kind: SignalKind;
  count: number;
  label: string;
  /** Example: "About $61,200 in unrealized losses". */
  detail?: string;
  /** Format: date-time. */
  dataAsOf?: string;
}

export interface SignalList {
  items: Signal[];
}

export interface SignalItem {
  householdId: string;
  householdName: string;
  maskedAccountNumber: string;
  /** Example: "24% of equities in one holding". */
  detail: string;
  amount?: number | null;
}

export interface SignalItemPage {
  items: SignalItem[];
  page: number;
  size: number;
  totalItems: number;
}

export interface FirmSummary {
  aum: AumBlock;
  advisors: number;
  households: number;
  openComplianceItems: number;
  overdueComplianceItems?: number;
  /** Format: date-time. */
  dataAsOf: string;
}

export interface AdvisorRow {
  id: string;
  name: string;
  households: number;
  aum: number;
  /** Fraction. */
  change30d?: number;
  meetingsThisWeek?: number;
  tasksOverdue?: number;
  openAlerts?: number;
  /** Format: date-time. */
  dataAsOf?: string;
}

export interface AdvisorPage {
  items: AdvisorRow[];
  page: number;
  size: number;
  totalItems: number;
}

export interface ComplianceItem {
  id: string;
  title: string;
  category: 'communications_review' | 'annual_review' | 'disclosure' | 'restriction' | 'agreement';
  advisorId?: string;
  advisorName?: string;
  householdId?: string | null;
  /** Format: date. */
  dueDate?: string | null;
  status: 'open' | 'overdue' | 'done';
}

export interface CompliancePage {
  items: ComplianceItem[];
  page: number;
  size: number;
  totalItems: number;
}

export type ShareType = 'plan' | 'tax_explanation' | 'report' | 'proposal' | 'message' | 'document';

export interface ShareCreate {
  type: ShareType;
  /** The advisor-side item being shared. */
  sourceId: string;
  title: string;
  /** Optional note shown to the client. */
  message?: string;
}

export interface SharedItem {
  id: string;
  type: ShareType;
  title: string;
  message?: string | null;
  /** Format: date-time. */
  sharedAt: string;
  /** Advisor who approved the share. */
  sharedBy: string;
  contentUrl?: string | null;
}

export interface SharedItemList {
  items: SharedItem[];
}

/** Client-safe account view. No opening or maintenance status. */
export interface ClientAccount {
  /** Example: "****4821". */
  maskedNumber: string;
  type: string;
  balance: number;
  todayGainLoss?: number;
  totalGainLoss?: number;
}

export interface TrendPoint {
  /** Example: "2026-09". */
  month: string;
  value: number;
}

export interface ClientHousehold {
  id: string;
  name: string;
  aum: number;
  /** Fraction. */
  change30d?: number;
  /**
   * Last 12 month-end values of the household, oldest first, for the portal's value chart. Must
   * come from custodial balance history. The dashboard draws no chart when this is absent: it
   * must never synthesise a performance line the firm cannot evidence.
   */
  trend?: TrendPoint[];
  advisorName?: string;
  accounts: ClientAccount[];
  /** Format: date-time. */
  dataAsOf: string;
}

export interface Document {
  id: string;
  title: string;
  docType: string;
  maskedAccountNumber?: string | null;
  /** Format: date. */
  date: string;
  source?: Source;
}

export interface DocumentPage {
  items: Document[];
  page: number;
  size: number;
  totalItems: number;
}

export interface Fee {
  id: string;
  maskedAccountNumber?: string;
  description: string;
  amount: number;
  /** Format: date. */
  periodStart?: string;
  /** Format: date. */
  periodEnd?: string;
  status: 'scheduled' | 'billed' | 'paid' | 'waived';
}

export interface FeeList {
  items: Fee[];
  /** Format: date-time. */
  dataAsOf: string;
}

/**
 * Draft. Fields to be matched to the Green Meadows preferences endpoints once their shapes are
 * known.
 */
export interface Preferences {
  paperless?: boolean;
  notificationChannels?: Array<'email' | 'sms' | 'portal'>;
}

export interface MeetingRequestCreate {
  topic: string;
  preferredTimes?: string[];
  note?: string;
}

export interface MeetingRequest {
  id: string;
  status: 'requested' | 'confirmed' | 'declined';
  topic: string;
  /** Format: date-time. */
  createdAt: string;
}

/**
 * draft is AI output awaiting a human. approved means an advisor has accepted it but it has
 * not gone out. sent means it has left the firm. A draft cannot go straight to sent.
 */
export type CommunicationStatus = 'draft' | 'approved' | 'sent';

export interface CommunicationSummary {
  id: string;
  householdId: string | null;
  householdName?: string | null;
  advisorName?: string;
  subject: string;
  channel: 'email' | 'letter' | 'portal';
  status: CommunicationStatus;
  /** The tone the draft was written in. Requirement COMM-02. */
  tone?: string;
  draftedBy?: 'ai' | 'advisor';
  /** Flagged for compliance review before it may be sent. */
  complianceReview?: boolean;
  source?: Source;
  /** Format: date-time. */
  createdAt: string;
  approvedBy?: string | null;
  /** Format: date-time. */
  approvedAt?: string | null;
  /** Format: date-time. */
  sentAt?: string | null;
}

export type Communication = CommunicationSummary & {
  /** The full message text. */
  body: string;
};

export interface CommunicationPage {
  items: CommunicationSummary[];
  page: number;
  size: number;
  totalItems: number;
}

export type ProspectStage = 'lead' | 'contacted' | 'meeting_scheduled' | 'proposal' | 'onboarding' | 'converted';

export interface ProspectSummary {
  id: string;
  name: string;
  stage: ProspectStage;
  estimatedAssets?: number | null;
  source?: 'referral' | 'website' | 'event' | 'other';
  /** The meeting this prospect is booked into, if any. */
  meetingId?: string | null;
  /** Format: date-time. */
  createdAt: string;
  /** Format: date-time. */
  updatedAt: string;
}

export type Prospect = ProspectSummary & {
  intakeNotes?: string | null;
};

export interface ProspectPage {
  /** Every stage in board order, so the UI does not hardcode them. */
  stages: ProspectStage[];
  items: ProspectSummary[];
  page: number;
  size: number;
  totalItems: number;
}

export type OnboardingStepStatus = 'not_started' | 'open' | 'done';

export interface OnboardingStep {
  /** Example: "custodian_application". */
  id: string;
  /** Example: "Custodian application". */
  label: string;
  status: OnboardingStepStatus;
  /** What was captured at this step. Null when not started. */
  detail?: string | null;
  /** Format: date-time. */
  completedAt?: string | null;
}

export interface Onboarding {
  id: string;
  name: string;
  /** Format: date-time. */
  startedAt: string;
  /** Format: date-time. */
  convertedAt?: string | null;
  stepsComplete: number;
  stepsTotal: number;
  /** Every step done and not yet converted. */
  readyToConvert: boolean;
  steps: OnboardingStep[];
}

export interface OnboardingList {
  items: Onboarding[];
}

export interface ConversionResult {
  onboardingId: string;
  householdId: string;
  name: string;
  /** Format: date-time. */
  convertedAt: string;
}

export interface MigrationRequest {
  /** Where the book is coming from, for the audit trail. Example: "Redtail export". */
  source: string;
  rows: Array<{
    name: string;
    aum?: number;
  }>;
}

export interface Migration {
  id: string;
  source: string;
  status: 'validating' | 'imported' | 'failed';
  counts: {
    read: number;
    valid: number;
    invalid: number;
    imported: number;
  };
  /** Rows that failed validation, with the reason. The import continues without them. */
  invalidRows?: Array<{
    /** Zero-based index in the submitted rows. */
    row?: number;
    problems?: string[];
  }>;
  createdHouseholdIds?: string[];
  /** Format: date-time. */
  createdAt: string;
}

export interface MigrationList {
  items: Migration[];
}

export interface MeetingCreate {
  /** Format: date-time. */
  startsAt: string;
  /** Example: "Annual review". */
  type: string;
  /** Omit for a prospect meeting. */
  householdId?: string | null;
  durationMinutes?: number;
  brief?: string | null;
}

export interface MeetingUpdate {
  /** Format: date-time. */
  startsAt?: string;
  type?: string;
  durationMinutes?: number;
  prepStatus?: 'ready' | 'needs_prep';
  brief?: string | null;
}

/**
 * Consent to record, as captured at the meeting. Requirement MEET-04, which is flagged for
 * compliance and legal review before build.
 */
export interface RecordingConsent {
  obtained: boolean;
  /** Format: date-time. */
  obtainedAt?: string | null;
  /** Example: "verbal, recorded". */
  method?: string | null;
}

export interface MeetingRecord {
  meetingId: string;
  kind: 'notes' | 'transcript';
  /** Who or what captured it. */
  author?: string;
  /** Format: date-time. */
  capturedAt?: string;
  consent?: RecordingConsent;
  /** True when consent is not on file for a transcript. */
  withheld: boolean;
  withheldReason?: string | null;
  /** Null when withheld. */
  content?: string | null;
  source?: Source;
}

export interface NextStepDrafts {
  meetingId: string;
  /** Format: date-time. */
  generatedAt: string;
  /** Which model produced the suggestions, for the audit trail. */
  model?: string;
  /**
   * Always false. Suggestions are drafts; they become tasks only when the advisor posts them to
   * /tasks. Requirement X-03.
   */
  accepted: boolean;
  items: Array<{
    title: string;
    /** Format: date. */
    dueDate?: string | null;
    householdId?: string | null;
  }>;
}

export interface AllocationLine {
  /** Example: "US equity". */
  assetClass: string;
  /** Percentage points, not a fraction. */
  targetPct: number;
  currentPct: number;
  /** current minus target, in percentage points. */
  driftPct: number;
}

export interface Allocation {
  householdId: string;
  householdName?: string;
  /** Null when the household has no model on file; lines is then empty. */
  model?: {
    id?: string;
    name?: string;
  } | null;
  lines: AllocationLine[];
  /** Largest absolute drift. Matches the allocation_drift portfolio signal for this household. */
  maxDriftPoints?: number | null;
  source?: Source;
  /** Format: date-time. */
  dataAsOf: string;
}

export interface FeeTier {
  minAssets: number;
  /** Null on the top tier. */
  maxAssets?: number | null;
  /** Example: 0.85. */
  annualRatePct: number;
}

export interface ClientFees {
  schedule: FeeTier[];
  /** Format: date. */
  nextRunDate: string;
  /** Example: "USD". */
  currency?: string;
  totalQuarterlyFees?: number;
  items: Array<{
    householdId: string;
    householdName?: string;
    billableAssets: number;
    annualRatePct: number;
    quarterlyFee: number;
  }>;
  page?: number;
  size?: number;
  totalItems?: number;
  /** Format: date-time. */
  dataAsOf: string;
}

export interface UsageMeter {
  id: string;
  label: string;
  used: number;
  included: number;
  unit: string;
}

export interface Subscription {
  plan: string;
  seats: {
    purchased: number;
    used: number;
  };
  meters: UsageMeter[];
  /** Format: date. */
  renewalDate: string;
  billingContact?: string;
  /** Masked. A backend must never hold or return a full card number. */
  paymentMethod?: {
    /** Example: "Visa". */
    brand?: string;
    /** Example: "****4242". */
    maskedNumber?: string;
    expiryMonth?: number;
    expiryYear?: number;
  };
  currentInvoice?: InvoiceSummary;
  /** Format: date-time. */
  dataAsOf: string;
}

export interface InvoiceSummary {
  id: string;
  /** Example: "MW-202609". */
  number: string;
  /** Example: "2026-09". */
  periodMonth?: string;
  amount: number;
  status: 'due' | 'paid' | 'overdue';
  /** Format: date. */
  issuedDate?: string;
  /** Format: date. */
  dueDate?: string;
}

export type Invoice = InvoiceSummary & {
  lines?: Array<{
    description?: string;
    quantity?: number;
    unitAmount?: number;
    amount?: number;
  }>;
};

export interface InvoicePage {
  items: InvoiceSummary[];
  page: number;
  size: number;
  totalItems: number;
}

export interface BrandingUpdate {
  firmName?: string;
  advisorDisplayName?: string;
  markLetter?: string;
  /** Example: "#0E5A57". */
  accentColor?: string;
}

export type Branding = BrandingUpdate & {
  firmId: string;
  /** Format: date-time. */
  updatedAt: string;
  updatedBy?: string;
};

export interface QueryRequest {
  /** Example: "Which clients are holding cash above target?". */
  question: string;
  /** firm requires the principal role. household requires a household the caller may see. */
  scope?: 'own' | 'firm' | 'household';
  /** Required when scope is household. */
  householdId?: string | null;
}

/** Where one part of the answer came from. Required by X-04. */
export interface Citation {
  source: Source;
  /** The record in that source. */
  id?: string;
  /** What to show a human. */
  label?: string;
  /** Format: date-time. */
  dataAsOf: string;
}

/**
 * A source the question needed that could not contribute. Present so a partial answer can say
 * what it could not see, rather than implying it saw everything.
 */
export interface UnansweredSource {
  /** Example: "crm". */
  source: string;
  /** Example: "No CRM is connected.". */
  reason: string;
}

export interface Query {
  id: string;
  question: string;
  scope: 'own' | 'firm' | 'household';
  householdId?: string | null;
  answer: string;
  citations: Citation[];
  unanswerable: UnansweredSource[];
  /**
   * Drafts only. A query never changes anything; an advisor turns a draft into a task by posting
   * it to /tasks, exactly as with suggested next steps.
   */
  actions?: Array<{
    title?: string;
    householdId?: string | null;
  }>;
  /** What produced the answer, for the audit trail. */
  model?: string;
  askedBy?: string;
  /** Format: date-time. */
  dataAsOf: string;
  /** Format: date-time. */
  createdAt: string;
}

export interface QueryPage {
  items: Query[];
  page: number;
  size: number;
  totalItems: number;
}

/** Every operation in the contract, by operationId. */
export interface Operations {
  getSession: {
    method: 'GET';
    path: '/session';
    request: never;
    response: Session;
  };
  getSummary: {
    method: 'GET';
    path: '/summary';
    request: never;
    response: Summary;
  };
  listHouseholds: {
    method: 'GET';
    path: '/households';
    request: never;
    response: HouseholdPage;
  };
  getHousehold: {
    method: 'GET';
    path: '/households/{householdId}';
    request: never;
    response: HouseholdDetail;
  };
  listMeetings: {
    method: 'GET';
    path: '/meetings';
    request: never;
    response: MeetingList;
  };
  createMeeting: {
    method: 'POST';
    path: '/meetings';
    request: MeetingCreate;
    response: Meeting;
  };
  getMeeting: {
    method: 'GET';
    path: '/meetings/{meetingId}';
    request: never;
    response: Meeting;
  };
  updateMeeting: {
    method: 'PATCH';
    path: '/meetings/{meetingId}';
    request: MeetingUpdate;
    response: Meeting;
  };
  cancelMeeting: {
    method: 'DELETE';
    path: '/meetings/{meetingId}';
    request: never;
    response: void;
  };
  getMeetingRecord: {
    method: 'GET';
    path: '/meetings/{meetingId}/record';
    request: never;
    response: MeetingRecord;
  };
  suggestNextSteps: {
    method: 'POST';
    path: '/meetings/{meetingId}/record/next-steps';
    request: never;
    response: NextStepDrafts;
  };
  listTasks: {
    method: 'GET';
    path: '/tasks';
    request: never;
    response: TaskList;
  };
  createTask: {
    method: 'POST';
    path: '/tasks';
    request: TaskCreate;
    response: Task;
  };
  updateTask: {
    method: 'PATCH';
    path: '/tasks/{taskId}';
    request: TaskUpdate;
    response: Task;
  };
  listAlerts: {
    method: 'GET';
    path: '/alerts';
    request: never;
    response: AlertList;
  };
  updateAlert: {
    method: 'PATCH';
    path: '/alerts/{alertId}';
    request: AlertUpdate;
    response: Alert;
  };
  listPortfolioSignals: {
    method: 'GET';
    path: '/portfolio-signals';
    request: never;
    response: SignalList;
  };
  listSignalItems: {
    method: 'GET';
    path: '/portfolio-signals/{signalId}/items';
    request: never;
    response: SignalItemPage;
  };
  getFirmSummary: {
    method: 'GET';
    path: '/firm/summary';
    request: never;
    response: FirmSummary;
  };
  listAdvisors: {
    method: 'GET';
    path: '/firm/advisors';
    request: never;
    response: AdvisorPage;
  };
  getAdvisor: {
    method: 'GET';
    path: '/firm/advisors/{advisorId}';
    request: never;
    response: AdvisorRow;
  };
  listComplianceItems: {
    method: 'GET';
    path: '/firm/compliance';
    request: never;
    response: CompliancePage;
  };
  shareWithClient: {
    method: 'POST';
    path: '/households/{householdId}/shares';
    request: ShareCreate;
    response: SharedItem;
  };
  getMyHousehold: {
    method: 'GET';
    path: '/me/household';
    request: never;
    response: ClientHousehold;
  };
  listMyDocuments: {
    method: 'GET';
    path: '/me/documents';
    request: never;
    response: DocumentPage;
  };
  downloadMyDocument: {
    method: 'GET';
    path: '/me/documents/{documentId}';
    request: never;
    response: void;
  };
  listMyFees: {
    method: 'GET';
    path: '/me/fees';
    request: never;
    response: FeeList;
  };
  listSharedWithMe: {
    method: 'GET';
    path: '/me/shared';
    request: never;
    response: SharedItemList;
  };
  getMyPreferences: {
    method: 'GET';
    path: '/me/preferences';
    request: never;
    response: Preferences;
  };
  updateMyPreferences: {
    method: 'PATCH';
    path: '/me/preferences';
    request: Preferences;
    response: Preferences;
  };
  requestMeeting: {
    method: 'POST';
    path: '/me/meeting-requests';
    request: MeetingRequestCreate;
    response: MeetingRequest;
  };
  listCommunications: {
    method: 'GET';
    path: '/communications';
    request: never;
    response: CommunicationPage;
  };
  getCommunication: {
    method: 'GET';
    path: '/communications/{communicationId}';
    request: never;
    response: Communication;
  };
  approveCommunication: {
    method: 'PATCH';
    path: '/communications/{communicationId}';
    request: {
      status: CommunicationStatus;
    };
    response: Communication;
  };
  listProspects: {
    method: 'GET';
    path: '/prospects';
    request: never;
    response: ProspectPage;
  };
  getProspect: {
    method: 'GET';
    path: '/prospects/{prospectId}';
    request: never;
    response: Prospect;
  };
  moveProspect: {
    method: 'PATCH';
    path: '/prospects/{prospectId}';
    request: {
      stage: ProspectStage;
    };
    response: Prospect;
  };
  listOnboarding: {
    method: 'GET';
    path: '/onboarding';
    request: never;
    response: OnboardingList;
  };
  getOnboarding: {
    method: 'GET';
    path: '/onboarding/{onboardingId}';
    request: never;
    response: Onboarding;
  };
  updateOnboardingStep: {
    method: 'PATCH';
    path: '/onboarding/{onboardingId}/steps/{stepId}';
    request: {
      status: OnboardingStepStatus;
    };
    response: Onboarding;
  };
  convertOnboarding: {
    method: 'POST';
    path: '/onboarding/{onboardingId}/convert';
    request: never;
    response: ConversionResult;
  };
  listMigrations: {
    method: 'GET';
    path: '/migrations';
    request: never;
    response: MigrationList;
  };
  createMigration: {
    method: 'POST';
    path: '/migrations';
    request: MigrationRequest;
    response: Migration;
  };
  getHouseholdAllocation: {
    method: 'GET';
    path: '/households/{householdId}/allocation';
    request: never;
    response: Allocation;
  };
  listClientFees: {
    method: 'GET';
    path: '/billing/fees';
    request: never;
    response: ClientFees;
  };
  getSubscription: {
    method: 'GET';
    path: '/firm/billing/subscription';
    request: never;
    response: Subscription;
  };
  listInvoices: {
    method: 'GET';
    path: '/firm/billing/invoices';
    request: never;
    response: InvoicePage;
  };
  getInvoice: {
    method: 'GET';
    path: '/firm/billing/invoices/{invoiceId}';
    request: never;
    response: Invoice;
  };
  getBranding: {
    method: 'GET';
    path: '/firm/branding';
    request: never;
    response: Branding;
  };
  updateBranding: {
    method: 'PATCH';
    path: '/firm/branding';
    request: BrandingUpdate;
    response: Branding;
  };
  listQueries: {
    method: 'GET';
    path: '/queries';
    request: never;
    response: QueryPage;
  };
  ask: {
    method: 'POST';
    path: '/queries';
    request: QueryRequest;
    response: Query;
  };
  getQuery: {
    method: 'GET';
    path: '/queries/{queryId}';
    request: never;
    response: Query;
  };
}

/** The operationId of every operation the contract defines. */
export type OperationId = keyof Operations;
