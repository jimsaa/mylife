import { api } from './client';
import type {
  CalendarEvent,
  DailyNote,
  DailyWellbeing,
  DashboardData,
  FoodDayData,
  Goal,
  Project,
  SleepLog,
  StatsSummary,
  StatsTrends,
  TaxiData,
  TaxiShift,
  TimeEntry,
  TimerStatus,
  SleepImportExtractResponse,
  SaveSleepImportPayload,
  SamsungSleepExtractResponse,
  SaveSamsungSleepPayload,
  SaveSamsungSleepResponse,
  SamsungScreenshotInput,
  SleepSessionRecord,
  DuplicateMatch,
  ProfileSettings,
  DailySleepCheckin,
  SaveDailySleepCheckinPayload,
  SaveDailySleepCheckinResponse,
  TeslaViewData,
  TeslaTimerStatus,
} from '../types';

export const teslaApi = {
  get: () => api.get<TeslaViewData>('/tesla'),
};

export const taxiTimerApi = {
  status: () => api.get<TeslaTimerStatus>('/taxi/timer/status'),
  start: () => api.post<TeslaTimerStatus>('/taxi/timer/start'),
  pause: () => api.post<TeslaTimerStatus>('/taxi/timer/pause'),
  resume: () => api.post<TeslaTimerStatus>('/taxi/timer/resume'),
  stop: () => api.post<{ shift: TaxiShift; timer: TeslaTimerStatus }>('/taxi/timer/stop'),
};

export const dashboardApi = {
  get: () => api.get<DashboardData>('/dashboard'),
  setFocus: (date: string, focus_text: string) =>
    api.put('/dashboard/focus', { date, focus_text }),
};

export const projectApi = {
  list: (includeArchived = false) =>
    api.get<Project[]>(`/projects${includeArchived ? '?includeArchived=true' : ''}`),
  get: (id: number) => api.get<Project>(`/projects/${id}`),
  create: (data: Partial<Project>) => api.post<Project>('/projects', data),
  update: (id: number, data: Partial<Project>) => api.put<Project>(`/projects/${id}`, data),
  archive: (id: number) => api.post<Project>(`/projects/${id}/archive`),
  delete: (id: number) => api.delete(`/projects/${id}`),
  setWeeklyFocus: (id: number) => api.put(`/projects/settings/weekly-focus/${id}`),
};

export const timeApi = {
  list: (date?: string) => api.get<TimeEntry[]>(`/time-entries${date ? `?date=${date}` : ''}`),
  create: (data: Partial<TimeEntry>) => api.post<TimeEntry>('/time-entries', data),
  update: (id: number, data: Partial<TimeEntry>) => api.put<TimeEntry>(`/time-entries/${id}`, data),
  delete: (id: number) => api.delete(`/time-entries/${id}`),
  timerStatus: () => api.get<TimerStatus>('/time-entries/timer/status'),
  startTimer: (project_id: number | null, notes?: string) =>
    api.post<TimeEntry>('/time-entries/timer/start', { project_id, notes }),
  pauseTimer: () => api.post('/time-entries/timer/pause'),
  resumeTimer: () => api.post('/time-entries/timer/resume'),
  stopTimer: () => api.post<TimeEntry | null>('/time-entries/timer/stop'),
};

export const calendarApi = {
  list: (start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    const q = params.toString();
    return api.get<CalendarEvent[]>(`/calendar${q ? `?${q}` : ''}`);
  },
  create: (data: Partial<CalendarEvent>) => api.post<CalendarEvent>('/calendar', data),
  update: (id: number, data: Partial<CalendarEvent>) =>
    api.put<CalendarEvent>(`/calendar/${id}`, data),
  delete: (id: number) => api.delete(`/calendar/${id}`),
};

export const journalApi = {
  get: (date: string) => api.get<DailyNote | null>(`/journal?date=${date}`),
  list: () => api.get<DailyNote[]>('/journal'),
  save: (date: string, data: { journal_text?: string; reflection_text?: string }) =>
    api.put<DailyNote>('/journal', { date, ...data }),
};

export const wellbeingApi = {
  get: (date: string) => api.get<DailyWellbeing | null>(`/wellbeing?date=${date}`),
  list: () => api.get<DailyWellbeing[]>('/wellbeing'),
  save: (date: string, data: Partial<DailyWellbeing>) =>
    api.put<DailyWellbeing>('/wellbeing', { date, ...data }),
};

export const sleepApi = {
  list: () => api.get<SleepLog[]>('/sleep'),
  create: (data: Partial<SleepLog>) => api.post<SleepLog>('/sleep', data),
  update: (id: number, data: Partial<SleepLog>) => api.put<SleepLog>(`/sleep/${id}`, data),
  delete: (id: number) => api.delete(`/sleep/${id}`),
};

