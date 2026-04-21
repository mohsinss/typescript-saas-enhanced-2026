# 03 — Authentication (Clerk)

**Phase:** 1 · **Depends on:** 01, 02 · **P0**

Replaces NextAuth v4 + JWT + Google-only with Clerk. Clerk ships orgs, RBAC, MFA, social logins, magic links, session management, and billing out of the box — saves 2–3 weeks per new app.

## Goal

- Clerk handles all auth flows (sign-in, sign-up, password reset, MFA, OAuth, magic links).
- `ClerkProvider` wraps the app; `clerkMiddleware()` guards routes via `proxy.ts`.
- Every Clerk user is synced into Postgres `users` via a webhook (source of truth for app-specific data stays in Postgres).
- Server helpers (`requireUser`, `requireOrg`) for route handlers and Server Components.

## Stack

- **`@clerk/nextjs`** (latest) — per the official docs the user provided.
- **`svix`** — for verifying Clerk webhooks.

## Steps

### 1. Create a Clerk application

1. Sign up at https://clerk.com, create an application.
2. Enable desired auth methods (Email, Google, GitHub, passkeys, etc.).
3. Copy keys to `.env.local`:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_XXX
   CLERK_SECRET_KEY=sk_test_XXX
   ```
4. Webhook signing secret — see step 6.

### 2. Install

```bash
pnpm add @clerk/nextjs svix
pnpm remove next-auth @auth/mongodb-adapter bcryptjs @types/bcryptjs
```

### 3. `proxy.ts` (Clerk middleware)

**Per Clerk's latest docs, the file is named `proxy.ts`, not `middleware.ts`.**

Create `proxy.ts` at the repo root:

```ts
// proxy.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/(app)(.*)",
  "/dashboard(.*)",
  "/api/v1/(ai|stripe/create-checkout|stripe/create-portal)(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

### 4. `<ClerkProvider>` in root layout

Edit `app/layout.tsx` — `<ClerkProvider>` goes **inside** `<body>`:

```tsx
// app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/components/providers";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ClerkProvider>
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
```

### 5. Sign-in / sign-up pages

Clerk's `<SignIn>` / `<SignUp>` components handle the full flow. Create catch-all routes:

```tsx
// app/(auth)/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from "@clerk/nextjs";
export default function Page() { return <SignIn />; }
```

```tsx
// app/(auth)/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from "@clerk/nextjs";
export default function Page() { return <SignUp />; }
```

Set env vars for redirects in `.env.local`:

```
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/dashboard
```

Add these to `lib/env.ts` client schema.

### 6. User header component

Per the Clerk docs provided, use `<Show>` / `<UserButton>` / `<SignInButton>` / `<SignUpButton>`:

```tsx
// components/auth/user-button.tsx
"use client";
import { Show, UserButton, SignInButton, SignUpButton } from "@clerk/nextjs";

export function AuthHeader() {
  return (
    <div className="flex items-center gap-2">
      <Show when="signed-out">
        <SignInButton />
        <SignUpButton />
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </div>
  );
}
```

**Do NOT use `<SignedIn>` / `<SignedOut>`** — those are deprecated; use `<Show when="signed-in">` / `<Show when="signed-out">`.

### 7. Server-side helpers

```ts
// lib/auth/clerk.ts
import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserByClerkId } from "@/lib/db/queries/users";

export async function requireUser() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const user = await getUserByClerkId(userId);
  if (!user) {
    // Webhook hasn't synced yet — fall back to Clerk data
    const clerk = await currentUser();
    if (!clerk) redirect("/sign-in");
    return {
      clerkId: clerk.id,
      email: clerk.emailAddresses[0]?.emailAddress ?? "",
      name: clerk.firstName ?? null,
      imageUrl: clerk.imageUrl,
      dbUser: null as null,
    };
  }
  return { clerkId: userId, dbUser: user, email: user.email, name: user.name, imageUrl: user.imageUrl };
}

export async function getOptionalUser() {
  const { userId } = await auth();
  if (!userId) return null;
  return getUserByClerkId(userId);
}
```

