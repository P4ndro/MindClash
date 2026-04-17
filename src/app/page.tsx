import { SignInButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();
  const isSignedIn = Boolean(userId);

  return (
    <main className="center-stack">
      <h1>Auth Starter</h1>
      {!isSignedIn ? (
        <>
        <p>Sign in to test Clerk + Convex auth.</p>
        <SignInButton />
        </>
      ) : (
        <>
        <p>You are signed in.</p>
        <UserButton />
        </>
      )}
    </main>
  );
}
