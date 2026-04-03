import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://elylyumpktnicomxhldr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseWx5dW1wa3RuaWNvbXhobGRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNDI2MTMsImV4cCI6MjA5MDgxODYxM30.cREg1z2l3MkxCexEBa2oDSlspKeEzywl7dcvCHsu1PY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
