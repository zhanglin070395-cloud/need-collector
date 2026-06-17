"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [needs, setNeeds] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  // ===== 页面加载时，从后端拉取需求列表 =====
  useEffect(() => {
    async function fetchNeeds() {
      try {
        const res = await fetch("/api/needs");
        const data = await res.json();
        setNeeds(data);
      } catch (error) {
        console.error("获取需求失败:", error);
      }
    }
    fetchNeeds();
  }, []); // 空数组 = 只在首次加载时执行一次

  // ===== 提交需求 =====
  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/needs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title,
          description: description,
          submitterName: "我", // 暂时写死，后面改成登录用户
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "提交失败");
        return;
      }

      const newNeed = await res.json();
      // 把后端返回的新需求（带 id、时间戳等）插到列表最前面
      setNeeds([newNeed, ...needs]);
      setTitle("");
      setDescription("");
    } catch (error) {
      console.error("提交失败:", error);
      alert("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  // ===== 页面 =====
  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">📋 需求收集池</h1>

        {/* ===== 提交表单 ===== */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow p-6 mb-8"
        >
          <h2 className="text-lg font-semibold mb-4">提交新需求</h2>

          <input
            type="text"
            placeholder="需求标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-zinc-300 rounded px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          <textarea
            placeholder="描述一下这个需求..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-zinc-300 rounded px-3 py-2 mb-4 h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? "提交中..." : "提交需求"}
          </button>
        </form>

        {/* ===== 需求列表 ===== */}
        {needs.length === 0 ? (
          <p className="text-center text-zinc-400 mt-12">
            还没有需求，来提交第一条吧 👆
          </p>
        ) : (
          <div className="space-y-3">
            {needs.map((need) => (
              <div
                key={need.id}
                className="bg-white rounded-lg shadow p-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-zinc-900">
                    {need.title}
                  </h3>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {need.status}
                  </span>
                </div>
                {need.description && (
                  <p className="text-sm text-zinc-500 mt-1">
                    {need.description}
                  </p>
                )}
                <p className="text-xs text-zinc-400 mt-2">
                  提交人：{need.submitter?.name || "未知"}
                  {" · "}
                  {need._count?.votes ?? 0} 票
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
