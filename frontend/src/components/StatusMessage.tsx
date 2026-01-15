"use client";

interface StatusMessageProps {
  type: "success" | "error" | "info" | "warning";
  message: string;
  txHash?: string;
  onDismiss?: () => void;
}

export default function StatusMessage({ type, message, txHash, onDismiss }: StatusMessageProps) {
  const styles = {
    success: "bg-emerald-50 border-emerald-300 text-emerald-800",
    error: "bg-red-50 border-red-300 text-red-800",
    info: "bg-blue-50 border-blue-300 text-blue-800",
    warning: "bg-amber-50 border-amber-300 text-amber-800",
  };

  const icons = {
    success: "✅",
    error: "❌",
    info: "ℹ️",
    warning: "⚠️",
  };

  return (
    <div className={`p-4 rounded-xl border-2 ${styles[type]} ${onDismiss ? "relative pr-10" : ""}`}>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
      <div className="flex items-start gap-3">
        <span className="text-xl">{icons[type]}</span>
        <div className="flex-1">
          <p className="font-medium">{message}</p>
          {txHash && (
            <a
              href={`https://sepolia.mantlescan.xyz/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800 underline font-medium"
            >
              View on Mantlescan →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

