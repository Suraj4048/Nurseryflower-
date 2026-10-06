import { createContext, useContext } from 'react';
import type { User } from '../../lib/types';

export interface Ctx { user: User | null; refresh: () => Promise<void> }
export const SessionCtx = createContext<Ctx>({ user: null, refresh: async () => {} });
export const useUser = () => useContext(SessionCtx);
