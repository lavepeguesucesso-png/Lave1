export enum CycleType {
  WASH = 'LAVAR',
  DRY = 'SECAR',
  UNKNOWN = 'OUTRO'
}

export interface RawCsvRow {
  [key: string]: string;
}

export interface Transaction {
  id: string;
  date: Date; // Combined Date object
  rawDate: string; // Original string dd/mm/yyyy
  rawTime: string; // Original string HH:MM:SS
  productName: string;
  type: CycleType;
  amount: number;
  paymentMethod: string;
  machine: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
}

export interface DashboardMetadata {
  unitName: string;
  period: string;
  reportType: 'SELF_SERVICE' | 'ATTENDANT';
}

export interface DailyMetric {
  date: string; // dd/mm/yyyy for grouping
  revenue: number;
  washCount: number;
  dryCount: number;
  totalCount: number;
  dayOfWeek: number;
}

export interface HourlyMetric {
  hour: number; // 0-23
  count: number;
  revenue: number;
}

export interface ExportOptions {
  includeSelf: boolean;
  includeAttendant: boolean;
  includeComparative: boolean;
  includeFinancial: boolean;
}

// Common props for components that support printing
export interface PrintProps {
  printMode?: boolean;
}