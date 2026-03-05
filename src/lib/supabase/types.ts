export interface Goal {
  user_id: string;
  year_month: string; // "YYYY-MM"
  target_net_profit: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
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
