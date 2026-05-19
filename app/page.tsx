/**
 * Marketing-style landing page with links to chat, sign-in, and sign-up.
 */

/** Root route: navigation hub for the huntAI web app. */
export default function Home() {
  return (
    <div className="w-screen h-screen flex items-center justify-center flex-col gap-4">
      <a href="/chat" className="text-3xl font-bold">
        Go to chat &#8594;
      </a>
      <div className="flex gap-4 text-lg">
        <a href="/login" className="text-[#10a37f] hover:underline">
          Sign in
        </a>
        <a href="/signup" className="text-[#10a37f] hover:underline">
          Sign up
        </a>
      </div>
      <p className="opacity-60 text-sm">Instructions in the README.md</p>
    </div>
  );
}
