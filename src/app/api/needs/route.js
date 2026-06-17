import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET  —— 获取所有需求列表
export async function GET() {
  try {
    const needs = await prisma.need.findMany({
      include: {
        submitter: true,      // 顺便查出提交人信息
        _count: {
          select: { votes: true }  // 顺便数出投票数
        }
      },
      orderBy: {
        createdAt: "desc"     // 最新的排前面
      }
    });

    return NextResponse.json(needs);
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
    const body = await request.json();
    const { title, description, submitterName } = body;

    // 校验：标题不能为空
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "需求标题不能为空" },
        { status: 400 }
      );
    }

    // 查找或创建提交人
    const submitterName_final = submitterName || "匿名";
    let user = await prisma.user.findFirst({
      where: { name: submitterName_final }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: submitterName_final,
          role: "submitter"
        }
      });
    }

    // 创建需求
    const need = await prisma.need.create({
      data: {
        title: title.trim(),
        description: description || "",
        submitterId: user.id,
      },
      include: {
        submitter: true,
        _count: {
          select: { votes: true }
        }
      }
    });

    return NextResponse.json(need, { status: 201 });
  } catch (error) {
    console.error("创建需求失败:", error);
    return NextResponse.json(
      { error: "创建需求失败" },
      { status: 500 }
    );
  }
}
