"use client";

import { useState, useEffect } from "react";

function getStoredUser() {
  if (typeof window === "undefined") return null;
  const id = localStorage.getItem("userId");
  const name = localStorage.getItem("userName");
  return id && name ? { id: parseInt(id), name } : null;
}

function saveUser(user) {
  localStorage.setItem("userId", user.userId || user.id);
  localStorage.setItem("userName", user.name);
}

function clearUser() {
  localStorage.removeItem("userId");
  localStorage.removeItem("userName");
}

export default function Home() {
  const [needs, setNeeds] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [votingId, setVotingId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); // { id, name }
  const [loginName, setLoginName] = useState("");
  const [loginError, setLoginError] = useState("");

  // 页面加载：尝试从 localStorage 恢复用户
  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setCurrentUser(stored);
    }
  }, []);

  // 有了用户身份后，拉取需求列表
  useEffect(() => {
    if (!currentUser) return;

    async function fetchNeeds() {
      try {
        const res = await fetch(`/api/needs?userId=${currentUser.id}`);
        const data = await res.json();
        setNeeds(data);
      } catch (error) {
        console.error("获取需求失败:", error);
      }
    }
    fetchNeeds();
  }, [currentUser]);

  // 登录/注册
  async function handleLogin(e) {
    e.preventDefault();
    if (!loginName.trim()) return;

    setLoginError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: loginName.trim() }),
      });

      if (!res.ok) throw new Error("认证失败");

      const user = await res.json();
      setCurrentUser(user);
      saveUser(user);
      setLoginName("");
    } catch (error) {
      setLoginError("登录失败，请重试");
    }
  }

  // 切换用户
  function handleLogout() {
    clearUser();
    setCurrentUser(null);
    setNeeds([]);
  }

  // 提交需求
  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/needs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          userId: currentUser.id,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "提交失败");
        return;
      }

      const newNeed = await res.json();
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

  // 投票
  async function handleVote(needId) {
    setVotingId(needId);
    try {
      const res = await fetch(`/api/needs/${needId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id }),
      });

      if (!res.ok) return;

      const { voteCount, hasVoted } = await res.json();
      setNeeds((prev) =>
        prev.map((n) =>
          n.id === needId
            ? { ...n, _count: { votes: voteCount }, _hasVoted: hasVoted }
            : n
        )
      );
    } catch (error) {
      console.error("投票失败:", error);
    } finally {
      setVotingId(null);
    }
  }

  // ====== 未登录 → 显示登录界面 ======
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow p-8 max-w-sm w-full">
          <h1 className="text-xl font-bold mb-2">📋 需求收集池</h1>
          <p className="text-sm text-zinc-500 mb-6">
            请输入你的名字开始使用
          </p>

          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="你的名字（如：张三）"
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              className="w-full border border-zinc-300 rounded px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              autoFocus
            />
            {loginError && (
              <p className="text-red-500 text-sm mb-3">{loginError}</p>
            )}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              进入
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ====== 已登录 → 正常页面 ======
  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* 顶部 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">📋 需求收集池</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">
              👤 {currentUser.name}
            </span>
            <button
              onClick={handleLogout}
              className="text-xs text-zinc-400 hover:text-zinc-600 underline"
            >
              切换
            </button>
          </div>
        </div>

        {/* 提交表单 */}
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

        {/* 需求列表 */}
        {needs.length === 0 ? (
          <p className="text-center text-zinc-400 mt-12">
            还没有需求，来提交第一条吧 👆
          </p>
        ) : (
          <div className="space-y-3">
            {needs.map((need) => (
              <div key={need.id} className="bg-white rounded-lg shadow p-4">
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
                <div className="mt-3">
                  <button
                    onClick={() => handleVote(need.id)}
                    disabled={votingId === need.id}
                    className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                      need._hasVoted
                        ? "bg-green-100 text-green-700 border-green-300"
                        : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200"
                    } disabled:opacity-50`}
                  >
                    {votingId === need.id
                      ? "..."
                      : need._hasVoted
                      ? "✅ 已支持"
                      : "👍 支持"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
