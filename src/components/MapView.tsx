import maplibregl from 'maplibre-gl'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card } from '@heroui/react'
import { useStationStore } from '../store/stationStore'
import { useSettingsStore } from '../store/settingsStore'
import { useThemeStore } from '../store/themeStore'
import { useVisitorsCount } from '../hooks/useVisitorsCount'
import type { Station } from '../types/station'
import { getColorForAvailability } from '../utils/api'
import SearchBar from './SearchBar'
import StationDetailModal from './StationDetailModal'
import LoadingSpinner from './LoadingSpinner'
import CampusMapModal from './CampusMapModal'
import { CampusIcon, QrCodeIcon, RefreshIcon } from './icons'

// 默认位置（WGS84）：由旧版高德(GCJ-02)中心点换算得到
const MAP_CENTER: [number, number] = [30.757064, 103.933993]
const CARTO_STYLE_URLS = {
  positron: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  voyager: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  'positron-nolabels': 'https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json',
  'voyager-nolabels': 'https://basemaps.cartocdn.com/gl/voyager-nolabels-gl-style/style.json',
  'dark-matter': 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  'dark-matter-nolabels': 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json'
} as const
const MAP_STYLE_OVERRIDE = (import.meta.env.VITE_MAP_STYLE as string | undefined) ?? ''

const CARTO_CANONICAL_HOST = 'basemaps.cartocdn.com'
const CARTO_TILE_HOST_RE = /^tiles(?:-[a-d])?\.basemaps\.cartocdn\.com$/i
const MAP_STATE_STORAGE_KEY = 'map-view-state-v1'

