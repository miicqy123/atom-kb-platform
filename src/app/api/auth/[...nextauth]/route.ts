// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

// Mock users for development
const mockUsers = [
  {
    id: "1",
    email: "admin@demo.com",
    name: "Admin User",
    role: "SUPER_ADMIN",
    tenantId: "demo-tenant",
    passwordHash: "$2a$10$9UJdZgTk803bsfm140sO.e5XECJGHtGCKFcZJqJS4G2Gl5zG6uHlO" // Hash for "password"
  }
];

const handler = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Find user in mock data
        const user = mockUsers.find(u => u.email === credentials?.email);

        if (!user || !user.passwordHash) return null;

        // Compare the provided password with the hashed password
        const valid = await compare(credentials.password as string, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.tenantId = (user as any).tenantId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub!;
        (session.user as any).role = token.role;
        (session.user as any).tenantId = token.tenantId;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
});

export { handler as GET, handler as POST };