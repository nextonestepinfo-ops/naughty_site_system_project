import * as mock from "@/lib/data/mock-repository";
import * as supabase from "@/lib/data/supabase-repository";
import { isSupabaseDataMode } from "@/lib/data/supabase-rest";
import type { ActivityLog, AttendanceEvent, AttendanceLog, GoalTree, Project, Role, Task, TaskFilter, User } from "@/lib/types";

function repo() {
  return isSupabaseDataMode() ? supabase : mock;
}

export function calculatePriorityScore(task: Pick<Task, "dueDate" | "priority" | "customerWaiting" | "delayRisk">) {
  return repo().calculatePriorityScore(task);
}

export async function loginUser(input: { email?: string; password?: string; role?: Role; provider?: "google" | "email" }) {
  return repo().loginUser(input);
}

export async function getUser(userId?: string) {
  return repo().getUser(userId);
}

export async function getEmployee(employeeId?: string) {
  return repo().getEmployee(employeeId);
}

export async function getEmployees(role: Role, employeeId?: string) {
  return repo().getEmployees(role, employeeId);
}

export async function getEmployeeProfile(role: Role, targetId: string, requesterEmployeeId?: string) {
  return repo().getEmployeeProfile(role, targetId, requesterEmployeeId);
}

export async function getCustomers() {
  return repo().getCustomers();
}

export async function getProjects(role: Role, employeeId?: string) {
  return repo().getProjects(role, employeeId);
}

export async function getProjectDetail(role: Role, id: string, employeeId?: string) {
  return repo().getProjectDetail(role, id, employeeId);
}

export async function createProject(input: Partial<Project>) {
  return repo().createProject(input);
}

export async function updateProject(id: string, input: Partial<Project>) {
  return repo().updateProject(id, input);
}

export async function deleteProject(id: string) {
  return repo().deleteProject(id);
}

export async function getTasks(role: Role, employeeId: string | undefined, filters: TaskFilter = {}) {
  return repo().getTasks(role, employeeId, filters);
}

export async function createTask(input: Partial<Task>) {
  return repo().createTask(input);
}

export async function updateTask(id: string, input: Partial<Task>) {
  return repo().updateTask(id, input);
}

export async function deleteTask(id: string) {
  return repo().deleteTask(id);
}

export async function addTaskComment(taskId: string, authorUserId: string, body: string) {
  return repo().addTaskComment(taskId, authorUserId, body);
}

export async function getAttendance(role: Role, employeeId?: string) {
  return repo().getAttendance(role, employeeId);
}

export async function clockAttendance(employeeId: string, eventType: AttendanceEvent, source: AttendanceLog["source"] = "manual") {
  return repo().clockAttendance(employeeId, eventType, source);
}

export async function getNotifications(role: Role, userId?: string) {
  return repo().getNotifications(role, userId);
}

export async function markNotificationRead(id: string) {
  return repo().markNotificationRead(id);
}

export async function getGoalTrees(role: Role, employeeId?: string) {
  return repo().getGoalTrees(role, employeeId);
}

export async function createGoalTree(input: Partial<GoalTree>, role: Role, employeeId?: string) {
  return repo().createGoalTree(input, role, employeeId);
}

export async function updateGoalTree(id: string, input: Partial<GoalTree>, role: Role, employeeId?: string) {
  return repo().updateGoalTree(id, input, role, employeeId);
}

export async function deleteGoalTree(id: string, role: Role, employeeId?: string) {
  return repo().deleteGoalTree(id, role, employeeId);
}

export async function getDailyPlan(role: Role, employeeId?: string) {
  return repo().getDailyPlan(role, employeeId);
}

export async function getDashboard(role: Role, employeeId?: string, userId?: string) {
  return repo().getDashboard(role, employeeId, userId);
}

export async function getRecommendations(role: Role, employeeId?: string) {
  return repo().getRecommendations(role, employeeId);
}

export async function getActivityLogs() {
  return repo().getActivityLogs();
}

export async function addActivityLog(log: Omit<ActivityLog, "id" | "createdAt">) {
  return repo().addActivityLog(log);
}

export async function getLookupData() {
  return repo().getLookupData();
}

export async function getUsers(role: Role) {
  return repo().getUsers(role);
}

export async function updateUserRole(userId: string, input: Pick<User, "role" | "employmentType">) {
  return repo().updateUserRole(userId, input);
}

export async function getUserByEmployee(employeeId: string) {
  return repo().getUserByEmployee(employeeId);
}

export async function getCustomerById(customerId: string) {
  return repo().getCustomerById(customerId);
}

export async function getCalendarIcs(role: Role, employeeId?: string) {
  return repo().getCalendarIcs(role, employeeId);
}