type MapViewState = {
  center: [number, number] // [lng, lat]
  zoom: number
  pitch: number
  bearing: number
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function readMapViewState(): MapViewState | null {
  try {
    const raw = localStorage.getItem(MAP_STATE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<MapViewState>
    const center = parsed.center
    if (!Array.isArray(center) || center.length !== 2) return null
    const [lng, lat] = center
    if (!isFiniteNumber(lng) || !isFiniteNumber(lat)) return null
    if (!isFiniteNumber(parsed.zoom) || !isFiniteNumber(parsed.pitch) || !isFiniteNumber(parsed.bearing)) return null

    return {
      center: [lng, lat],
      zoom: Math.min(22, Math.max(0, parsed.zoom)),
      pitch: Math.min(85, Math.max(0, parsed.pitch)),
      bearing: ((parsed.bearing + 180) % 360) - 180
    }
  } catch {
    return null
  }
}

function writeMapViewState(state: MapViewState) {
  try {
    localStorage.setItem(MAP_STATE_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

function snapshotMapViewState(map: maplibregl.Map): MapViewState {
  const center = map.getCenter()
  return {
    center: [center.lng, center.lat],
    zoom: map.getZoom(),
    pitch: map.getPitch(),
    bearing: map.getBearing()
  }
}

function rewriteCartoUrl(url: string) {
  try {
    const parsed = new URL(url, window.location.href)
    if (!CARTO_TILE_HOST_RE.test(parsed.hostname)) return url
    parsed.hostname = CARTO_CANONICAL_HOST
    return parsed.toString()
  } catch {
    return url
  }
}

function enable3DBuildings(map: maplibregl.Map, isDark: boolean) {
  if (!map.isStyleLoaded()) return
  if (!map.getSource('carto')) return

  const heightExpr: unknown = ['coalesce', ['get', 'render_height'], 0]
  const fallbackColor: unknown = isDark
    ? [
        'interpolate',
        ['linear'],
        heightExpr,
        0,
        ['to-color', '#4b5563'],
        12,
        ['to-color', '#374151'],
        30,
        ['to-color', '#1f2937'],
        60,
        ['to-color', '#111827']
      ]
    : [
        'interpolate',
        ['linear'],
        heightExpr,
        0,
        ['to-color', '#d1d5db'],
        10,
        ['to-color', '#c0c6ce'],
        28,
        ['to-color', '#9ca3af'],
        60,
        ['to-color', '#6b7280']
      ]

  // 更显眼：优先使用数据自带 colour；否则按高度做轻微渐变，避免“整片一块灰”
  const colorExpr: unknown = ['to-color', ['get', 'colour'], fallbackColor]
  const opacity = isDark ? 0.82 : 1
  const verticalGradient = true

  if (map.getLayer('3d-buildings')) {
    map.setPaintProperty('3d-buildings', 'fill-extrusion-color', colorExpr as any)
    map.setPaintProperty('3d-buildings', 'fill-extrusion-opacity', opacity as any)
    map.setPaintProperty('3d-buildings', 'fill-extrusion-vertical-gradient', verticalGradient as any)
    return
  }

  const layers = map.getStyle().layers ?? []
  const lastBuildingLayerIndex = (() => {
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i] as any
      if (layer?.source === 'carto' && layer?.['source-layer'] === 'building') return i
    }
    return -1
  })()

  const labelLayerId =
    layers
      .slice(lastBuildingLayerIndex >= 0 ? lastBuildingLayerIndex + 1 : 0)
      .find((l) => l.type === 'symbol' && (l.layout as any)?.['text-field'])?.id ??
    layers.find((l) => l.type === 'symbol' && (l.layout as any)?.['text-field'])?.id

  map.addLayer(
    {
      id: '3d-buildings',
      source: 'carto',
      'source-layer': 'building',
      type: 'fill-extrusion',
      minzoom: 12,
      filter: ['all', ['!=', ['coalesce', ['get', 'hide_3d'], false], true]],
      paint: {
        'fill-extrusion-color': colorExpr as any,
        'fill-extrusion-opacity': opacity,
        'fill-extrusion-height': [
          'interpolate',
          ['linear'],
          ['zoom'],
          12,
          0,
          13,
          ['case', ['has', 'render_height'], ['get', 'render_height'], 6]
        ],
        'fill-extrusion-base': [
          'interpolate',
          ['linear'],
          ['zoom'],
          12,
          0,
          13,
          ['case', ['has', 'render_min_height'], ['get', 'render_min_height'], 0]
        ],
        'fill-extrusion-vertical-gradient': verticalGradient
      }
    } as any,
    labelLayerId
  )
}

function getStationMarkerColor(station: Station, isUsingCachedData: boolean) {
  // 如果使用缓存数据，所有标记显示为灰色
  if (isUsingCachedData) return '#9ca3af'

  const free = station.freeNum
  const total = station.switchType
  if (free == null || total == null || total === 0) return '#9ca3af'
  return getColorForAvailability(free / total)
}

export default function MapView() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const stationMarkersRef = useRef<maplibregl.Marker[]>([])
  const userMarkerRef = useRef<maplibregl.Marker | null>(null)
  const restoredViewRef = useRef(false)

  const [mapError, setMapError] = useState<string | null>(null)
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [campusOpen, setCampusOpen] = useState(false)
  const [isLocating, setIsLocating] = useState(false)

  const { isDark } = useThemeStore()
  const { showUnavailableStations, autoRefresh, refreshInterval, baseMapStyle } = useSettingsStore()
  const { visitorsCount, isConnected } = useVisitorsCount()
  const {
    stations: allStations,
    getFilteredStations,
    isLoading,
    isRefreshing,
    refreshStations,
    canRefresh,
    userLocation,
    setUserLocation: setStoreUserLocation,
    isUsingCachedData
  } = useStationStore()

  const stations = getFilteredStations()
  const hideMapControls = Boolean(selectedStation || campusOpen)
  const hasAnyStations = allStations.length > 0

  const displayStations = useMemo(() => {
    // 使用缓存数据时（灰色状态），显示所有站点，不过滤
    if (isUsingCachedData) return stations
    if (showUnavailableStations) return stations
    return stations.filter((s) => (s.freeNum ?? 0) > 0)
  }, [stations, showUnavailableStations, isUsingCachedData])

  // 调试日志
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[MapView] 状态更新:', {
        allStationsCount: allStations.length,
        filteredStationsCount: stations.length,
        displayStationsCount: displayStations.length,
        isUsingCachedData,
        showUnavailableStations
      })
    }
  }, [allStations.length, stations.length, displayStations.length, isUsingCachedData, showUnavailableStations])

  const styleUrl = useMemo(() => {
    if (MAP_STYLE_OVERRIDE) return MAP_STYLE_OVERRIDE
    if (baseMapStyle && baseMapStyle !== 'auto') return CARTO_STYLE_URLS[baseMapStyle]
    return isDark ? CARTO_STYLE_URLS['dark-matter'] : CARTO_STYLE_URLS.voyager
  }, [baseMapStyle, isDark])

  const createMap = useCallback(() => {
    if (!mapContainerRef.current) return
    if (mapRef.current) return

    const savedView = readMapViewState()
    restoredViewRef.current = Boolean(savedView)

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center: savedView?.center ?? [MAP_CENTER[1], MAP_CENTER[0]],
      zoom: savedView?.zoom ?? 16,
      pitch: savedView?.pitch ?? 60,
      bearing: savedView?.bearing ?? -20,
      maxPitch: 85,
      attributionControl: false,
      transformRequest: (url, resourceType) => {
        const rewritten = rewriteCartoUrl(url)
        if (rewritten === url) return { url }
        return { url: rewritten }
      },
      // maplibre 支持 antialias，但类型定义未暴露
      antialias: true
    } as any)

    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')

    map.on('load', () => {
      setMapError(null)
      enable3DBuildings(map, isDark)
    })

    map.on('error', (event) => {
      const message = event?.error?.message || '地图资源加载失败'
      setMapError(message)
      if (import.meta.env.DEV) console.error('MapLibre error', event)
    })

    let saveTimer: number | null = null
    const scheduleSave = () => {
      if (saveTimer) window.clearTimeout(saveTimer)
      saveTimer = window.setTimeout(() => writeMapViewState(snapshotMapViewState(map)), 250)
    }

    map.on('moveend', scheduleSave)
    map.on('rotateend', scheduleSave)
    map.on('pitchend', scheduleSave)
    map.on('zoomend', scheduleSave)

    mapRef.current = map
  }, [isDark, styleUrl])

  useEffect(() => {
    createMap()
    return () => {
      const map = mapRef.current
      if (map) writeMapViewState(snapshotMapViewState(map))
      stationMarkersRef.current.forEach((m) => m.remove())
      stationMarkersRef.current = []
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [createMap])

  // 切换主题时更新地图样式（并重挂 3D 建筑层）
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.setStyle(styleUrl)
    map.once('style.load', () => enable3DBuildings(map, isDark))
  }, [isDark, styleUrl])

  // 主题变化但底图不变（例如使用 VITE_MAP_STYLE 覆盖）时，更新 3D 建筑着色
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!map.getLayer('3d-buildings')) return
    enable3DBuildings(map, isDark)
  }, [isDark])

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return
    const id = window.setInterval(async () => {
      if (!canRefresh()) return
      await refreshStations(userLocation?.[0], userLocation?.[1], { showLoading: false })
    }, refreshInterval * 1000)
    return () => window.clearInterval(id)
  }, [autoRefresh, canRefresh, refreshInterval, refreshStations, userLocation])

  // 尝试获取用户位置（用于居中与刷新）
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const loc: [number, number] = [latitude, longitude]
        setStoreUserLocation(loc)
      },
      () => {
        // ignore
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    )
  }, [setStoreUserLocation])

  // 地图跟随用户位置
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!userLocation) return
    if (restoredViewRef.current) return
    map.easeTo({ center: [userLocation[1], userLocation[0]], zoom: 16, duration: 800 })
    restoredViewRef.current = true
  }, [userLocation])

  // 渲染用户位置 Marker
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!userLocation) {
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
      return
    }

    const el = document.createElement('div')
    el.className = 'user-marker'
    const marker = userMarkerRef.current ?? new maplibregl.Marker({ element: el, anchor: 'center' })
    marker.setLngLat([userLocation[1], userLocation[0]]).addTo(map)
    userMarkerRef.current = marker
  }, [userLocation])

  // 渲染充电站 Markers
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    stationMarkersRef.current.forEach((m) => m.remove())
    stationMarkersRef.current = []

    stationMarkersRef.current = displayStations.map((station) => {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'station-marker'
      el.style.backgroundColor = getStationMarkerColor(station, isUsingCachedData)
      el.textContent = String(station.freeNum ?? 0)
      el.setAttribute('aria-label', `${station.stationName}，可用${station.freeNum ?? 0}个`)
      el.addEventListener('click', () => setSelectedStation(station))
      return new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([station.longitude, station.latitude])
        .addTo(map)
    })
  }, [displayStations, isUsingCachedData])

  const handleRefresh = async () => {
    if (!canRefresh()) return
    setIsLocating(true)
    try {
      if (navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude]
              setStoreUserLocation(loc)
              mapRef.current?.easeTo({ center: [loc[1], loc[0]], zoom: 16, duration: 800 })
              await refreshStations(loc[0], loc[1])
              resolve()
            },
            async () => {
              await refreshStations(userLocation?.[0], userLocation?.[1])
              resolve()
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
          )
        })
      } else {
        await refreshStations(userLocation?.[0], userLocation?.[1])
      }
    } finally {
      setIsLocating(false)
    }
  }

  const refreshReady = canRefresh()
  const refreshDisabled = isLoading || isRefreshing || isLocating || !refreshReady
  const showLoadingOverlay = isLocating || (isLoading && !hasAnyStations)

  return (
    <div className="map-view" data-testid="map-view">
      <div className="map-canvas" ref={mapContainerRef} data-testid="map-canvas" />

      {mapError && (
        <div className="toast" role="alert" aria-live="polite">
          <Card className="toast-card">
            <Card.Content className="toast-content">
              <div className="toast-text">
                <div className="toast-title">地图加载失败</div>
                <div className="toast-sub">{mapError}</div>
              </div>
              <div className="toast-actions">
                <Button
                  variant="primary"
                  onPress={() => {
                    setMapError(null)
                    mapRef.current?.setStyle(styleUrl)
                  }}
                >
                  重试
                </Button>
                <Button variant="secondary" onPress={() => setMapError(null)}>
                  关闭
                </Button>
              </div>
            </Card.Content>
          </Card>
        </div>
      )}

      <div className="map-overlay">
        <div className="map-top">
          <SearchBar
            onStationSelect={(station) => {
              const map = mapRef.current
              map?.easeTo({ center: [station.longitude, station.latitude], zoom: 18, duration: 800 })
              setSelectedStation(station)
            }}
            visitorsCount={visitorsCount}
            isConnected={isConnected}
          />
        </div>

        <div className={`map-controls ${hideMapControls ? 'is-hidden' : ''}`}>
          <Button
            isIconOnly
            size="lg"
            variant="secondary"
            className="fab"
            onPress={() => setCampusOpen(true)}
            aria-label="校园地图"
          >
            <CampusIcon size={22} />
          </Button>

          <Button
            isIconOnly
            size="lg"
            variant="secondary"
            className="fab fab-scan"
            onPress={() => {
              try {
                window.location.href = 'weixin://scanqrcode'
              } catch {
                // ignore
              }
            }}
            aria-label="扫码"
          >
            <QrCodeIcon size={22} />
          </Button>

          <Button
            isIconOnly
            size="lg"
            variant="primary"
            className={`fab fab-refresh ${isLoading || isRefreshing || isLocating ? 'is-loading' : ''}`}
            onPress={handleRefresh}
            isDisabled={refreshDisabled}
            aria-label={!refreshReady ? '刷新冷却中' : isLoading || isRefreshing || isLocating ? '刷新中' : '刷新并定位'}
          >
            <RefreshIcon size={22} />
          </Button>
        </div>

        {showLoadingOverlay && (
          <div className="map-center">
            <LoadingSpinner label="刷新状态…" />
          </div>
        )}
      </div>

      <StationDetailModal station={selectedStation} isOpen={!!selectedStation} onClose={() => setSelectedStation(null)} />
      <CampusMapModal isOpen={campusOpen} onClose={() => setCampusOpen(false)} />
    </div>
  )
}
