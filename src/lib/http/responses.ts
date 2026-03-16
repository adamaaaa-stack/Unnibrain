import { NextResponse } from "next/server";

export function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export function unauthorized(error = "Unauthorized") {
  return NextResponse.json({ error }, { status: 401 });
}

export function forbidden(error = "Forbidden") {
  return NextResponse.json({ error }, { status: 403 });
}

export function tooManyRequests(error = "Too many requests") {
  return NextResponse.json({ error }, { status: 429 });
}

export function conflict(error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status: 409 });
}

export function ok<T>(data: T) {
  return NextResponse.json(data, { status: 200 });
}
