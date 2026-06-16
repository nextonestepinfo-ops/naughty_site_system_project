import { LoginClient } from "@/components/domain/login-client";
import { getLoginAccounts } from "@/lib/data/repository";

export default async function LoginPage() {
  const accounts = await getLoginAccounts().catch(() => []);
  return <LoginClient initialAccounts={accounts} />;
}
