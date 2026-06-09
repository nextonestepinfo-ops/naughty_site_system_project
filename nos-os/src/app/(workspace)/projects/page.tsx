"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { PageHeader } from "@/components/domain/page-header";
import { LoadingPanel } from "@/components/domain/loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form";
import { projectStatusLabels } from "@/lib/data/labels";
import { apiFetch, useScopedQuery } from "@/lib/hooks/use-api";
import type { Customer, Employee, Project, ProjectStatus } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

const statuses = Object.entries(projectStatusLabels) as Array<[ProjectStatus, string]>;

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const projects = useScopedQuery<Project[]>(["projects"], "/api/projects");
  const employees = useScopedQuery<Employee[]>(["employees"], "/api/employees");
  const customers = useScopedQuery<Customer[]>(["customers"], "/api/customers");
  const [open, setOpen] = useState(false);

  const createProject = useMutation({
    mutationFn: (body: Partial<Project>) =>
      apiFetch<Project>("/api/projects", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const updateProject = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Project> }) =>
      apiFetch<Project>(`/api/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const deleteProject = useMutation({
    mutationFn: (id: string) => apiFetch<{ ok: boolean }>(`/api/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  if (projects.isLoading || !projects.data) return <LoadingPanel label="案件を読み込み中" />;

  const employeeMap = new Map((employees.data ?? []).map((employee) => [employee.id, employee]));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    createProject.mutate({
      name: String(form.get("name")),
      customerId: String(form.get("customerId")),
      primaryOwnerId: String(form.get("primaryOwnerId")),
      dueDate: String(form.get("dueDate")),
      budget: Number(form.get("budget")),
      status: String(form.get("status")) as ProjectStatus,
      notes: String(form.get("notes")),
    });
  }

  return (
    <>
      <PageHeader
        title="案件管理"
        description="作成、編集、削除、担当者、納期、金額、ステータスを一画面で扱います。"
        actions={
          <Button onClick={() => setOpen((value) => !value)} variant="secondary">
            <Plus className="h-4 w-4" />
            新規案件
          </Button>
        }
      />

      {open ? (
        <Card className="mb-5">
          <CardContent className="p-4">
            <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
              <Input name="name" required placeholder="案件名" />
              <Select name="customerId" required>
                {(customers.data ?? []).map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.company}</option>
                ))}
              </Select>
              <Select name="primaryOwnerId" required>
                {(employees.data ?? []).map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.name}</option>
                ))}
              </Select>
              <Input name="dueDate" required type="date" />
              <Input name="budget" placeholder="案件金額" type="number" />
              <Select name="status" defaultValue="hearing">
                {statuses.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
              <Textarea name="notes" className="md:col-span-2" placeholder="備考" />
              <div className="md:col-span-2">
                <Button disabled={createProject.isPending} type="submit">
                  <Save className="h-4 w-4" />
                  保存
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.data.map((project) => (
          <Card key={project.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/projects/${project.id}`} className="line-clamp-2 font-semibold leading-6 hover:text-accent">
                    {project.name}
                  </Link>
                  <p className="mt-1 text-sm text-slate-500">{project.customerName}</p>
                </div>
                <Badge tone={project.status === "revision" ? "red" : project.status === "completed" ? "green" : "blue"}>
                  {projectStatusLabels[project.status]}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">主担当</p>
                  <p className="font-medium">{employeeMap.get(project.primaryOwnerId)?.name ?? "未設定"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">納期</p>
                  <p className="font-medium">{formatDate(project.dueDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">金額</p>
                  <Input
                    aria-label={`${project.name}の案件金額`}
                    className="mt-1 h-9"
                    defaultValue={project.budget}
                    inputMode="numeric"
                    type="number"
                    onBlur={(event) => {
                      const budget = Number(event.target.value || 0);
                      if (budget !== project.budget) updateProject.mutate({ id: project.id, body: { budget } });
                    }}
                  />
                  <p className="mt-1 text-xs text-slate-500">{formatCurrency(project.budget)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">更新</p>
                  <p className="font-medium">{formatDate(project.updatedAt)}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Select
                  aria-label="案件ステータス"
                  value={project.status}
                  onChange={(event) => updateProject.mutate({ id: project.id, body: { status: event.target.value as ProjectStatus } })}
                >
                  {statuses.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
                <Button aria-label="案件削除" title="案件削除" variant="ghost" size="icon" onClick={() => deleteProject.mutate(project.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </>
  );
}
