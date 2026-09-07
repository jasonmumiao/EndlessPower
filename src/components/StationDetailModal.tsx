import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Chip, Modal } from '@heroui/react'
import type { Outlet, OutletStatus, Station } from '../types/station'
import { fetchOutletStatus, fetchStationOutlets } from '../utils/api'
import { useFavoritesStore } from '../store/favoritesStore'
import { useErrorStore } from '../store/errorStore'
import { useMonitorStore } from '../store/monitorStore'
import LoadingSpinner from './LoadingSpinner'
import { HeartIcon, QrCodeIcon, RefreshIcon } from './icons'

type StationDetailModalProps = {
  station: Station | null
  isOpen: boolean
  onClose: () => void
}

type OutletFilter = 'all' | 'available' | 'occupied'
const OUTLET_FILTER_STORAGE_KEY = 'outlet-filter'

function parseOutletFilter(value: string | null): OutletFilter {
  if (value === 'available' || value === 'occupied') return value
  return 'all'
}

function formatTimeHHmm(timestamp: number) {
  const date = new Date(timestamp)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function isOutletAvailable(status: OutletStatus | null) {
  return status?.outlet?.iCurrentChargingRecordId === 0
}

export default function StationDetailModal({ station, isOpen, onClose }: StationDetailModalProps) {
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [statusByOutletNo, setStatusByOutletNo] = useState<Record<string, OutletStatus | null>>({})
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<OutletFilter>(() => {
    try {
      return parseOutletFilter(localStorage.getItem(OUTLET_FILTER_STORAGE_KEY))
    } catch {
      return 'all'
    }
  })
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)
  const requestIdRef = useRef(0)

  const { isFavorite, addFavorite, removeFavorite, canAddMore } = useFavoritesStore()
  const { showError } = useErrorStore()
  const { setMonitorTarget } = useMonitorStore()

  const loadStationDetails = useCallback(
    async (stationId: number) => {
      const requestId = ++requestIdRef.current
      setLoading(true)
      try {
        const stationOutlets = await fetchStationOutlets(stationId)
        if (requestIdRef.current !== requestId) return
        setOutlets(stationOutlets)

        if (stationOutlets.length > 0) {
          const res = await Promise.all(stationOutlets.map((o) => fetchOutletStatus(o.outletNo)))
          if (requestIdRef.current !== requestId) return
          const nextMap: Record<string, OutletStatus | null> = {}
          stationOutlets.forEach((outlet, index) => {
            nextMap[outlet.outletNo] = res[index] ?? null
          })
          setStatusByOutletNo(nextMap)
        } else {
          setStatusByOutletNo({})
        }
        setLastUpdatedAt(Date.now())
      } catch (e) {
        if (requestIdRef.current === requestId) showError('加载充电站详情失败')
      } finally {
        if (requestIdRef.current === requestId) setLoading(false)
      }
    },
    [showError]
  )

  useEffect(() => {
    if (!isOpen || !station) return
    void loadStationDetails(station.stationId)
    return () => {
      requestIdRef.current += 1
    }
  }, [isOpen, loadStationDetails, station])

  useEffect(() => {
    try {
      localStorage.setItem(OUTLET_FILTER_STORAGE_KEY, filter)
    } catch {
      // ignore
    }
  }, [filter])

  const stationIsFavorite = station ? isFavorite(station.stationId) : false

  const sortedOutlets = useMemo(() => {
    return [...outlets].sort((a, b) => (a.outletSerialNo ?? 0) - (b.outletSerialNo ?? 0))
  }, [outlets])

  const outletCounts = useMemo(() => {
    const all = sortedOutlets.length
    let available = 0
    let occupied = 0
    let unknown = 0
    for (const outlet of sortedOutlets) {
      const status = statusByOutletNo[outlet.outletNo] ?? null
      if (!status) {
        unknown += 1
        continue
      }
      if (isOutletAvailable(status)) available += 1
      else occupied += 1
    }
    return { all, available, occupied, unknown }
  }, [sortedOutlets, statusByOutletNo])

  const visibleOutlets = useMemo(() => {
    if (filter === 'all') return sortedOutlets
    return sortedOutlets.filter((outlet) => {
      const status = statusByOutletNo[outlet.outletNo] ?? null
      if (!status) return filter === 'unknown'
      return filter === (isOutletAvailable(status) ? 'available' : 'occupied')
    })
  }, [filter, sortedOutlets, statusByOutletNo])

  const handleToggleFavorite = () => {
    if (!station) return
    if (stationIsFavorite) {
      removeFavorite(station.stationId)
      return
    }
    if (!canAddMore()) {
      showError('收藏夹已满，请先移除一些站点。')
      return
    }
    addFavorite(station.stationId)
  }

  const handleMonitorOutlet = (outlet: Outlet, outletName: string) => {
    if (!station) return
    setMonitorTarget({
      stationId: station.stationId,
      stationName: station.stationName,
      outlet,
      outletName
    })
    window.dispatchEvent(new Event('switchToMonitor'))
    onClose()
  }

  const handleRefresh = async () => {
    if (!station) return
    await loadStationDetails(station.stationId)
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="bottom" size="lg" scroll="inside">
          <Modal.Dialog className="station-dialog">
            <div className="sheet-handle" aria-hidden="true" />

            <Modal.Header className="station-header app-modal-header">
              <div className="station-title">
                <Modal.Heading>{station?.stationName ?? '充电站'}</Modal.Heading>
                <div className="station-subtitle">{station?.address ?? ''}</div>
              </div>
              <Modal.CloseTrigger aria-label="关闭" />
            </Modal.Header>

            <Modal.Body className="station-body">
              <div className="station-actions" aria-label="站点操作">
                <Button
                  isIconOnly
                  variant={stationIsFavorite ? 'primary' : 'secondary'}
                  onPress={handleToggleFavorite}
                  aria-label={stationIsFavorite ? '取消收藏' : '收藏'}
                >
                  <HeartIcon size={20} />
                </Button>
                <Button
                  isIconOnly
                  variant="secondary"
                  aria-label="扫码"
                  onPress={() => {
                    try {
                      window.location.href = 'weixin://scanqrcode'
                    } catch {
                      // ignore
                    }
                  }}
                >
                  <QrCodeIcon size={20} />
                </Button>
                <Button
                  isIconOnly
                  variant="secondary"
                  onPress={handleRefresh}
                  isDisabled={loading}
                  aria-label="刷新"
                  className={loading ? 'is-loading' : undefined}
                >
                  <RefreshIcon size={20} />
                </Button>
	              </div>

	              {sortedOutlets.length > 0 && (
	                <div className="station-filter-row" aria-label="插座筛选">
	                  <div className="segment" role="tablist">
	                    {([
	                      ['all', `全部 ${outletCounts.all}`],
	                      ['available', `可用 ${outletCounts.available}`],
	                      ['occupied', `占用 ${outletCounts.occupied}`]
	                    ] as const).map(([key, label]) => (
	                      <button
	                        key={key}
	                        type="button"
	                        role="tab"
	                        aria-selected={filter === key}
	                        className={`segment-item ${filter === key ? 'is-active' : ''}`}
	                        onClick={() => setFilter(key)}
	                      >
	                        {label}
	                      </button>
	                    ))}
	                  </div>

	                  {lastUpdatedAt && (
	                    <div className="station-updated muted" aria-label="数据更新时间">
	                      更新 {formatTimeHHmm(lastUpdatedAt)}
	                    </div>
	                  )}
	                </div>
	              )}

              {loading && sortedOutlets.length === 0 ? (
                <div className="station-loading">
                  <LoadingSpinner label="加载插座信息…" />
                </div>
              ) : sortedOutlets.length === 0 ? (
                <div className="station-empty muted">该充电站暂无插座信息。</div>
              ) : (
                <div className="outlet-section">
                  <div className="station-hint">选择插座进入监控</div>
                  {loading && (
                    <div className="outlet-loading muted" aria-label="刷新中">
                      正在刷新…
                    </div>
                  )}
                  <div className="outlet-list" data-testid="outlet-grid">
                    {visibleOutlets.length === 0 ? (
                      <div className="outlet-empty muted" role="status" aria-live="polite">
                        当前筛选下没有插座
                      </div>
                    ) : (
                      visibleOutlets.map((outlet) => {
                        const status = statusByOutletNo[outlet.outletNo] ?? null
                        const available = status ? isOutletAvailable(status) : false
                        const statusKind: OutletFilter = available ? 'available' : 'occupied'
                        const name =
                          status?.outlet?.vOutletName?.replace('插座', '').trim() ||
                          outlet.vOutletName?.replace('插座', '').trim() ||
                          outlet.outletSerialNo?.toString() ||
                          outlet.outletNo

                        const label = `插座 ${name}`
                        const subtitle = (() => {
                          if (available) return '空闲中'
                          if (!status) return '未获取状态'
                          const power = status.powerFee?.billingPower ?? '?'
                          const fee = (status.usedfee ?? 0).toFixed(2)
                          const duration = status.usedmin ?? 0
                          return `${power} ${fee}元 ${duration}分`
                        })()

                        const statusChip = (() => {
                          if (available) return <Chip color="success" variant="secondary" size="sm">可用</Chip>
                          if (!status) return <Chip variant="secondary" size="sm">未知</Chip>
                          return <Chip color="warning" variant="secondary" size="sm">占用</Chip>
                        })()

                        return (
                          <button
                            key={outlet.outletId}
                            type="button"
                            className={`outlet-item is-${statusKind}`}
                            onClick={() => handleMonitorOutlet(outlet, label)}
                          >
                            <div className="outlet-item-main">
                              <div className="outlet-item-title">{label}</div>
                              <div className="outlet-item-sub muted">{subtitle}</div>
                            </div>
                            <div className="outlet-item-meta">
                              {statusChip}
                              <span className="outlet-item-arrow" aria-hidden="true">
                                ›
                              </span>
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
