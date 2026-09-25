import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    '❌ ERROR: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están configuradas en desarrollo/backend/.env.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
