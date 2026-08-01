// FORENSIQ shared types

export type Role = "admin" | "investigator" | "reviewer" | "viewer";
export type LicenseType = "standard" | "professional" | "enterprise";

export type CaseStatus = "open" | "active" | "review" | "closed" | "archived";
export type CasePriority = "low" | "medium" | "high" | "critical";

export type OS = "ios" | "android" | "windows" | "macos" | "linux" | "other";
export type ConnectionMethod =
  | "usb"
  | "wifi"
  | "backup_file"
  | "sd_card"
  | "forensic_image";
export type ConnectionStatus = "disconnected" | "connected" | "acquired" | "monitoring";

export type AcquisitionMethod =
  | "logical"
  | "file_system"
  | "physical"
  | "cloud"
  | "manual";
export type AcquisitionStatus =
  | "pending"
  | "in_progress"
  | "complete"
  | "verified"
  | "failed";

export type ScanStatus =
  | "pending"
  | "running"
  | "complete"
  | "cancelled"
  | "failed";
export type ScanStage = "analysis" | "discovery" | "parsing" | "carving";

export type EvidenceCategory =
  | "photos"
  | "videos"
  | "audio"
  | "sms"
  | "contacts"
  | "browser_history"
  | "call_logs"
  | "app_data"
  | "location_data"
  | "emails"
  | "documents"
  | "social_media"
  | "financial"
  | "calendar"
  | "notes"
  | "system_logs"
  | "network_data"
  | "credentials"
  | "installed_apps"
  | "other";

export type RecoveryStatus =
  | "existing"
  | "deleted"
  | "orphaned"
  | "carved"
  | "cached";

export type DeliveryFormat = "ufed_xml" | "csv" | "json" | "pdf_report";
export type DeliveryStatus = "pending" | "generating" | "complete" | "failed";

// API response types (JSON-serialized Prisma models)
export interface ApiUser {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: Role;
  organizationId: string | null;
  mfaEnabled: boolean;
  lastActive: string | null;
  tokenIdentifier: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiOrganization {
  id: string;
  name: string;
  licenseKey: string;
  licenseType: LicenseType;
  activatedAt: string;
  activatedById: string;
  maxUsers: number;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCase {
  id: string;
  organizationId: string;
  caseNumber: string;
  title: string;
  description: string | null;
  status: CaseStatus;
  priority: CasePriority;
  assignedToId: string | null;
  createdById: string;
  closedAt: string | null;
  tags: string;
  createdAt: string;
  updatedAt: string;
  // joined
  createdBy?: ApiUser;
  assignedTo?: ApiUser | null;
  _count?: {
    devices: number;
    acquisitions: number;
    scanSessions: number;
    evidenceItems: number;
    deliveries: number;
  };
}

export interface ApiDevice {
  id: string;
  caseId: string;
  organizationId: string;
  name: string;
  make: string;
  model: string;
  os: OS;
  osVersion: string | null;
  serialNumber: string | null;
  imei: string | null;
  storageGB: number | null;
  batteryPercent: number | null;
  connectionMethod: ConnectionMethod | null;
  connectionStatus: ConnectionStatus;
  evidenceBagId: string | null;
  notes: string | null;
  addedById: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    acquisitions: number;
    scanSessions: number;
    evidenceItems: number;
  };
  acquisitions?: ApiAcquisition[];
}

export interface ApiAcquisition {
  id: string;
  deviceId: string;
  caseId: string;
  method: AcquisitionMethod;
  status: AcquisitionStatus;
  sha256: string | null;
  sha512: string | null;
  dataSizeMB: number | null;
  startedAt: string;
  completedAt: string | null;
  performedById: string;
  integrityVerifiedAt: string | null;
  integrityVerifiedById: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  performedBy?: Pick<ApiUser, "id" | "name" | "email">;
}

export interface ApiScanSession {
  id: string;
  caseId: string;
  deviceId: string | null;
  status: ScanStatus;
  stage: ScanStage | null;
  stageProgress: number | null;
  filesAnalyzed: number | null;
  filesDiscovered: number | null;
  filesRecoverable: number | null;
  filesRecovered: number | null;
  cpuUsage: number | null;
  memUsage: number | null;
  storageUsage: number | null;
  startedAt: string;
  completedAt: string | null;
  initiatedById: string;
  createdAt: string;
  updatedAt: string;
  device?: Pick<ApiDevice, "id" | "name" | "make" | "model"> | null;
}

export interface ApiEvidenceItem {
  id: string;
  caseId: string;
  scanSessionId: string | null;
  deviceId: string | null;
  category: EvidenceCategory;
  fileName: string;
  filePath: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  recoveryStatus: RecoveryStatus;
  confidence: number;
  createdAtDevice: string | null;
  modifiedAtDevice: string | null;
  sha256: string | null;
  tags: string;
  isSelected: boolean;
  notes: string | null;
  preview: string | null;
  decodedContent: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiDelivery {
  id: string;
  caseId: string;
  organizationId: string;
  format: DeliveryFormat;
  status: DeliveryStatus;
  itemCount: number;
  fileSizeMB: number | null;
  completedAt: string | null;
  createdById: string;
  downloadUrl: string | null;
  reportNotes: string | null;
  fileName: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: Pick<ApiUser, "id" | "name" | "email">;
}

export interface ApiAuditLog {
  id: string;
  organizationId: string;
  caseId: string | null;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: string | null;
  ipAddress: string | null;
  checksum: string | null;
  createdAt: string;
  user?: Pick<ApiUser, "id" | "name" | "email">;
}

export interface ApiAnnotation {
  id: string;
  caseId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user?: Pick<ApiUser, "id" | "name" | "email">;
}
