// Legacy route - redirects to versioned API
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  url.pathname = url.pathname.replace('/api/project', '/api/v1/project');
  return NextResponse.redirect(url);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  url.pathname = url.pathname.replace('/api/project', '/api/v1/project');
  return NextResponse.redirect(url, { status: 307 });
}

