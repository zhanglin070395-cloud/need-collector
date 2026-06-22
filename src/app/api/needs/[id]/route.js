import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// GET —— 获取单条需求详情（含投票人列表）
export async function GET(request, { params }) {
  try {
    const supabase = getSupabase();
    const { id } = await params;
    const needId = parseInt(id, 10);

    // 查需求详情
    const { data: need, error } = await supabase
      .from("needs")
      .select(`
        *,
        submitter:users(id, name),
        votes:votes(
          id,
          createdAt,
          voter:users(id, name)
        )
      `)
      .eq("id", needId)
      .single();

    if (error || !need) {
      return NextResponse.json({ error: "需求不存在" }, { status: 404 });
    }

    // 从 URL 获取当前用户 id
    const { searchParams } = new URL(request.url);
    const voterIdRaw = searchParams.get("userId") || null;
    const voterId = voterIdRaw ? parseInt(voterIdRaw, 10) : null;

    // 当前用户是否已投票
    const hasVoted = voterId
      ? need.votes.some((v) => v.voter?.id === voterId)
      : false;

    return NextResponse.json({
      ...need,
      voteCount: need.votes?.length ?? 0,
      hasVoted,
    });
  } catch (error) {
    console.error("获取需求详情失败:", error);
    return NextResponse.json({ error: "获取需求详情失败" }, { status: 500 });
  }
}

// PATCH —— 修改需求状态
export async function PATCH(request, { params }) {
  try {
    const supabase = getSupabase();
    const { id } = await params;
    const needId = parseInt(id, 10);
    const { status } = await request.json();

    const allowedStatuses = ["待评审", "已排期", "已上线", "已拒绝"];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: `无效状态，允许：${allowedStatuses.join("、")}` },
        { status: 400 }
      );
    }

    const { data: need, error } = await supabase
      .from("needs")
      .update({ status })
      .eq("id", needId)
      .select("id, title, status")
      .single();

    if (error || !need) {
      return NextResponse.json({ error: "更新失败" }, { status: 404 });
    }

    return NextResponse.json(need);
  } catch (error) {
    console.error("更新需求状态失败:", error);
    return NextResponse.json({ error: "更新需求状态失败" }, { status: 500 });
  }
}

// PUT —— 编辑需求（标题、描述）
export async function PUT(request, { params }) {
  try {
    const supabase = getSupabase();
    const { id } = await params;
    const needId = parseInt(id, 10);
    const { title, description, userId } = await request.json();

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
    }

    // 查原需求，验证提交人权限
    const { data: original } = await supabase
      .from("needs")
      .select("submitterId")
      .eq("id", needId)
      .single();

    if (!original) {
      return NextResponse.json({ error: "需求不存在" }, { status: 404 });
    }

    if (original.submitterId !== parseInt(userId, 10)) {
      return NextResponse.json({ error: "只能编辑自己的需求" }, { status: 403 });
    }

    const { data: need, error } = await supabase
      .from("needs")
      .update({
        title: title.trim(),
        description: description || "",
      })
      .eq("id", needId)
      .select("id, title, description")
      .single();

    if (error || !need) {
      return NextResponse.json({ error: "更新失败" }, { status: 404 });
    }

    return NextResponse.json(need);
  } catch (error) {
    console.error("编辑需求失败:", error);
    return NextResponse.json({ error: "编辑需求失败" }, { status: 500 });
  }
}

// DELETE —— 删除需求（只能删除自己的）
export async function DELETE(request, { params }) {
  try {
    const supabase = getSupabase();
    const { id } = await params;
    const needId = parseInt(id, 10);
    const { userId } = await request.json();

    // 查原需求，验证提交人权限
    const { data: original } = await supabase
      .from("needs")
      .select("submitterId")
      .eq("id", needId)
      .single();

    if (!original) {
      return NextResponse.json({ error: "需求不存在" }, { status: 404 });
    }

    if (original.submitterId !== parseInt(userId, 10)) {
      return NextResponse.json({ error: "只能删除自己的需求" }, { status: 403 });
    }

    // 先删投票记录
    await supabase.from("votes").delete().eq("needId", needId);

    // 再删需求
    const { error } = await supabase.from("needs").delete().eq("id", needId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除需求失败:", error);
    return NextResponse.json({ error: "删除需求失败" }, { status: 500 });
  }
}
