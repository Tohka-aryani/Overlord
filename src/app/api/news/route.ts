import { connection, NextResponse } from "next/server";
import { queryNews } from "@/lib/news-query";

export async function GET() {
  await connection();
  const data = await queryNews();
  return NextResponse.json(data);
}
