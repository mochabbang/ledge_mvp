export interface Household {
  id: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface Profile {
  user_id: string;
  household_id: string | null;
  display_name: string;
  created_at: string;
}

export interface Goal {
  user_id: string;
  household_id?: string | null;
  year_month: string; // "YYYY-MM"
  target_net_profit: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  household_id?: string | null;
  year_month: string;
  type: "income" | "expense";
  amount: number;
  raw_text: string;
  created_at: string;
  registered_by?: string;
}

export interface Summary {
  income: number;
  expense: number;
  net: number;
  target: number;
  progress: number; // 0~100
  remaining: number;
}

export interface HouseholdInfo {
  invite_code: string;
  members: Array<{ user_id: string; display_name: string }>;
}
