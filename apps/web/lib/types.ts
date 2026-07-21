export type Role =
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

export interface Drawing {
  id: string;
  drawingNumber: string;
  title: string;
  discipline: Discipline;
  revision: number;
  status: ItemStatus;
  fileUrl: string;
  uploaderId: string;
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
  status: ItemStatus;
  divisionId: string;
  vendorId: string | null;
  csiDivision?: { code: string; title: string };
  vendor?: { name: string; country: string | null } | null;
}

export interface PourClearance {
  id: string;
  zone: string;
  floorLevel: string;
  formworkApproved: boolean;
  rebarApproved: boolean;
  ptCablesXApproved: boolean;
  ptCablesYApproved: boolean;
  status: string;
  updatedAt: string;
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
