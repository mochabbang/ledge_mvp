// POST /api/deploy  — GitHub Webhook 자동 배포
import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { exec } from "child_process";

export async function POST(req: NextRequest) {
  const secret = process.env.DEPLOY_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "DEPLOY_SECRET not configured" }, { status: 500 });
  }

  // GitHub 서명 검증
  const signature = req.headers.get("x-hub-signature-256") ?? "";
  const body = await req.text();
  const expected = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");

  if (signature !== expected) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // main 브랜치 push 이벤트만 처리
  let payload: { ref?: string };
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.ref !== "refs/heads/main") {
    return NextResponse.json({ skipped: true, ref: payload.ref });
  }

  // 배포 스크립트 비동기 실행 (GitHub timeout 방지)
  exec("bash /root/deploy.sh >> /root/deploy.log 2>&1", (err) => {
    if (err) console.error("[deploy] error:", err.message);
  });

  return NextResponse.json({ ok: true, message: "배포 시작됨" });
}
