export type VehicleType = 'car' | 'truck' | 'bus' | 'motorcycle';

export interface TollBooth {
  id: string;
  name: string;
  status: 'active' | 'maintenance' | 'closed';
  baseRate: Record<VehicleType, number>;
  rateMultiplier: number; // For surge/congestion dynamic pricing
  totalRevenue: number;
  totalVehicles: number;
}

export interface Transaction {
  id: string;
  timestamp: string; // ISO String
  licensePlate: string;
  vehicleType: VehicleType;
  boothId: string;
  boothName: string;
  amount: number;
  paymentMethod: 'rfid' | 'cash' | 'unpaid';
  status: 'success' | 'flagged' | 'violation';
  ownerName?: string;
  violationDetails?: string;
}

export interface RfidAccount {
  id: string;
  ownerName: string;
  tagNumber: string;
  licensePlate: string;
  balance: number;
  status: 'active' | 'suspended' | 'low-balance';
}

export interface DashboardStats {
  totalRevenue: number;
  totalVehicles: number;
  violationsCount: number;
  rfidPassAdoption: number; // percentage (0-100)
  revenueByVehicleType: Record<VehicleType, number>;
  hourlyDistribution: { hour: string; revenue: number; volume: number }[];
}
