import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ifqpfkxqrqdrjbhijfdj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_aXcoE3mN6rJ2jf3Lst6ruQ_H1zyt92v';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
