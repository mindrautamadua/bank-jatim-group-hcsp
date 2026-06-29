'use client'

import { useActionState, useState } from 'react'
import { loginAction, type LoginState } from '@/app/login/actions'
import { Eye, EyeOff, LogIn, AlertCircle, Loader2 } from 'lucide-react'

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {})
  const [show, setShow] = useState(false)

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={next} />

      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-bbred/30 bg-red-50 px-3.5 py-3 text-sm text-bbred"
        >
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium text-bbink">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="nama@jatimgroup.co.id"
          className="rounded-lg border border-bbborder bg-white px-3.5 py-2.5 text-sm text-bbink outline-none transition-colors placeholder:text-bbfaint focus:border-bbgreen focus:ring-2 focus:ring-bbgreen/20"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium text-bbink">
          Kata sandi
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            required
            placeholder="Masukkan kata sandi"
            className="w-full rounded-lg border border-bbborder bg-white px-3.5 py-2.5 pr-11 text-sm text-bbink outline-none transition-colors placeholder:text-bbfaint focus:border-bbgreen focus:ring-2 focus:ring-bbgreen/20"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            className="bb-press absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-bbmuted transition-colors hover:text-bbink"
          >
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="bb-press flex w-full items-center justify-center gap-2 rounded-lg bg-bbgreen px-4 py-3 text-sm font-semibold text-white shadow-[var(--bb-shadow-md)] transition-colors hover:bg-bbgreen-dark disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? (
          <>
            <Loader2 size={17} className="animate-spin" /> Memverifikasi
          </>
        ) : (
          <>
            <LogIn size={17} /> Masuk
          </>
        )}
      </button>
    </form>
  )
}
