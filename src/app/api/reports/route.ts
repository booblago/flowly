import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  enableBoardShare,
  getBoardReportByToken,
  getBoardReportCsv,
} from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (token) {
    const report = await getBoardReportByToken(token);
    if (!report) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ report });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const boardId = url.searchParams.get("boardId");
  const format = url.searchParams.get("format");
  if (!boardId) {
    return NextResponse.json({ error: "boardId required" }, { status: 400 });
  }
  try {
    if (format === "csv") {
      const csv = await getBoardReportCsv(boardId, session.user.id);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="flowly-${boardId}.csv"`,
        },
      });
    }
    const shareToken = await enableBoardShare(boardId, session.user.id);
    const report = await getBoardReportByToken(shareToken);
    return NextResponse.json({
      shareUrl: `/report/${shareToken}`,
      shareToken,
      report,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

const postSchema = z.object({
  boardId: z.string(),
  action: z.enum(["share", "csv"]).default("share"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = postSchema.parse(await req.json());
    if (body.action === "csv") {
      const csv = await getBoardReportCsv(body.boardId, session.user.id);
      return NextResponse.json({ csv });
    }
    const shareToken = await enableBoardShare(body.boardId, session.user.id);
    return NextResponse.json({
      shareToken,
      shareUrl: `/report/${shareToken}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
