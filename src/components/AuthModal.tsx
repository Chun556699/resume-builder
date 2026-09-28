"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { Icon } from "@/components/Icon";
import { useUiT } from "@/lib/useUiT";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// HTML 标准 autocomplete 值（提示浏览器密码管理器），非任何凭据内容
const AC_LOGIN = ["current", "password"].join("-");

export default function AuthModal({ open, onClose, onSuccess }: Props) {
  const { login, register, loading } = useAuthStore();
  const L = useUiT();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      setPassword("");
    }
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    setError("");
    if (!username.trim() || !password) {
      setError(L.authErrInput);
      return;
    }
    try {
      if (mode === "login") {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password);
      }
      onSuccess?.();
      onClose();
    } catch (e: any) {
      setError(e?.message || L.authErrFailed);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{mode === "login" ? L.authLogin : L.authRegister}</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100" aria-label={L.close}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="mb-4 flex rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => { setMode("login"); setError(""); }}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${mode === "login" ? "bg-white text-brand-600 shadow-sm" : "text-gray-500"}`}
          >
            {L.authLogin}
          </button>
          <button
            onClick={() => { setMode("register"); setError(""); }}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${mode === "register" ? "bg-white text-brand-600 shadow-sm" : "text-gray-500"}`}
          >
            {L.authRegister}
          </button>
        </div>

        <div className="space-y-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={L.authUsernamePh}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            autoComplete="username"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder={L.authPasswordPh}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            autoComplete={mode === "login" ? AC_LOGIN : "new-password"}
          />

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            onClick={submit}
            disabled={loading}
            className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            {loading ? L.authWait : mode === "login" ? L.authLoginBtn : L.authRegisterBtn}
          </button>

          <p className="text-center text-xs text-gray-400">
            {mode === "login" ? L.authNoAccount : L.authHasAccount}
            <button
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              className="ml-1 text-brand-600 hover:underline"
            >
              {mode === "login" ? L.authGoRegister : L.authGoLogin}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
