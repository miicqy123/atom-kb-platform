import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const handler = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          console.log("[AUTH] authorize called with email:", credentials?.email);
          if (!credentials?.email || !credentials?.password) {
            console.log("[AUTH] missing credentials");
            return null;
          }

          console.log("[AUTH] looking up user in database...");
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });
          console.log("[AUTH] user found:", !!user, "has password:", !!user?.passwordHash);

          if (!user || !user.passwordHash) {
            console.log("[AUTH] no user or no password hash");
            return null;
          }

          const valid = await compare(credentials.password, user.passwordHash);
          console.log("[AUTH] password valid:", valid);

          if (!valid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId: user.tenantId,
          };
        } catch (error) {
          console.error("[AUTH] error in authorize:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.tenantId = user.tenantId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.role = token.role;
        session.user.tenantId = token.tenantId;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
});

export { handler as GET, handler as POST };