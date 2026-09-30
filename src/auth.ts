import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq, sql } from "drizzle-orm";
import NextAuth from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import { mkdir, writeFile } from "node:fs/promises";
import { createTransport } from "nodemailer";
import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "database" },
  trustHost: true,
  pages: {
    signIn: "/login",
    verifyRequest: "/login/sent",
  },
  providers: [
    Nodemailer({
      server: process.env.EMAIL_SERVER ?? "smtp://127.0.0.1:1025",
      from: process.env.EMAIL_FROM ?? "Scoter <scoter@localhost>",
      async sendVerificationRequest({ identifier, url }) {
        if (process.env.NODE_ENV !== "production") {
          await mkdir("data", { recursive: true });
          await writeFile("data/dev-magic-link.txt", `${identifier}\n${url}\n`, "utf8");
          console.log(`magic link for ${identifier}: ${url}`);
          return;
        }
        if (!process.env.EMAIL_SERVER) {
          throw new Error("EMAIL_SERVER가 없으면 메일을 보낼 수 없습니다.");
        }
        const transport = createTransport(process.env.EMAIL_SERVER);
        await transport.sendMail({
          to: identifier,
          from: process.env.EMAIL_FROM ?? "Scoter <scoter@localhost>",
          subject: "Scoter 로그인 링크",
          text: url,
        });
      },
    }),
  ],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
      if (count === 1) {
        await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id));
      }
    },
  },
});
