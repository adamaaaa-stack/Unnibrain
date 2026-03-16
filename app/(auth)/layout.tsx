export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-5 py-10">
      <div className="card-surface w-full p-6 sm:p-8">{children}</div>
    </main>
  );
}
