import { supabase } from './supabase'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://skillswap-api.mishrakrati789.workers.dev').replace(/\/$/, '').replace(/\/api\/v1$/, '')

export class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export async function apiRequest(path, { token, ...options } = {}) {
  let accessToken = token
  if (!accessToken && supabase) {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    accessToken = data.session?.access_token
  }

  let response
  try {
    const apiPath = path.startsWith('/api/v1/') ? path : `/api/v1${path.startsWith('/') ? path : `/${path}`}`
    response = await fetch(`${API_BASE_URL}${apiPath}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
    })
  } catch (error) {
    throw new ApiError('Could not reach SkillSwap. Check your connection and try again.', { details: error })
  }

  const body = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok || body?.success === false) {
    if (response.status === 401 && accessToken && supabase) {
      const { data: refreshed } = await supabase.auth.refreshSession()
      if (refreshed.session?.access_token && refreshed.session.access_token !== accessToken) {
        const retry = await fetch(response.url, { ...options, headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${refreshed.session.access_token}`, ...options.headers } })
        const retryBody = retry.status === 204 ? null : await retry.json().catch(() => null)
        if (retry.ok && retryBody?.success !== false) return retryBody?.success === true ? retryBody.data : retryBody
      }
      await supabase.auth.signOut()
    }
    const errorBody = body?.error
    throw new ApiError(errorBody?.message || body?.message || `Request failed (${response.status}). Please try again.`, {
      status: response.status,
      code: errorBody?.code,
      details: errorBody?.details,
    })
  }
  return body?.success === true ? body.data : body
}

export function apiData(response) {
  return response
}

export function apiErrorMessage(error) {
  if (error instanceof ApiError) {
    const details = Array.isArray(error.details)
      ? error.details.map(detail => [detail.field, detail.message].filter(Boolean).join(': ')).filter(Boolean)
      : []
    return [error.message, ...details].join('\n')
  }
  return error?.message || 'Something went wrong. Please try again.'
}
