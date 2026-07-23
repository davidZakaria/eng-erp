export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'PROJECT_MANAGER'
  | 'HEAD_ENGINEER'
  | 'SITE_ENGINEER'
  | 'CONSULTANT'
  | 'ARCH_CONSULTANT'
  | 'STRUCT_CONSULTANT'
  | 'MEP_CONSULTANT';

export type Discipline =
  | 'ARCHITECTURAL'
  | 'STRUCTURAL'
  | 'MEP'
  | 'INFRASTRUCTURE';

export type ItemStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'REVISION_REQUESTED'
  | 'APPROVED_FOR_CONSTRUCTION'
  | 'DEVIATION_PENDING_OWNER'
  | 'SUPERSEDED';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface ChatUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
}

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  conversationId: string;
  createdAt: string;
  sender: ChatUser;
}

export interface ChatConversation {
  id: string;
  name: string | null;
  isGroup: boolean;
  isGlobal: boolean;
  updatedAt: string;
  users: ChatUser[];
  lastMessage: ChatMessage | null;
  peer: ChatUser | null;
}

export interface ChatModerationState {
  warningCount: number;
  bannedUntil: string | null;
  isBanned: boolean;
}

export interface ChatMessageNotification {
  message: ChatMessage;
  conversationId: string;
  conversationName: string;
  senderName: string;
  preview: string;
}

export interface ChatToastNotification {
  id: string;
  title: string;
  body: string;
  conversationId: string;
}

export interface ManagedUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface AuditLogRow {
  id: string;
  userId: string | null;
  action: string;
  targetTable: string;
  targetId: string | null;
  oldData: unknown;
  newData: unknown;
  metadata: unknown;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    fullName: string;
    role: Role;
  } | null;
}

export interface SystemBackupRow {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  status: string;
  createdAt: string;
}

export interface Drawing {
  id: string;
  drawingNumber: string;
  title: string;
  discipline: Discipline;
  revision: number;
  status: ItemStatus;
  fileUrl: string;
  uploaderId: string;
  projectNumber?: string | null;
  disciplineCode?: string | null;
  sheetNumber?: string | null;
  sheetSize?: string | null;
  scale?: string | null;
  packageName?: string | null;
  createdAt: string;
  updatedAt: string;
  uploader?: { id: string; fullName: string; email: string };
}

export interface MaterialSubmittal {
  id: string;
  equipmentTag: string;
  proposedVendor: string;
  isApprovedVendor: boolean;
  equivalenceLetterUrl: string | null;
  leadTimeWeeks: number | null;
  costDeltaEGP: number | null;
  systemRecommendation: string | null;
  status: ItemStatus;
  divisionId: string;
  vendorId: string | null;
  csiDivision?: { code: string; title: string };
  vendor?: { name: string; country: string | null } | null;
  specSection?: { code: string; title: string; divisionCode: string } | null;
}

export interface CSIDivisionRow {
  id: string;
  code: string;
  title: string;
}

export interface SpecSectionRow {
  id: string;
  code: string;
  title: string;
  divisionCode: string;
  fileUrl: string | null;
}

export interface ApprovedVendorRow {
  id: string;
  name: string;
  country: string | null;
  disciplineTag: string | null;
  csiDivision: { code: string; title: string };
}

export interface PanelCircuitRow {
  id: string;
  circuitNumber: number;
  mcbRating: number;
  wireSize: string;
  loadType: string;
  connectedLoadVA: number;
  demandFactor: number;
  phase: string;
}

export interface ElectricalPanelRow {
  id: string;
  panelReference: string;
  location: string;
  incomingCB: string;
  isUnbalanced: boolean;
  circuits: PanelCircuitRow[];
}

export interface PourClearance {
  id: string;
  zone: string;
  floorLevel: string;
  formworkApproved: boolean;
  rebarApproved: boolean;
  ptCablesXApproved: boolean;
  ptCablesYApproved: boolean;
  isLockedByNCR: boolean;
  isLockedByMEP: boolean;
  isLockedByDefect: boolean;
  status: string;
  updatedAt: string;
}

