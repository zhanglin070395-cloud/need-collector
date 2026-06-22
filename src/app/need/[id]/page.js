"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";

export default function NeedDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [need, setNeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voting, setVoting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const userId =
    typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  const isOwner = need && userId && need.submitterId === parseInt(userId, 10);

  // 加载详情
  useEffect(() => {
    async function fetchDetail() {
      try {
        const res = await fetch(
          `/api/needs/${params.id}?userId=${userId || ""}`
        );
        if (!res.ok) throw new Error("加载失败");
        const data = await res.json();
        setNeed(data);
        setEditTitle(data.title);
        setEditDesc(data.description || "");

        // 同时加载评论
        const commentsRes = await fetch(`/api/needs/${params.id}/comments`);
        if (commentsRes.ok) {
          setComments(await commentsRes.json());
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [params.id, userId]);

  // 投票
  async function handleVote() {
    if (!need || voting) return;
    setVoting(true);
    try {
      const res = await fetch(`/api/needs/${need.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const { voteCount, hasVoted } = await res.json();
      setNeed((prev) => ({ ...prev, voteCount, hasVoted }));
    } catch (err) {
      console.error("投票失败:", err);
    } finally {
      setVoting(false);
    }
  }

  // 修改状态
  async function handleStatusChange(needId, newStatus) {
    try {
      const res = await fetch(`/api/needs/${needId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) return;
      setNeed((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch (error) {
      console.error("状态更新失败:", error);
    }
  }

  // 保存编辑
  async function handleSave() {
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/needs/${need.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDesc,
          userId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "保存失败");
        return;
      }
      setNeed((prev) => ({
        ...prev,
        title: editTitle.trim(),
        description: editDesc,
      }));
      setEditing(false);
    } catch (err) {
      console.error("保存失败:", err);
    } finally {
      setSaving(false);
    }
  }

  // 取消编辑
  function handleCancel() {
    setEditTitle(need.title);
    setEditDesc(need.description || "");
    setEditing(false);
  }

  // 删除需求
  async function handleDelete() {
    if (!confirm("确定要删除这个需求吗？此操作不可恢复。")) return;

    try {
      const res = await fetch(`/api/needs/${need.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "删除失败");
        return;
      }

      router.push("/"); // 删完回首页
    } catch (err) {
      console.error("删除失败:", err);
    }
  }

  // 发表评论
  async function handleCommentSubmit(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/needs/${need.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText, userId }),
      });
      if (!res.ok) return;
      const newComment = await res.json();
      setComments((prev) => [...prev, newComment]);
      setCommentText("");
    } catch (err) {
      console.error("评论失败:", err);
    } finally {
      setSubmittingComment(false);
    }
  }

  // 删除评论
  async function handleDeleteComment(commentId) {
    if (!confirm("删除这条评论？")) return;
    try {
      const res = await fetch(`/api/needs/${need.id}/comments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, userId }),
      });
      if (!res.ok) return;
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error("删除评论失败:", err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-zinc-400">加载中...</p>
      </div>
    );
  }

  if (error || !need) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center gap-4">
        <p className="text-zinc-500">{error || "需求不存在"}</p>
        <button onClick={() => router.push("/")} className="text-blue-600 hover:underline">
          ← 返回首页
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push("/")}
          className="text-sm text-blue-600 hover:underline mb-4 inline-block"
        >
          ← 返回列表
        </button>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          {/* 标题行 */}
          <div className="flex items-center justify-between mb-3">
            {editing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="flex-1 text-xl font-bold border border-zinc-300 rounded px-2 py-1 mr-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <h1 className="text-xl font-bold text-zinc-900">{need.title}</h1>
            )}
            <StatusBadge
              needId={need.id}
              currentStatus={need.status}
              onStatusChange={handleStatusChange}
            />
          </div>

          <p className="text-sm text-zinc-500 mb-4">
            提交人：{need.submitter?.name || "未知"}
            {" · "}
            {new Date(need.createdAt).toLocaleDateString("zh-CN")}
          </p>

          {/* 描述 */}
          {editing ? (
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full border border-zinc-300 rounded px-3 py-2 mb-3 h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="描述..."
            />
          ) : need.description ? (
            <div className="bg-zinc-50 rounded p-4 mb-4">
              <p className="text-zinc-700 whitespace-pre-wrap">{need.description}</p>
            </div>
          ) : null}

          {/* 操作行 */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* 投票按钮 */}
            <button
              onClick={handleVote}
              disabled={voting}
              className={`px-4 py-2 rounded-full border transition-colors ${
                need.hasVoted
                  ? "bg-green-100 text-green-700 border-green-300"
                  : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200"
              } disabled:opacity-50`}
            >
              {voting ? "..." : need.hasVoted ? "✅ 已支持" : "👍 支持"}
            </button>
            <span className="text-zinc-500 text-sm">{need.voteCount} 人支持</span>

            {/* 编辑 / 保存 / 取消 */}
            {isOwner && !editing && (
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => setEditing(true)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  ✏️ 编辑
                </button>
                <button
                  onClick={handleDelete}
                  className="text-sm text-red-500 hover:underline"
                >
                  🗑️ 删除
                </button>
              </div>
            )}
            {editing && (
              <div className="ml-auto flex gap-2">
                <button
                  onClick={handleCancel}
                  className="text-sm px-3 py-1 border border-zinc-300 rounded hover:bg-zinc-50"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 投票人列表 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">支持者（{need.voteCount}）</h2>
          {need.votes && need.votes.length > 0 ? (
            <div className="space-y-2">
              {need.votes.map((vote) => (
                <div
                  key={vote.id}
                  className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0"
                >
                  <span className="text-sm text-zinc-700">
                    👤 {vote.voter?.name || "未知"}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {new Date(vote.createdAt).toLocaleString("zh-CN")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">还没有人支持，来做第一个吧！</p>
          )}
        </div>

        {/* 评论区 */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">
            评论（{comments.length}）
          </h2>

          {comments.length === 0 ? (
            <p className="text-sm text-zinc-400 mb-4">暂无评论</p>
          ) : (
            <div className="space-y-3 mb-6">
              {comments.map((c) => (
                <div key={c.id} className="py-2 border-b border-zinc-100 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-700">
                      {c.author?.name || "未知"}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {new Date(c.createdAt).toLocaleString("zh-CN")}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 mt-1">{c.content}</p>
                  {userId && parseInt(userId) === c.authorId && (
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      className="text-xs text-red-400 hover:text-red-600 mt-1"
                    >
                      删除
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleCommentSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="输入评论..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 border border-zinc-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              disabled={submittingComment}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submittingComment ? "..." : "发送"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
