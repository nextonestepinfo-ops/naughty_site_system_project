import { NextResponse } from "next/server";
import { getDeploymentReadiness } from "@/lib/integrations/deployment-readiness";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ data: getDeploymentReadiness() });
}

