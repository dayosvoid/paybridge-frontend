import { useState, type FormEvent } from "react";

export interface LoginFormProps {
  onSubmit: (values: { email: string; password: string }) => void;
  submitting: boolean;
  formError?: string;
  fieldErrors?: {
    email?: string;
    password?: string;
  };
  onGoToRegister: () => void;
}

export function LoginForm({
  onSubmit,
  submitting,
  formError,
  fieldErrors,
  onGoToRegister,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ email: email.trim(), password });
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:grid lg:grid-cols-2 lg:gap-10 lg:px-10">
      <section className="mx-auto flex w-full max-w-md flex-col justify-center lg:mx-0 lg:max-w-none lg:px-8 xl:px-16">
        <div aria-label="PayBridge" className="mb-8 inline-flex items-center gap-3 self-start">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-lg font-bold text-white" aria-hidden="true">
            P
          </span>
          <span>
            <span className="block text-xl font-bold tracking-tight">PayBridge</span>
            <span className="block text-xs text-slate-500">Multi-currency payments</span>
          </span>
        </div>

        <div className="mb-7">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Welcome back</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Sign in to PayBridge</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Manage your accounts and move money with confidence.
          </p>
        </div>

        {formError ? (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <span className="mt-0.5 font-bold" aria-hidden="true">!</span>
            <div>
              <p className="font-semibold">We couldn't sign you in</p>
              <p className="mt-1">{formError}</p>
            </div>
          </div>
        ) : null}

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-slate-800">
              Email address
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(fieldErrors?.email)}
              aria-describedby={fieldErrors?.email ? "login-email-error" : undefined}
              placeholder="you@example.com"
              className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10 aria-[invalid=true]:border-red-500"
            />
            {fieldErrors?.email ? (
              <p id="login-email-error" className="mt-2 text-sm text-red-700">{fieldErrors.email}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="login-password" className="mb-2 block text-sm font-semibold text-slate-800">
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(fieldErrors?.password)}
                aria-describedby={fieldErrors?.password ? "login-password-error" : undefined}
                placeholder="Enter your password"
                className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-24 text-base outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10 aria-[invalid=true]:border-red-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-3 my-auto rounded-md px-2 text-sm font-semibold text-slate-600 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {fieldErrors?.password ? (
              <p id="login-password-error" className="mt-2 text-sm text-red-700">{fieldErrors.password}</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              <>Sign in <span aria-hidden="true">→</span></>
            )}
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-slate-600">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={onGoToRegister}
            className="font-semibold text-teal-800 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
          >
            Create an account
          </button>
        </p>

        <p className="mt-10 text-center text-xs leading-5 text-slate-500">
          Keep your sign-in details private. PayBridge will never ask you to share your password with another person.
        </p>
      </section>

      <aside className="relative mt-10 hidden min-h-[620px] overflow-hidden rounded-3xl bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full border border-white/10" />
        <div className="relative">
          <span className="inline-flex rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-slate-200">
            NGN · USD
          </span>
          <h2 className="mt-8 max-w-lg text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Your money, connected.
          </h2>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
            Access your accounts and manage transfers across currencies from one place.
          </p>
        </div>
        <div className="relative rounded-2xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm">
          <p className="text-sm text-slate-300">One place to manage</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/[0.07] p-4">
              <p className="text-xs text-slate-300">Accounts</p>
              <p className="mt-2 text-lg font-semibold">NGN &amp; USD</p>
            </div>
            <div className="rounded-xl bg-white/[0.07] p-4">
              <p className="text-xs text-slate-300">Payments</p>
              <p className="mt-2 text-lg font-semibold">Transfers &amp; FX</p>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}

