import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {
  findUserByEmail,
  findUserById,
  isEmailVerified,
  toPublicUser,
  userImage,
  verifyPassword,
} from "./db";
import { normalizeEmail } from "./email";
import { isOwnerEmail } from "./owner";
import { rateLimit } from "./rate-limit";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = normalizeEmail(String(credentials?.email ?? ""));
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const limited = await rateLimit(`login:${email}`, 10, 15 * 60 * 1000);
        if (!limited.ok) {
          throw new Error(`Too many login attempts. Try again in ${limited.retryAfterSec}s.`);
        }

        const user = await findUserByEmail(email);
        if (!user) return null;
        const ok = await verifyPassword(user, password);
        if (!ok) return null;
        if (!isEmailVerified(user)) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }
        const pub = toPublicUser(user);
        return {
          id: pub.id,
          name: pub.name,
          email: pub.email,
          image: userImage(user),
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
      }
      if (trigger === "update" && session?.user) {
        if (session.user.name) token.name = session.user.name;
        if (session.user.email) token.email = session.user.email;
        if (session.user.image !== undefined) token.picture = session.user.image;
      }
      if (token.id) {
        const fresh = await findUserById(String(token.id));
        if (fresh) {
          token.name = fresh.name;
          token.email = fresh.email;
          token.picture = userImage(fresh);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = (token.name as string) ?? session.user.name;
        session.user.email = (token.email as string) ?? session.user.email;
        session.user.image = (token.picture as string) ?? session.user.image;
        session.user.isOwner = isOwnerEmail(session.user.email);
      }
      return session;
    },
  },
  trustHost: true,
});
