import { useEffect, useState } from "react";

type ToastType = "success" | "error";

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 200);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = type === "success"
    ? "bg-[var(--geist-success)]"
    : "bg-[var(--geist-error)]";

  return (
    <div
      className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white text-sm shadow-lg transition-opacity duration-200 ${bgColor} ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      role="alert"
      aria-live="polite"
    >
      {message}
    </div>
  );
}

interface ToastState {
  message: string;
  type: ToastType;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  const hideToast = () => {
    setToast(null);
  };

  return { toast, showToast, hideToast };
}
