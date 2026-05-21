type Props = {
  label: string;
};

export function ChatLoadingDots({ label }: Props) {
  return (
    <div className="flex items-center gap-2 py-1 text-gray-500 dark:text-gray-400">
      <span className="flex gap-1">
        <span className="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce [animation-delay:300ms]" />
      </span>
      <span>{label}</span>
    </div>
  );
}
