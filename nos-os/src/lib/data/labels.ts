import type {
  AttendanceEvent,
  AttendanceStatus,
  ProjectStatus,
  Role,
  TaskPriority,
  TaskStatus,
} from "@/lib/types";

export const roleLabels: Record<Role, string> = {
  admin: "管理者",
  employee: "一般社員",
  sales: "営業",
};

export const projectStatusLabels: Record<ProjectStatus, string> = {
  pre_order: "受注前",
  hearing: "ヒアリング",
  proposal: "提案中",
  production: "制作中",
  customer_review: "顧客確認中",
  revision: "修正対応",
  final_review: "最終確認",
  delivered: "納品",
  maintenance: "保守運用",
  completed: "完了",
};

export const taskPriorityLabels: Record<TaskPriority, string> = {
  urgent: "緊急",
  high: "高",
  normal: "通常",
  low: "低",
  hold: "保留",
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  todo: "未着手",
  in_progress: "進行中",
  review: "確認待ち",
  done: "完了",
};

export const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  working: "出勤",
  break: "休憩",
  out: "外出",
  meeting: "会議",
  off: "退勤",
  absent: "欠勤",
};

export const attendanceEventLabels: Record<AttendanceEvent, string> = {
  clock_in: "出勤",
  break_start: "休憩開始",
  break_end: "休憩終了",
  out: "外出",
  return: "戻り",
  meeting: "会議",
  clock_out: "退勤",
  absent: "欠勤",
};

export const priorityOrder: Record<TaskPriority, number> = {
  urgent: 5,
  high: 4,
  normal: 3,
  low: 2,
  hold: 1,
};