export const sleepCheckinApi = {
  today: () => api.get<DailySleepCheckin | null>('/sleep-checkins/today'),
  get: (date: string) => api.get<DailySleepCheckin | null>(`/sleep-checkins?date=${date}`),
  list: () => api.get<DailySleepCheckin[]>('/sleep-checkins'),
  create: (payload: SaveDailySleepCheckinPayload) =>
    api.post<SaveDailySleepCheckinResponse>('/sleep-checkins', payload),
  upsert: (payload: SaveDailySleepCheckinPayload) =>
    api.put<SaveDailySleepCheckinResponse>('/sleep-checkins/upsert', payload),
  update: (id: number, payload: SaveDailySleepCheckinPayload) =>
    api.put<SaveDailySleepCheckinResponse>(`/sleep-checkins/${id}`, payload),
};

export const sleepImportApi = {
  extract: (image_base64: string, filename: string, mime_type: string) =>
    api.post<SleepImportExtractResponse>('/sleep-import/extract', {
      image_base64,
      filename,
      mime_type,
    }),
  checkDuplicates: (date: string, bedtime?: string | null, wake_time?: string | null) =>
    api.post<DuplicateMatch[]>('/sleep-import/check-duplicates', { date, bedtime, wake_time }),
  save: (payload: SaveSleepImportPayload) =>
    api.post<{ session: SleepSessionRecord }>('/sleep-import/save', payload),
  sessions: () => api.get<SleepSessionRecord[]>('/sleep-import/sessions'),
  samsungExtract: (images: SamsungScreenshotInput[]) =>
    api.post<SamsungSleepExtractResponse>('/sleep-import/samsung/extract', { images }),
  samsungSave: (payload: SaveSamsungSleepPayload) =>
    api.post<SaveSamsungSleepResponse>('/sleep-import/samsung/save', payload),
};

export const foodApi = {
  getDay: (date: string) => api.get<FoodDayData>(`/food?date=${date}`),
  create: (data: { date: string; meal_category: string; description: string; calories: number }) =>
    api.post('/food', data),
  delete: (id: number) => api.delete(`/food/${id}`),
};

export const taxiApi = {
  list: () => api.get<TaxiData>('/taxi'),
  create: (data: Partial<TaxiShift>) => api.post<TaxiShift>('/taxi', data),
  update: (id: number, data: Partial<TaxiShift>) => api.put<TaxiShift>(`/taxi/${id}`, data),
  delete: (id: number) => api.delete(`/taxi/${id}`),
};

export const goalApi = {
  list: (includeCompleted = false) =>
    api.get<Goal[]>(`/goals${includeCompleted ? '?includeCompleted=true' : ''}`),
  create: (data: Partial<Goal>) => api.post<Goal>('/goals', data),
  update: (id: number, data: Partial<Goal>) => api.put<Goal>(`/goals/${id}`, data),
  delete: (id: number) => api.delete(`/goals/${id}`),
};

export const statsApi = {
  summary: (days: number) => api.get<StatsSummary>(`/stats/summary/${days}`),
  trends: (days: number) => api.get<StatsTrends>(`/stats/trends/${days}`),
};

export const profileApi = {
  get: () => api.get<ProfileSettings>('/profile'),
  updateDisplayName: (display_name: string) =>
    api.put<ProfileSettings>('/profile', { display_name }),
  uploadAvatar: (image_base64: string, mime_type: string) =>
    api.post<ProfileSettings>('/profile/avatar', { image_base64, mime_type }),
  removeAvatar: () => api.delete<ProfileSettings>('/profile/avatar'),
};

/** Temporary password gate — replace with Supabase Auth later. */
export const authApi = {
  session: () => api.get<{ authenticated: boolean }>('/auth/session'),
  login: (password: string) => api.post<{ ok: boolean }>('/auth/login', { password }),
  logout: () => api.post<{ ok: boolean }>('/auth/logout'),
};

