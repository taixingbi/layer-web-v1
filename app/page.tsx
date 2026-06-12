/**
 * Root route: chat is the product entry (guest or signed-in).
 */

import { redirect } from "next/navigation";

/** Send visitors straight to the chat experience. */
export default function Home() {
  redirect("/chat");
}
