import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const ALLOWED_STATUSES = ["待评审", "已排期", "已上线", "已拒绝"];

// GET —— 获取需求列表（支持筛选+排序）
export async function GET(request) {
  try {
    const supabase = getSupabase();

    const { searchParams } = new URL(request.url);
    const voterIdRaw = searchParams.get("userId") || null;
    const voterId = voterIdRaw ? parseInt(voterIdRaw, 10) : null;
    const status = searchParams.get("status") || null;
    const sort = searchParams.get("sort") || "time"; // time | votes
    const search = searchParams.get("search") || null;

    // 构建查询
    let query = supabase
      .from("needs")
      .select(`
        *,
        submitter:users(id, name, email),
        votes:votes(count)
      `);

    // 按状态筛选
    if (status && ALLOWED_STATUSES.includes(status)) {
      query = query.eq("status", status);
    }

    // 按标题搜索
    if (search && search.trim()) {
      query = query.ilike("title", `%${search.trim()}%`);
    }

    // 排序
    if (sort === "votes") {
      // Supabase 不支持按关联表 count 直接排序，用本地排序代替
      query = query.order("createdAt", { ascending: false });
    } else {
      query = query.order("createdAt", { ascending: false });
    }

    const { data: needs, error } = await query;

    if (error) throw error;

    // 如果是按票数排序，前端自己排
    let sorted = needs;
    if (sort === "votes") {
      sorted = needs.sort((a, b) => {
        const aVotes = a.votes?.[0]?.count ?? 0;
        const bVotes = b.votes?.[0]?.count ?? 0;
        return bVotes - aVotes;
      });
    }

    // 查当前用户投了哪些需求
    let votedNeedIds = new Set();
    if (voterId && sorted.length > 0) {
      const { data: myVotes } = await supabase
        .from("votes")
        .select("needId")
        .eq("voterId", voterId)
        .in("needId", sorted.map((n) => n.id));

      if (myVotes) {
        myVotes.forEach((v) => votedNeedIds.add(v.needId));
      }
    }

    const result = sorted.map((need) => ({
      ...need,
      _count: { votes: need.votes?.[0]?.count ?? 0 },
      _hasVoted: votedNeedIds.has(need.id),
      submitter: Array.isArray(need.submitter) ? need.submitter[0] : need.submitter,
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
