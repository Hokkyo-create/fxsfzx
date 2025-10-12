import { createClient } from "@supabase/supabase-js";

const supabaseUrl = 'https://hdbutydcrbacznhmppft.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkYnV0eWRjcmJhY3puaG1wcGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMjI0OTAsImV4cCI6MjA3NTc5ODQ5MH0.OsqGC4RjMDEhvNHtIzUlpZqxxYV28upy-k_X9yGsyaU';

export const supabase = createClient(supabaseUrl, supabaseKey);