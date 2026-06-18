import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// GET —— 获取所有需求列表
export async function GET(request) {
  try {
    const supabase = getSupabase();

    // 从 URL 参数获取当前用户 id
    const { searchParams } = new URL(request.url);
    const voterIdRaw = searchParams.get("userId") || null;
    const voterId = voterIdRaw ? parseInt(voterIdRaw, 10) : null;

    // 获取需求列表
    const { data: needs, error } = await supabase
      .from("needs")
      .select(`
        *,
        submitter:users(id, name, email),
        votes:votes(count)
      `)
      .order("createdAt", { ascending: false });

    if (error) throw error;

    // 如果有 userId，批量查该用户投了哪些需求
    let votedNeedIds = new Set();
    if (voterId && needs.length > 0) {
      const { data: myVotes } = await supabase
        .from("votes")
        .select("needId")
        .eq("voterId", voterId)
        .in("needId", needs.map((n) => n.id));

      if (myVotes) {
        myVotes.forEach((v) => votedNeedIds.add(v.needId));
      }
    }

    // 组装返回数据
    const result = needs.map((need) => ({
      ...need,
      _count: { votes: need.votes?.[0]?.count ?? 0 },
      _hasVoted: votedNeedIds.has(need.id),
      submitter: Array.isArray(need.submitter)
        ? need.submitter[0]
        : need.submitter,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("获取需求列表失败:", error);
    return NextResponse.json({ error: "获取需求列表失败" }, { status: 500 });
  }
}

// POST —— 提交一条新需求
export async function POST(request) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { title, description, userId } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "需求标题不能为空" }, { status: 400 });
    }

    const submitterId = userId || null;

    if (submitterId) {
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("id", submitterId)
        .limit(1);

      if (!user || user.length === 0) {
        return NextResponse.json({ error: "用户不存在" }, { status: 400 });
      }
    }

    const { data: newNeeds, error: needError } = await supabase
      .from("needs")
      .insert({
        title: title.trim(),
        description: description || "",
        submitterId,
      })
      .select(`
        *,
        submitter:users(id, name, email),
        votes:votes(count)
      `);

    if (needError) throw needError;

    const need = newNeeds[0];
    const result = {
      ...need,
      _count: { votes: need.votes?.[0]?.count ?? 0 },
      _hasVoted: false,
      submitter: Array.isArray(need.submitter) ? need.submitter[0] : need.submitter,
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("创建需求失败:", error);
    return NextResponse.json({ error: "创建需求失败" }, { status: 500 });
  }
}
