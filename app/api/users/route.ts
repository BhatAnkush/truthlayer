import { auth, clerkClient } from "@clerk/nextjs/server";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const client = await clerkClient();
    const users = await client.users.getUserList({ limit: 100 });

    return Response.json(
      users.data
        .filter((user) => user.id !== userId)
        .map((user) => ({
          id: user.id,
          name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Unnamed",
          email: user.emailAddresses[0]?.emailAddress ?? "",
          avatar: user.imageUrl,
        })),
    );
  } catch {
    return Response.json(
      { message: "Could not load users. Try again." },
      { status: 500 },
    );
  }
}
