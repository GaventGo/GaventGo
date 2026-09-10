import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  return (
    <>
      <Navbar />
      <main className="container-page flex justify-center py-16">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-ink">Welcome back</h1>
          <p className="mt-1 text-sm text-ink/50">
            Log in to manage your tickets or your events.
          </p>
          <LoginForm next={searchParams.next} />
        </div>
      </main>
      <Footer />
    </>
  );
}
