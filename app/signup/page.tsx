import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SignupForm from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <>
      <Navbar />
      <main className="container-page flex justify-center py-16">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-ink">Create your account</h1>
          <p className="mt-1 text-sm text-ink/50">
            Join GaventGo to discover events or start selling tickets.
          </p>
          <SignupForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
