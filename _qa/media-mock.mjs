export const MEDIA_GENERATION_URL = 'https://game.aiwaves.tech/alteru-media/api/v1/images/generations'

const pixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='

export async function installMediaMock(page, options = {}) {
  const { url = pixel, fail = false } = options
  await page.route(MEDIA_GENERATION_URL, async (route) => {
    if (fail) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'QA_UNAVAILABLE', message: 'QA media failure', retryable: false } }),
      })
      return
    }
    const body = route.request().postDataJSON()
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        task_id: `qa-media-${body.request_id || 'request'}`,
        request_id: body.request_id || 'qa-request',
        status: 'succeeded',
        media: { type: 'image', url, width: 512, height: 512, format: 'png' },
      }),
    })
  })
}
