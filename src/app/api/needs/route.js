import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// GET —— 获取所有需求列表
export async function GET() {
  try {
    const supabase = getSupabase();
    const { data: needs, error } = await supabase
      .from("needs")
      .select(`
        *,
        submitter:users(id, name, email),
        votes:votes(count)
      `)
      .order("createdAt", { ascending: false });

    if (error) throw error;

    // 转换格式，让前端读取票数更方便
    const result = needs.map((need) => ({
      ...need,
      _count: { votes: need.votes?.[0]?.count ?? 0 },
      submitter: Array.isArray(need.submitter) ? need.submitter[0] : need.submitter,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("获取需求列表失败:", error);
    return NextResponse.json(
      { error: "获取需求列表失败" },
      { status: 500 }
    );
  }
}

// POST —— 提交一条新需求
export async function POST(request) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { title, description, submitterName } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "需求标题不能为空" },
        { status: 400 }
      );
    }

    const name = submitterName || "匿名";

    // 查找或创建提交人
    let { data: users } = await supabase
      .from("users")
      .select("id, name")
      .eq("name", name)
      .limit(1);

    let user = users?.[0];

    if (!user) {
      const { data: newUsers, error: createError } = await supabase
        .from("users")
        .insert({ name, role: "submitter" })
        .select("id, name");

      if (createError) throw createError;
      user = newUsers?.[0];
    }

    // 创建需求
    const { data: newNeeds, error: needError } = await supabase
      .from("needs")
      .insert({
        title: title.trim(),
        description: description || "",
        submitterId: user.id,
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
      submitter: Array.isArray(need.submitter) ? need.submitter[0] : need.submitter,
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("创建需求失败:", error);
    return NextResponse.json(
      { error: "创建需求失败" },
      { status: 500 }
    );
  }
}
