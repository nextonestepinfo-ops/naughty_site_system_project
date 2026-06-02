export type DeploymentReadiness = {
  appName: string;
  buildLabel: string;
  dataMode: "mock" | "supabase";
  openaiConfigured: boolean;
  supabasePublicConfigured: boolean;
  supabaseServiceConfigured: boolean;
  googleOAuthConfigured: boolean;
  googleSheetsConfigured: boolean;
  employeePreviewReady: boolean;
  blockers: string[];
  githubBranchUrl: string;
};

function configured(value?: string) {
  return Boolean(value?.trim());
}

export function getDeploymentReadiness(): DeploymentReadiness {
  const dataMode = process.env.NOS_OS_DATA_MODE === "supabase" ? "supabase" : "mock";
  const openaiConfigured = configured(process.env.OPENAI_API_KEY);
  const supabasePublicConfigured = configured(process.env.NEXT_PUBLIC_SUPABASE_URL) && configured(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const supabaseServiceConfigured = configured(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const googleOAuthConfigured = configured(process.env.GOOGLE_CLIENT_ID) && configured(process.env.GOOGLE_CLIENT_SECRET);
  const googleSheetsConfigured = configured(process.env.GOOGLE_SHEETS_ATTENDANCE_SPREADSHEET_ID);
  const blockers = [
    !openaiConfigured ? "OpenAI API key is not configured on the server." : null,
    !supabasePublicConfigured ? "Supabase public URL/key are not configured on the server." : null,
    !supabaseServiceConfigured ? "Supabase service role key is not configured on the server." : null,
    dataMode !== "supabase" ? "Task and project APIs are still using demo data." : null,
  ].filter((item): item is string => Boolean(item));

  return {
    appName: "Nos OS",
    buildLabel: process.env.NEXT_PUBLIC_TEST_BUILD_LABEL || "employee-preview",
    dataMode,
    openaiConfigured,
    supabasePublicConfigured,
    supabaseServiceConfigured,
    googleOAuthConfigured,
    googleSheetsConfigured,
    employeePreviewReady: blockers.length === 0,
    blockers,
    githubBranchUrl:
      process.env.NEXT_PUBLIC_GITHUB_BRANCH_URL ||
      "https://github.com/nextonestepinfo-ops/naughty_site_system_project/tree/codex/nos-os-daily-cockpit/nos-os",
  };
}

