"use client";

interface InfoCardProps {
  title: string;
  children: React.ReactNode;
  variant?: "info" | "warning" | "success";
  icon?: string;
}

export default function InfoCard({ title, children, variant = "info", icon }: InfoCardProps) {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  };

  const icons = {
    info: "ℹ️",
    warning: "⚠️",
    success: "✅",
  };

  return (
    <div className={`p-4 rounded-xl border ${styles[variant]}`}>
      <div className="flex items-start gap-2 mb-2">
        <span className="text-lg">{icon || icons[variant]}</span>
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

