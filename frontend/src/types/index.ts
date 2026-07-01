export interface OpenApiSuccessResponse<T = unknown> {
  success: boolean;
  status_code: number;
  message: string;
  data: T;
}

export interface OpenApiErrorResponse {
  success: false;
  status_code: number;
  error: {
    code: string | number;
    message: string;
    details?: string;
    path?: string;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

export interface LifeArea {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  category_id: string | null;
  life_area_id: string | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  due_date: string | null;
  completed_at: string | null;
  is_archived: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardData {
  today_score: number;
  score_breakdown: Record<string, number>;
  tasks_completed_today: number;
  tasks_pending_today: number;
  current_streak: number;
  longest_streak: number;
  weekly_progress: number;
  monthly_progress: number;
  achievement_count: number;
  today_tasks: Array<{ id: string; title: string; status: string; priority: string }>;
  recent_activity: Array<{ id: string; event_type: string; created_at: string }>;
  category_distribution: Array<{ name: string; color: string; count: number }>;
  life_area_distribution: Array<{ name: string; color: string; count: number }>;
}

export interface HeatmapDay {
  date: string;
  score: number;
  level: number;
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string;
  unlocked: boolean;
  unlocked_at: string | null;
}
