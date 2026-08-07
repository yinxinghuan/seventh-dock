export async function handleApi(request) {
  const pathname = new URL(request.url).pathname
  if (request.method === 'GET' && pathname === '/api/health') {
    return Response.json({ ok: true, service: 'seventh-dock', mode: 'static-story' })
  }
  return Response.json({ ok: false, code: 'NOT_FOUND' }, { status: 404 })
}
