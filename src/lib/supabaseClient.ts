import { createClient } from '@supabase/supabase-js';

// These should ideally be environment variables
// For Dyad, these are injected if you used the "Add Supabase Integration" button
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://szfmzdhzdclxugzqejfc.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6Zm16ZGh6ZGNseHVnenFlamZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MTI4MDQsImV4cCI6MjA2NjI4ODgwNH0.IfRJg9SjuZUcGWFeFFNkVKB7L4kEkd2M1Obibg0Q-yM";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key is missing. Please check your environment variables or Supabase integration setup.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);