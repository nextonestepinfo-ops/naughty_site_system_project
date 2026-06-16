"use client";

import { Building2, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { LoadingPanel } from "@/components/domain/loading";
import { PageHeader } from "@/components/domain/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useScopedQuery } from "@/lib/hooks/use-api";
import type { Customer, Project } from "@/lib/types";

export default function CustomersPage() {
  const customers = useScopedQuery<Customer[]>(["customers"], "/api/customers");
  const projects = useScopedQuery<Project[]>(["projects"], "/api/projects");

  if (customers.isLoading || !customers.data) return <LoadingPanel label="顧客を読み込み中" />;

  return (
    <>
      <PageHeader title="顧客管理" description="顧客情報、連絡先、案件数、状態を確認します。Gmail履歴はPhase2で案件詳細に接続します。" />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {customers.data.map((customer) => {
          const relatedProjects = (projects.data ?? []).filter((project) => project.customerId === customer.id);
          return (
            <Card key={customer.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-panel bg-slate-100 dark:bg-white/10">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <Badge tone={customer.health === "risk" ? "red" : customer.health === "watch" ? "amber" : "green"}>{customer.health}</Badge>
                </div>
                <p className="mt-4 text-lg font-bold">{customer.company}</p>
                <p className="text-sm text-slate-500">{customer.name}</p>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">{customer.notes}</p>
                <div className="mt-4 space-y-2 text-sm">
                  <p className="flex items-center gap-2 text-slate-500">
                    <Mail className="h-4 w-4" />
                    {customer.email}
                  </p>
                  <p className="flex items-center gap-2 text-slate-500">
                    <Phone className="h-4 w-4" />
                    {customer.phone}
                  </p>
                </div>
                <div className="mt-4 rounded-panel bg-slate-50 p-3 dark:bg-white/5">
                  <p className="text-sm font-semibold">案件 {relatedProjects.length}件</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {relatedProjects.slice(0, 3).map((project) => (
                      <Link key={project.id} href={`/projects/${project.id}`} className="rounded-full bg-white px-2 py-1 text-xs text-accent dark:bg-slate-950">
                        {project.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </>
  );
}

