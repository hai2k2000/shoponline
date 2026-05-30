export function LoginForm({ nextPath = "/admin/dashboard", error }: { nextPath?: string; error?: string }) {
  const errorMessage = error ? "Tên đăng nhập hoặc mật khẩu không đúng." : "";

  return (
    <form action="/admin/login/submit" method="post" className="grid gap-4">
      <input type="hidden" name="next" value={nextPath} />
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Tên đăng nhập
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-emerald-600"
          name="identifier"
          type="text"
          autoComplete="username"
          defaultValue="admin"
          required
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Mật khẩu
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-emerald-600"
          name="password"
          type="password"
          autoComplete="current-password"
          defaultValue="123456"
          required
        />
      </label>
      {errorMessage ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{errorMessage}</p> : null}
      <button type="submit" className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white">Đăng nhập</button>
    </form>
  );
}
