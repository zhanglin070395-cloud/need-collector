import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// POST —— 用名字登录/注册
export async function POST(request) {
  try {
    const supabase = getSupabase();
    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "名字不能为空" }, { status: 400 });
    }

    const trimmed = name.trim();

    // 查是否已有同名用户
    const { data: existing } = await supabase
      .from("users")
      .select("id, name, role")
      .eq("name", trimmed)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ id: existing[0].id, name: existing[0].name });
    }

    // 没有 → 新建
    const { data: created } = await supabase
      .from("users")
      .insert({ name: trimmed, role: "submitter" })
      .select("id, name");

    return NextResponse.json(
      { id: created[0].id, name: created[0].name },
      { status: 201 }
    );
  } catch (error) {
    console.error("认证失败:", error);
    return NextResponse.json({ error: "认证失败" }, { status: 500 });
  }
}
