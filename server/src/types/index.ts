export interface Project {
  id: number;
  name: string;
  status: 'active' | 'archived' | 'paused';
  priority: number;
  goal: string | null;
  description: string | null;
  notes: string | null;
  roi_rating: number | null;
  color: string;
  created_at: string;
  updated_at: string;
  last_activity_at: string | null;
  total_hours?: number;
  hours_last_7_days?: number;
  hours_last_30_days?: number;
}

export interface TimeEntry {
  id: number;
  project_id: number | null;
  calendar_event_id: number | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  notes: string | null;
  is_manual: number;
  created_at: string;
  project_name?: string | null;
  project_color?: string | null;
}

export interface CalendarEvent {
  id: number;
  title: string;
  project_id: number | null;
  start_time: string;
  end_time: string;
  all_day: number;
  color: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  project_name?: string | null;
}

export interface DailyFocus {
  id: number;
  date: string;
  focus_text: string;
  created_at: string;
  updated_at: string;
}

export interface DailyNote {
  id: number;
  date: string;
  journal_text: string | null;
  reflection_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyWellbeing {
  id: number;
  date: string;
  energy_level: number | null;
  mood_level: number | null;
  stress_level: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SleepLog {
  id: number;
  sleep_date: string;
  hours_slept: number;
  quality: number | null;
  notes: string | null;
  created_at: string;
}

export interface DailySleepCheckin {
  id: number;
  date: string;
  sleep_score: number;
  actual_sleep_minutes: number;
  deep_sleep_minutes: number;
  rem_sleep_minutes: number;
  morning_energy: number;
  morning_readiness_score: number | null;
  morning_readiness_label: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardMorningSleep {
  sleep_score: number;
  actual_sleep_minutes: number;
  deep_sleep_minutes: number;
  rem_sleep_minutes: number;
  morning_energy: number;
  morning_readiness_score: number | null;
  morning_readiness_label: string | null;
  morning_readiness_emoji: string | null;
}

export interface FoodEntry {
  id: number;
  date: string;
  meal_category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  description: string;
  calories: number;
  created_at: string;
}

export interface TaxiShift {
  id: number;
  shift_date: string;
  shift_start: string | null;
  shift_end: string | null;
  hours_worked: number;
  shift_type: string | null;
  income: number | null;
  notes: string | null;
  created_at: string;
}

export interface TeslaViewEvent {
  id: number;
  title: string;
  time: string;
  start_time: string;
  end_time: string;
  project_name: string | null;
  notes: string | null;
  color: string | null;
}

export interface TeslaTimerStatus {
  active: boolean;
  paused: boolean;
  timer: {
    start_time: string;
    shift_date: string;
    paused_at: string | null;
    accumulated_pause_ms: number;
  } | null;
  elapsed_seconds: number;
}

export interface TeslaViewData {
  today: string;
  sleep: {
    sleep_score: number;
    morning_energy: number;
    morning_energy_emoji: string | null;
    checkin: DailySleepCheckin;
  } | null;
  taxi_hours_today: number;
  taxi_hours_today_display: string;
  logged_hours_today: number;
  tonight_focus: string[];
  tonight_events: TeslaViewEvent[];
  remaining_schedule: TeslaViewEvent[];
  taxi_timer: TeslaTimerStatus;
  life_snapshot: {
    week: {
      taxi_hours: number;
      project_hours: number;
      avg_sleep_score: number | null;
      avg_energy: number | null;
    };
    month: {
      taxi_hours: number;
      avg_sleep_score: number | null;
    };
  };
}

export interface Goal {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  start_date: string | null;
  target_date: string | null;
  progress_percent: number;
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  created_at: string;
  updated_at: string;
}

export interface ActiveTimer {
  project_id: number | null;
  start_time: string;
  paused_at: string | null;
  accumulated_pause_ms: number;
  notes: string | null;
}

export interface DashboardHero {
  display_name: string;
  greeting: string;
  insight: string;
  today_summary: {
    logged_hours: number;
    taxi_hours: number;
    energy: number | null;
    calories: number;
  };
  week_summary: {
    worked_hours: number;
    focus_project_name: string | null;
    avg_sleep: number | null;
    avg_energy: number | null;
  };
}

export interface DashboardData {
  today: string;
  week_number: number;
  planned_hours_today: number;
  actual_hours_today: number;
  weekly_total_hours: number;
  weekly_focus_project: Project | null;
  latest_activities: TimeEntry[];
  daily_energy: number | null;
  daily_calories: number;
  calorie_target: number;
  workload_indicator: 'green' | 'yellow' | 'red';
  daily_focus: DailyFocus | null;
  morning_sleep: DashboardMorningSleep | null;
  hero: DashboardHero;
}

export interface StatsSummary {
  period_days: number;
  time_by_project: { project_id: number; project_name: string; color: string; hours: number }[];
  taxi_hours: number;
  focused_work_hours: number;
  avg_energy: number | null;
  avg_calories: number | null;
  avg_sleep: number | null;
  avg_mood: number | null;
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface StatsTrends {
  period_days: number;
  time_allocation: { project_id: number; project_name: string; color: string; hours: number }[];
  most_active_projects: { project_id: number; project_name: string; color: string; hours: number }[];
  taxi_trend: TrendPoint[];
  focused_work_trend: TrendPoint[];
  energy_trend: TrendPoint[];
  mood_trend: TrendPoint[];
  sleep_trend: TrendPoint[];
  calorie_trend: TrendPoint[];
}
