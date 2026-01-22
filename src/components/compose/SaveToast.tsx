"use client";

type SaveToastProps = {
  message: string;
  status: "success" | "error" | "";
};

export default function SaveToast({ message, status }: SaveToastProps) {
  if (!message) return null;

  return (
    <div
      className={`fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-2xl border px-4 py-3 text-sm shadow-lg ${
        status === "success"
          ? "border-emerald-200 bg-emerald-500 text-white"
          : "border-rose-200 bg-rose-500 text-white"
      }`}
    >
      {message}
    </div>
  );
}
