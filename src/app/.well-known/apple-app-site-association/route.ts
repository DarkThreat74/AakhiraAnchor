import { NextResponse } from "next/server";

export const dynamic = "force-static";

/**
 * Apple Universal Links association file.
 * Served at /.well-known/apple-app-site-association
 * Tells iOS to open waqt.app links in the app instead of Safari.
 */
export async function GET() {
  const data = {
    applinks: {
      apps: [],
      details: [
        {
          appID: "TEAMID.com.waqt.app",
          paths: [
            "/prayer*",
            "/calendar*",
            "/settings*",
            "/onboarding*",
            "NOT /",
            "NOT /login",
            "NOT /signup",
            "NOT /admin*",
          ],
        },
      ],
    },
  };

  return new NextResponse(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
