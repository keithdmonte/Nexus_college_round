import { currentUser } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export default async function UserMenu() {
  const user = await currentUser();
  if (!user) return null;
  return (
    <span className="flex items-center gap-3 text-zinc-400">
      <span className="font-medium text-zinc-200">{user.name}</span>
      <LogoutButton />
    </span>
  );
}
