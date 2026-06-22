import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// GET —— 获取评论列表
export async function GET(request, { params }) {
  try {
    const supabase = getSupabase();
    const { id } = await params;
    const needId = parseInt(id, 10);

    const { data: comments, error } = await supabase
      .from("comments")
      .select(`
        id,
        content,
        createdAt,
        authorId,
        author:users(id, name)
      `)
      .eq("needId", needId)
      .order("createdAt", { ascending: true });

    if (error) throw error;

    return NextResponse.json(
      comments.map((c) => ({
        ...c,
        author: Array.isArray(c.author) ? c.author[0] : c.author,
      }))
    );
  } catch (error) {
    console.error("获取评论失败:", error);
    return NextResponse.json({ error: "获取评论失败" }, { status: 500 });
  }
}

// POST —— 发表评论
export async function POST(request, { params }) {
  try {
    const supabase = getSupabase();
    const { id } = await params;
    const needId = parseInt(id, 10);
    const { content, userId } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "评论不能为空" }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: "请先登录" }, { status: 400 });
    }

    const { data: comments, error } = await supabase
      .from("comments")
      .insert({
        content: content.trim(),
        needId,
        authorId: parseInt(userId, 10),
      })
      .select(`
        id,
        content,
        createdAt,
        authorId,
        author:users(id, name)
      `);

    if (error) throw error;

    const c = comments[0];
    return NextResponse.json(
      {
        ...c,
        author: Array.isArray(c.author) ? c.author[0] : c.author,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("发表评论失败:", error);
    return NextResponse.json({ error: "发表评论失败" }, { status: 500 });
  }
}

// DELETE —— 删除评论
export async function DELETE(request, { params }) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { commentId, userId } = body;

    if (!commentId || !userId) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    // 验证是作者本人
    const { data: comment } = await supabase
      .from("comments")
      .select("authorId")
      .eq("id", parseInt(commentId, 10))
      .single();

    if (!comment) {
      return NextResponse.json({ error: "评论不存在" }, { status: 404 });
    }
    if (comment.authorId !== parseInt(userId, 10)) {
      return NextResponse.json({ error: "只能删除自己的评论" }, { status: 403 });
    }

    await supabase.from("comments").delete().eq("id", parseInt(commentId, 10));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除评论失败:", error);
    return NextResponse.json({ error: "删除评论失败" }, { status: 500 });
  }
}
