/**
 * HuntAI product mark for chat header, empty state, and landing.
 */

type ChatBrandProps = {
  size?: "sm" | "md" | "lg";
  layout?: "row" | "stacked";
  showWordmark?: boolean;
  className?: string;
};

function SparkleIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2l1.2 4.2L17 7l-3.8 1.2L12 12l-1.2-3.8L7 7l3.8-.8L12 2z"
        fill="url(#huntai-sparkle)"
      />
      <path
        d="M5 14l.8 2.8L9 17l-2.5.8L5 20l-.8-2.2L2 17l2.5-.7L5 14z"
        fill="url(#huntai-sparkle)"
        opacity="0.85"
      />
      <path
        d="M17 13l.9 3.1L21 17l-2.8.9L17 21l-.9-3L13 17l2.8-.9L17 13z"
        fill="url(#huntai-sparkle)"
        opacity="0.7"
      />
      <defs>
        <linearGradient id="huntai-sparkle" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#14b8a6" />
          <stop offset="1" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function ChatBrand({
  size = "sm",
  layout = "row",
  showWordmark = true,
  className = "",
}: ChatBrandProps) {
  const iconPx = size === "lg" ? 36 : size === "md" ? 28 : 22;
  const text =
    size === "lg" ? "text-3xl" : size === "md" ? "text-xl" : "text-base";
  const stacked = layout === "stacked";
  return (
    <div
      className={`flex min-w-0 ${stacked ? "flex-col items-center gap-3" : "flex-row items-center gap-2.5"} ${className}`}
    >
      <span
        className="chat-brand-icon shrink-0 flex items-center justify-center rounded-xl"
        style={{ width: iconPx + 14, height: iconPx + 14 }}
        aria-hidden
      >
        <SparkleIcon size={iconPx} />
      </span>
      {showWordmark ? (
        <span className={`font-semibold tracking-tight text-[#0d0d0d] dark:text-[#ececec] ${text}`}>
          HuntAI
        </span>
      ) : null}
    </div>
  );
}
