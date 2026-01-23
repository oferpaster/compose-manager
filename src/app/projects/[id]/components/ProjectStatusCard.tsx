"use client";

type ProjectStatusCardProps = {
  message: string;
};

export default function ProjectStatusCard({ message }: ProjectStatusCardProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
        {message}
      </div>
    </main>
  );
}
