import { 
  Station, 
  Outlet, 
  OutletStatus, 
  ApiResponse, 
  NearStationsRequest,
  NearStationsResponse 
} from '../types/station'
import { 
  mergeStationsLocations, 
  extractMergedStations, 
  debugLocationMerge 
} from './locationMerger'
import { ENABLE_DEBUG } from '../config/environment'
import { gcj02ToWgs84, isInChina, wgs84ToGcj02 } from './coords'

const JITTER_AMOUNT = 0.0004

class ApiError extends Error {
  readonly url: string
  readonly status?: number
  readonly code?: string

  constructor(message: string, url: string, options: { status?: number; code?: string } = {}) {
    super(message)
    this.name = 'ApiError'
    this.url = url
    this.status = options.status
    this.code = options.code
  }
}

// 上游接口直连（上游对任意 Origin 返回 CORS 头，无需反代）
const API_BASE = 'https://wemp.issks.com'

// 基础 API 函数：直连上游，不携带凭据
async function fetchAPI<T>(path: string, options: RequestInit = {}): Promise<T | null> {
  const url = `${API_BASE}${path}`

  try {
    if (ENABLE_DEBUG) console.log(`🔄 请求: ${url}`)
    const response = await fetch(url, {
      ...options,
      mode: 'cors',
      // 上游 Access-Control-Allow-Credentials 为 true，但本站不依赖其会话，
      // 显式省略凭据以免把用户在 issks 的 Cookie 带出去
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    const data: ApiResponse<T> = await response.json()
    if (!response.ok) {
      throw new ApiError(data.msg || `HTTP error: ${response.status}`, url, {
        status: response.status,
        code: data.code
      })
    }
    if (data.code !== '1') {
      throw new ApiError(data.msg || 'API error', url, { code: data.code })
    }
    if (ENABLE_DEBUG) console.log(`✅ 请求成功`)
    return data.data
  } catch (error) {
    throw error instanceof Error ? error : new ApiError('API 请求失败', url)
  }
}

// 获取附近充电站
export async function fetchNearStations(
  // 默认位置（WGS84）
  lat = 30.757444430112365,
  lng = 103.9273601548557,
  options: { coordFix?: boolean } = {}
): Promise<Station[]> {
  if (ENABLE_DEBUG) console.log('🔍 开始获取附近充电站...', { lat, lng })
  
  const url = '/device/v1/near/station'

  const coordFix = options.coordFix ?? true
  const requestCoord = coordFix && isInChina(lat, lng) ? wgs84ToGcj02(lat, lng) : { lat, lng }
  
  const body: NearStationsRequest = {
    page: 1,
    pageSize: 200,
    scale: 3,
    latitude: requestCoord.lat,
    longitude: requestCoord.lng,
    userLatitude: requestCoord.lat,
    userLongitude: requestCoord.lng
  }
  
  const data = await fetchAPI<NearStationsResponse>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    body: JSON.stringify(body)
  })
  
  const apiStations = data?.elecStationData || []
  if (ENABLE_DEBUG) console.log(`📡 API返回 ${apiStations.length} 个充电站`)
  
  // 合并硬编码位置信息
  const mergeResults = mergeStationsLocations(apiStations)
  const mergedStations = extractMergedStations(mergeResults)
  
  // 打印位置合并统计信息
  const stats = debugLocationMerge(mergeResults, false)
  if (ENABLE_DEBUG) console.log(`🗺️ 位置合并完成: ${stats.hardcoded}/${stats.total} 使用硬编码位置`)
  
  if (!coordFix) return mergedStations

  return mergedStations.map((s) => {
    if (!isInChina(s.latitude, s.longitude)) return s
    const fixed = gcj02ToWgs84(s.latitude, s.longitude)
    return { ...s, latitude: fixed.lat, longitude: fixed.lng }
  })
}

// 获取充电站插座信息
export async function fetchStationOutlets(stationId: number): Promise<Outlet[]> {
  const url = `/charge/v1/outlet/station/outlets/${stationId}`
  const data = await fetchAPI<Outlet[]>(url)
  return data || []
}

// 获取插座状态
export async function fetchOutletStatus(outletNo: string): Promise<OutletStatus | null> {
  const url = `/charge/v1/charging/outlet/${outletNo}`
  return await fetchAPI<OutletStatus>(url)
}

// 应用坐标抖动以避免重叠
export function applyJitter(stations: Station[]): Station[] {
  // 保持抖动稳定：避免每次刷新 marker “抖来抖去”
  const mulberry32 = (seed: number) => {
    let t = seed >>> 0
    return () => {
      t += 0x6d2b79f5
      let r = Math.imul(t ^ (t >>> 15), 1 | t)
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296
    }
  }

  const distanceSq = (p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) =>
    (p1.lat - p2.lat) ** 2 + (p1.lng - p2.lng) ** 2

  const minDistanceSq = 0.0003 ** 2
  const occupied: Array<{ lat: number; lng: number }> = []

  return [...stations]
    .sort((a, b) => (a.stationId ?? 0) - (b.stationId ?? 0))
    .map((station) => {
      let newLat = station.latitude
      let newLng = station.longitude
      const rand = mulberry32((station.stationId ?? 0) + 0x9e3779b9)

      for (let attempts = 0; attempts < 100; attempts++) {
        const collides = occupied.some((p) => distanceSq({ lat: newLat, lng: newLng }, p) < minDistanceSq)
        if (!collides) break
        newLat += (rand() - 0.5) * JITTER_AMOUNT
        newLng += (rand() - 0.5) * JITTER_AMOUNT
      }

      occupied.push({ lat: newLat, lng: newLng })
      return { ...station, latitude: newLat, longitude: newLng }
    })
}

// 根据可用性获取颜色
export function getColorForAvailability(ratio: number): string {
  if (ratio < 0 || isNaN(ratio)) return '#9ca3af' // gray
  if (ratio === 0) return '#b91c1c' // red
  
  const hue = ratio * 120
  const lightness = 45 + (ratio * 15)
  const saturation = 75 + (ratio * 20)
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}
