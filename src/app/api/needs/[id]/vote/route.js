import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// POST —— 切换投票（投/取消投）
export async function POST(request, { params }) {
  try {
    const supabase = getSupabase();
    const { id } = await params;
    const body = await request.json();
    const { userId } = body;

    const needId = parseInt(id, 10);
    const voterId = userId ? parseInt(userId, 10) : null;

    if (!voterId) {
      return NextResponse.json({ error: "用户未登录" }, { status: 400 });
    }

    // 检查是否已投过
    const { data: existingVotes } = await supabase
      .from("votes")
      .select("id")
      .eq("needId", needId)
      .eq("voterId", voterId)
      .limit(1);

    let hasVoted;

    if (existingVotes && existingVotes.length > 0) {
      // 已投过 → 取消投票
      await supabase
        .from("votes")
        .delete()
        .eq("id", existingVotes[0].id);

      hasVoted = false;
    } else {
      // 没投过 → 投票
      await supabase
        .from("votes")
        .insert({ needId, voterId });

      hasVoted = true;
    }

    // 重新统计票数
    const { count: voteCount } = await supabase
      .from("votes")
      .select("*", { count: "exact", head: true })
      .eq("needId", needId);

    return NextResponse.json({
      voteCount: voteCount ?? 0,
      hasVoted,
    });
  } catch (error) {
    console.error("投票操作失败:", error);
    return NextResponse.json({ error: "投票操作失败" }, { status: 500 });
  }
}
