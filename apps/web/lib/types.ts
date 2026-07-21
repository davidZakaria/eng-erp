export type Role =
  | 'PROJECT_MANAGER'
  | 'HEAD_ENGINEER'
  | 'SITE_ENGINEER'
  | 'CONSULTANT';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
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