export interface BOQItem {
  id: string;
  itemCode: string;
  description: string;
  unit: string;
  plannedQuantity: number;
  rateEGP: number;
  actualQuantity: number;
  divisionCode?: string | null;
}

export interface SiteDefect {
  id: string;
  description: string;
  location: string;
  severity: string;
  status: string;
  createdAt: string;
}

export interface RFI {
  id: string;
  rfiNumber: string;
  question: string;
  answer: string | null;
  status: string;
  impactsCost: boolean;
  dueDate: string;
  createdAt: string;
  voWarning?: string | null;
}

export interface PanelLoadResult {
  panelId: string;
  panelReference: string;
  phaseLoads: { R: number; Y: number; B: number };
  averageLoad: number;
  maxLoad: number;
  isUnbalanced: boolean;
}

export interface ModelSubmission {
  id: string;
  projectId: string;
  title: string;
  fileUrl: string;
  versionNumber: number;
  status: string;
  isLocked: boolean;
  project?: { id: string; name: string };
  consultant?: { id: string; fullName: string; email: string };
  reviews?: ModelReview[];
}

export interface ModelReview {
  id: string;
  statusDecision: string;
  comments: string;
  createdAt: string;
  reviewer?: { id: string; fullName: string };
}

export interface Project {
  id: string;
  name: string;
  code?: string;
  buildings: Building[];
}

export interface Building {
  id: string;
  name: string;
  components: BuildingComponent[];
}

export interface BuildingComponent {
  id: string;
  name: string;
  type: string;
}

export interface VarianceReportRow {
  componentId: string;
  componentName: string;
  buildingName: string;
  projectName: string;
  plannedConcreteM3: number;
  actualConcreteM3: number;
  plannedEndDate: string;
  actualEndDate: string | null;
  isOverBudget: boolean;
  isDelayed: boolean;
}

export const CONSULTANT_ROLES: Role[] = [
  'CONSULTANT',
  'ARCH_CONSULTANT',
  'STRUCT_CONSULTANT',
  'MEP_CONSULTANT',
];

export const TEAM_ROLES: Role[] = [
  'HEAD_ENGINEER',
  'SITE_ENGINEER',
  'PROJECT_MANAGER',
  'CONSULTANT',
  'ARCH_CONSULTANT',
  'STRUCT_CONSULTANT',
  'MEP_CONSULTANT',
  'ADMIN',
];

export const ALL_MANAGEABLE_ROLES: Role[] = ['SUPER_ADMIN', ...TEAM_ROLES];

export type TrackerStatus = 'PLANNED' | 'IN_PROGRESS' | 'DONE';

export const REBAR_DIAMETERS = ['6', '8', '10', '12', '16', '18', '22', '25'] as const;

export interface PourTrackerEntry {
  id: string;
  buildingLabel: string;
  halfZone: string | null;
  floorLevel: string | null;
  elementType: string;
  elementLabel: string | null;
  rebarByDiameter: Record<string, number>;
  concreteM3: number | null;
  rebarCostEGP: number | null;
  concreteCostEGP: number | null;
  laborCostEGP: number | null;
  plannedDurationDays: number | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualPourDate: string | null;
  status: TrackerStatus;
  notes: string | null;
  loggedBy?: { id: string; fullName: string; email: string } | null;
}

export interface ScheduleBuildingProgress {
  id: string;
  buildingCode: string;
  quantity: number | null;
  rateEGP: number | null;
  durationDays: number | null;
  startDate: string | null;
  endDate: string | null;
  lineTotalEGP: number | null;
  status: string | null;
}

export interface ScheduleLine {
  id: string;
  itemCode: string;
  parentCode: string | null;
  description: string;
  unit: string | null;
  categoryLabel: string | null;
  sortOrder: number;
  progress: ScheduleBuildingProgress[];
}

export interface SchedulePlan {
  id: string;
  name: string;
  projectLabel: string | null;
  planDeadline: string | null;
  buildingCodes: string[];
  lines?: ScheduleLine[];
  _count?: { lines: number };
}
