import { config } from '../config';
import { demoApi } from './demo';
import { supabaseApi } from './supabase';
import type { Api } from './types';

/** VITE_MODE=demo -> browser backend. VITE_MODE=supabase -> asli backend. UI dono me same. */
export const api: Api = config.mode === 'supabase' ? supabaseApi : demoApi;
