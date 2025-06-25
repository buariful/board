export interface Deal {
  id: string; // UUID from Supabase
  created_at?: string; // Timestamp from Supabase
  title: string;
  contact_name: string; // Changed from contactName
  company_name: string; // Changed from companyName
  deal_value: number;   // Changed from dealValue
  description?: string;
  tags?: string[];
  status: string; // Corresponds to KanbanColumn id
  user_id: string; // Foreign key to auth.users
}

export interface KanbanColumn {
  id: string;
  title: string;
  deals: Deal[];
}

// Updated KANBAN_COLUMN_DEFINITIONS
export const KANBAN_COLUMN_DEFINITIONS: Omit<KanbanColumn, 'deals'>[] = [
  { id: "customers", title: "Customers" },
  { id: "open_deals", title: "Open Deals" },
  { id: "leads_contacts", title: "Leads/Contacts" },
  { id: "others", title: "Others" },
];