"use client";

import React from "react";

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
      {children}
      {hint ? <span className="mt-0.5 block text-[11px] text-gray-400">{hint}</span> : null}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
    />
  );
}

export function Card({ title, children, onRemove, actions }: { title: string; children: React.ReactNode; onRemove?: () => void; actions?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        <div className="flex items-center gap-2">
          {actions}
          {onRemove && (
            <button
              onClick={onRemove}
              className="rounded px-1.5 py-0.5 text-xs text-red-500 transition hover:bg-red-50"
              title="删除"
            >
              删除
            </button>
          )}
        </div>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

export function AddButton({ onClick, text }: { onClick: () => void; text: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border border-dashed border-gray-300 py-2 text-sm text-gray-500 transition hover:border-brand-400 hover:text-brand-600"
    >
      + {text}
    </button>
  );
}