### 8. Webhook — sync Clerk → Postgres

In the Clerk dashboard → **Webhooks** → Add Endpoint:

- URL: `https://your-app.com/api/v1/webhook/clerk`
- Events: `user.created`, `user.updated`, `user.deleted`
- Copy signing secret → `CLERK_WEBHOOK_SIGNING_SECRET`

```ts
// app/api/v1/webhook/clerk/route.ts
import { headers } from "next/headers";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { env } from "@/lib/env";
import { upsertUserFromClerk, deleteUserByClerkId } from "@/lib/db/queries/users";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const h = await headers();
  const svixId = h.get("svix-id");
  const svixTs = h.get("svix-timestamp");
  const svixSig = h.get("svix-signature");
  if (!svixId || !svixTs || !svixSig) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.text();
  const wh = new Webhook(env.CLERK_WEBHOOK_SIGNING_SECRET);
  let evt: WebhookEvent;
  try {
    evt = wh.verify(payload, { "svix-id": svixId, "svix-timestamp": svixTs, "svix-signature": svixSig }) as WebhookEvent;
  } catch (err) {
    logger.error({ err }, "Clerk webhook signature verification failed");
    return new Response("Invalid signature", { status: 401 });
  }

  switch (evt.type) {
    case "user.created":
    case "user.updated": {
      const d = evt.data;
      await upsertUserFromClerk({
        clerkId: d.id,
        email: d.email_addresses[0]?.email_address ?? "",
        name: [d.first_name, d.last_name].filter(Boolean).join(" ") || null,
        imageUrl: d.image_url,
      });
      break;
    }
    case "user.deleted": {
      if (evt.data.id) await deleteUserByClerkId(evt.data.id);
      break;
    }
  }

  return new Response(null, { status: 200 });
}

export const runtime = "nodejs"; // svix requires Node runtime
```

### 9. Delete NextAuth artifacts

```bash
rm -rf app/api/auth/ app/api/v1/auth/
rm -f lib/auth/next-auth.ts
```

Search for stragglers:

```bash
rg "next-auth|getServerSession|NextAuthOptions" --type ts --type tsx
```

### 10. Protect dashboard layout

```tsx
// app/(app)/layout.tsx
import { requireUser } from "@/lib/auth/clerk";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <div className="flex min-h-dvh flex-col">{children}</div>;
}
```

### 11. Organizations (optional, but encouraged)

If any of your apps are multi-tenant / B2B, enable Clerk Organizations:

- Dashboard → **Organizations** → Enable.
- Add `<OrganizationSwitcher />` to the app header.
- Gate routes with `await auth.protect({ role: "org:admin" })` or permissions.

Extend the Postgres schema with an `organizations` + `org_members` table mirroring Clerk's `organization.created` webhook events (same pattern as users above).

## Verification checklist

- [ ] `pnpm dev` loads, `/sign-up` shows Clerk UI.
- [ ] After sign-up, the Clerk webhook hits `/api/v1/webhook/clerk` and a row appears in `users`.
- [ ] `requireUser()` in `app/(app)/layout.tsx` redirects unauthenticated users to `/sign-in`.
- [ ] `rg "next-auth"` returns zero results.
- [ ] `<UserButton />` renders after sign-in and opens the profile modal on click.
- [ ] Protected API route (`/api/v1/ai/chat`) returns 401 without a session, 200 with one.

## Gotchas

- **`proxy.ts`, not `middleware.ts`.** The Clerk docs you're following explicitly rename this. Do not revert.
- **`<Show>`, not `<SignedIn>`/`<SignedOut>`.** Deprecated aliases still work but throw warnings.
- **`ClerkProvider` must be inside `<body>`,** not wrapping `<html>`. This is different from older Clerk versions.
- **Webhook races.** A user might hit `/dashboard` before the webhook lands. The `requireUser()` helper above handles that by falling back to Clerk's data.
- **Don't copy Clerk metadata into Postgres you don't need.** Email, name, image, id — stop there. Clerk is the source of truth for auth; Postgres for app data.
