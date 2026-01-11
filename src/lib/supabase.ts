import { createClient } from '@supabase/supabase-js';

// Pull from env; fall back to known-good values so production stays up if envs are mis-set.
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://ktdxqyhklnsahjsgrhud.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0ZHhxeWhrbG5zYWhqc2dyaHVkIiwicm9zZSI6ImFub24iLCJpYXQiOjE3NjA0ODU3MDMsImV4cCI6MjA3NjA2MTcwM30.YsOgAVoO8JAaR09YtX917e7yfaVqfXSbhrTWdrajBuQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
