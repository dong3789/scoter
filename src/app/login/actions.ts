"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { safeCallbackPath } from "@/server/questions";

export async function requestMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const callbackUrl = safeCallbackPath(String(formData.get("callbackUrl") ?? "/me"));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/login?error=email");

  try {
    await signIn("nodemailer", { email, redirectTo: callbackUrl, redirect: false });
  } catch (error) {
    if (isRedirect(error)) throw error;
    console.error(error);
    redirect("/login?error=auth");
  }

  redirect("/login/sent");
}

export async function logout() {
  const { signOut } = await import("@/auth");
  await signOut({ redirectTo: "/" });
}

function isRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}
