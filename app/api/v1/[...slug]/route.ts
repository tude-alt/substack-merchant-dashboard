import { authenticateMerchant } from "@/lib/api/auth"
import { apiRouteNotFound, apiUnauthorized } from "@/lib/api/errors"

type RouteContext = { params: Promise<{ slug: string[] }> }

async function notFoundForPath(request: Request, context: RouteContext) {
  const auth = await authenticateMerchant(request)
  if (!auth) return apiUnauthorized()

  const { slug } = await context.params
  const path = `/api/v1/${slug.join("/")}`
  return apiRouteNotFound(path)
}

export async function GET(request: Request, context: RouteContext) {
  return notFoundForPath(request, context)
}

export async function POST(request: Request, context: RouteContext) {
  return notFoundForPath(request, context)
}

export async function PUT(request: Request, context: RouteContext) {
  return notFoundForPath(request, context)
}

export async function PATCH(request: Request, context: RouteContext) {
  return notFoundForPath(request, context)
}

export async function DELETE(request: Request, context: RouteContext) {
  return notFoundForPath(request, context)
}
