"use client";

import { useState } from "react";

const STATUSES = ["待评审", "已排期", "已上线", "已拒绝"];

const STATUS_COLORS = {
  待评审: "bg-blue-100 text-blue-800",
  已排期: "bg-yellow-100 text-yellow-800",
  已上线: "bg-green-100 text-green-800",
  已拒绝: "bg-red-100 text-red-800",
};

export default function StatusBadge({ needId, currentStatus, onStatusChange }) {
  const [open, setOpen] = useState(false);

  function handleSelect(status) {
    setOpen(false);
    if (status !== currentStatus) {
      onStatusChange(needId, status);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className={`text-xs px-2 py-1 rounded-full cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-zinc-300 transition-all ${STATUS_COLORS[currentStatus] || "bg-zinc-100 text-zinc-700"}`}
      >
        {currentStatus} ▾
      </button>

      {open && (
        <div
          className="absolute right-0 top-7 bg-white border border-zinc-200 rounded-lg shadow-lg z-10 py-1 min-w-[100px]"
          onClick={(e) => e.stopPropagation()}
        >
          {STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => handleSelect(status)}
              className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-50 ${
                status === currentStatus ? "font-bold" : ""
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      )}

      {/* 点击外部关闭 */}
      {open && (
        <div
          className="fixed inset-0 z-0"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
