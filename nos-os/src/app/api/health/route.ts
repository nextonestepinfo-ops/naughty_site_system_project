import { NextResponse } from "next/server";
import { getDeploymentReadiness } from "@/lib/integrations/deployment-readiness";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ data: await getDeploymentReadiness() });
}
