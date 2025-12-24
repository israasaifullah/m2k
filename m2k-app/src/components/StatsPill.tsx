import type { LucideIcon } from "lucide-react";

interface StatsPillProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color?: "blue" | "green" | "purple" | "orange" | "red" | "default";
  size?: "sm" | "md" | "lg";
}

const colorClasses = {
  blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
  green: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
  purple: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
  orange: "from-orange-500/20 to-orange-600/10 border-orange-500/30",
  red: "from-red-500/20 to-red-600/10 border-red-500/30",
  default: "from-[var(--geist-accents-2)] to-[var(--geist-accents-1)] border-[var(--geist-accents-3)]",
};

const iconColorClasses = {
  blue: "text-blue-400",
  green: "text-emerald-400",
  purple: "text-purple-400",
  orange: "text-orange-400",
  red: "text-red-400",
  default: "text-[var(--geist-accents-5)]",
};

const sizeClasses = {
  sm: "px-3 py-2 gap-2",
  md: "px-4 py-3 gap-3",
  lg: "px-5 py-4 gap-4",
};

const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
};

const textSizes = {
  sm: { label: "text-xs", value: "text-sm" },
  md: { label: "text-xs", value: "text-lg" },
  lg: { label: "text-sm", value: "text-xl" },
};

export function StatsPill({
  icon: Icon,
  label,
  value,
  color = "default",
  size = "md",
}: StatsPillProps) {
  return (
    <div
      className={`
        flex items-center rounded-full
        bg-gradient-to-r ${colorClasses[color]}
        border backdrop-blur-sm
        transition-all duration-200 ease-out
        hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20
        ${sizeClasses[size]}
      `}
    >
      <Icon
        size={iconSizes[size]}
        className={`${iconColorClasses[color]} shrink-0`}
        aria-hidden="true"
      />
      <div className="flex flex-col min-w-0">
        <span className={`${textSizes[size].label} text-[var(--geist-accents-5)] truncate`}>
          {label} {value}
        </span>
        {/* <span className={`${textSizes[size].value} font-semibold text-[var(--geist-foreground)] truncate`}>
          {value}
        </span> */}
      </div>
    </div>
  );
}