/** Digital Legacy — admin + public portal */
export const legacyApi = {
  status: () => api.get<import('../types').LegacyStatus>('/legacy/status'),
  updateConfig: (body: Partial<{
    enabled: boolean;
    check_interval_days: number;
    reminder_1_days: number;
    reminder_2_days: number;
    activation_days: number;
    token_lifetime_hours: number;
    legacy_role: string;
    public_base_url: string | null;
  }>) => api.put<import('../types').LegacyConfig>('/legacy/config', body),
  listContacts: () => api.get<import('../types').LegacyContact[]>('/legacy/contacts'),
  createContact: (body: {
    name: string;
    relationship?: string;
    email: string;
    activation_priority?: number;
    enabled?: boolean;
  }) => api.post<import('../types').LegacyContact>('/legacy/contacts', body),
  updateContact: (
    id: number,
    body: Partial<{
      name: string;
      relationship: string;
      email: string;
      activation_priority: number;
      enabled: boolean;
    }>,
  ) => api.put<import('../types').LegacyContact>(`/legacy/contacts/${id}`, body),
  deleteContact: (id: number) => api.delete(`/legacy/contacts/${id}`),
  audit: (limit = 100) =>
    api.get<import('../types').LegacyAuditEntry[]>(`/legacy/audit?limit=${limit}`),
  confirmAlive: () => api.post<import('../types').LegacyLifeState>('/legacy/confirm-alive'),
  sendLifeCheck: () => api.post<{ ok: boolean; error?: string }>('/legacy/send-life-check'),
  triggerActivation: () =>
    api.post<{ ok: boolean; sent?: number; error?: string }>('/legacy/trigger-activation'),
  runScheduler: () =>
    api.post<{ actions: string[]; state: import('../types').LegacyLifeState }>(
      '/legacy/run-scheduler',
    ),

  // Public (no admin cookie required — same /api base with credentials)
  publicConfirm: (token: string) =>
    api.get<{ ok: boolean; message?: string; error?: string }>(
      `/legacy/public/confirm?token=${encodeURIComponent(token)}`,
    ),
  publicVerify: (token: string) =>
    api.get<{
      ok: boolean;
      contact?: { name: string; relationship: string; email: string };
      expires_at?: string;
      error?: string;
    }>(`/legacy/public/verify?token=${encodeURIComponent(token)}`),
  publicClaim: (token: string, password: string) =>
    api.post<{
      ok: boolean;
      role?: string;
      legacy_intro_completed?: boolean;
      contact?: { name: string; email: string };
      error?: string;
    }>('/legacy/public/claim', { token, password }),
  publicLogin: (email: string, password: string) =>
    api.post<{
      ok: boolean;
      role?: string;
      legacy_intro_completed?: boolean;
      contact?: { name: string; email: string };
      error?: string;
    }>('/legacy/public/login', { email, password }),
  publicLogout: () => api.post<{ ok: boolean }>('/legacy/public/logout'),
  publicSession: () =>
    api.get<{
      authenticated: boolean;
      role?: string;
      legacy_intro_completed?: boolean;
      contact?: { name: string; email: string; relationship: string };
    }>('/legacy/public/session'),
  publicWelcome: () =>
    api.get<{ id: number; title: string; body: string; updated_at: string }>(
      '/legacy/public/welcome',
    ),
  publicCompleteIntro: () => api.post<{ ok: boolean }>('/legacy/public/complete-intro'),
  publicInstructions: () =>
    api.get<{
      sections: import('../types').LegacyInstructionSection[];
      updated_at: string | null;
    }>('/legacy/public/instructions'),

  // Admin estate content
  getWelcome: () =>
    api.get<{ id: number; title: string; body: string; updated_at: string }>('/legacy/welcome'),
  updateWelcome: (body: { title: string; body: string }) =>
    api.put<{ id: number; title: string; body: string; updated_at: string }>(
      '/legacy/welcome',
      body,
    ),
  getInstructions: () =>
    api.get<{
      sections: import('../types').LegacyInstructionSection[];
      updated_at: string | null;
    }>('/legacy/instructions'),
  createInstruction: (body: { title: string; body?: string; sort_order?: number }) =>
    api.post<import('../types').LegacyInstructionSection>('/legacy/instructions', body),
  updateInstruction: (
    id: number,
    body: Partial<{ title: string; body: string; sort_order: number }>,
  ) => api.put<import('../types').LegacyInstructionSection>(`/legacy/instructions/${id}`, body),
  deleteInstruction: (id: number) => api.delete(`/legacy/instructions/${id}`),
  reorderInstructions: (ordered_ids: number[]) =>
    api.put<{ sections: import('../types').LegacyInstructionSection[] }>(
      '/legacy/instructions/reorder',
      { ordered_ids },
    ),
};

/** Project Cards — public homepage + admin CRUD */
export const projectCardApi = {
  listPublic: () => api.get<import('../types').ProjectCard[]>('/project-cards'),
  listAdmin: () => api.get<import('../types').ProjectCard[]>('/admin/project-cards'),
  create: (body: {
    title: string;
    description?: string | null;
    url: string;
    active?: boolean;
    sort_order?: number;
    image_base64: string;
    mime_type: string;
  }) => api.post<import('../types').ProjectCard>('/admin/project-cards', body),
  update: (
    id: number,
    body: Partial<{
      title: string;
      description: string | null;
      url: string;
      active: boolean;
      sort_order: number;
      image_base64: string;
      mime_type: string;
    }>,
  ) => api.put<import('../types').ProjectCard>(`/admin/project-cards/${id}`, body),
  remove: (id: number) => api.delete(`/admin/project-cards/${id}`),
};
