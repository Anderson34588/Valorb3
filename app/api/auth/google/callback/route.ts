import { handleHappySeedsCallback } from "../../../../../lib/happyseeds-platform-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handleHappySeedsCallback(request);
}
