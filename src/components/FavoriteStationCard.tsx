import { useEffect, useMemo, useState } from 'react'
import { Button, Card } from '@heroui/react'
import type { Outlet, OutletStatus, Station } from '../types/station'
import { fetchOutletStatus, fetchStationOutlets } from '../utils/api'
import { useFavoritesStore } from '../store/favoritesStore'
import { useErrorStore } from '../store/errorStore'
import LoadingSpinner from './LoadingSpinner'

type FavoriteStationCardProps = {
  station: Station
  refreshTrigger?: number
}

function isAvailable(status: OutletStatus | null) {
  return status?.outlet?.iCurrentChargingRecordId === 0
}

export default function FavoriteStationCard({ station, refreshTrigger }: FavoriteStationCardProps) {
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [statuses, setStatuses] = useState<Record<string, OutletStatus | null>>({})
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const { removeFavorite, pinFavorite, unpinFavorite, isPinned } = useFavoritesStore()
  const { showError } = useErrorStore()

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      try {
        const stationOutlets = await fetchStationOutlets(station.stationId)
        if (cancelled) return
        setOutlets(stationOutlets)
        setStatuses(Object.fromEntries(stationOutlets.map((outlet) => [outlet.outletNo, null])))
        if (stationOutlets.length > 0) {
          const res = await Promise.allSettled(stationOutlets.map((o) => fetchOutletStatus(o.outletNo)))
          if (cancelled) return
          setStatuses(
            Object.fromEntries(
              stationOutlets.map((outlet, index) => [
                outlet.outletNo,
                res[index].status === 'fulfilled' ? res[index].value : null
              ])
            )
          )
        } else {
          setStatuses({})
        }
      } catch (e) {
        if (!cancelled) showError('加载充电站数据失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [refreshTrigger, showError, station.stationId])

  const summary = useMemo(() => {
    const total = outlets.length
    const available = outlets.filter((outlet) => isAvailable(statuses[outlet.outletNo])).length
    const unknown = outlets.filter((outlet) => !statuses[outlet.outletNo]?.outlet).length
    return { total, available, unknown, occupied: Math.max(0, total - available - unknown) }
  }, [outlets, statuses])

  const pinned = isPinned(station.stationId)

  return (
    <Card className="fav-card">
      <Card.Header className="fav-card-header">
        <div className="fav-card-headings">
          <Card.Title className="fav-card-title">
            {station.stationName}
            {pinned && <span className="fav-pin">置顶</span>}
          </Card.Title>
          <Card.Description className="fav-card-subtitle">{station.address}</Card.Description>
        </div>
        <div className="fav-card-actions">
          <Button
            variant={pinned ? 'primary' : 'secondary'}
            onPress={() => (pinned ? unpinFavorite(station.stationId) : pinFavorite(station.stationId))}
          >
            {pinned ? '取消置顶' : '置顶'}
          </Button>
          <Button variant="danger-soft" onPress={() => removeFavorite(station.stationId)}>
            移除
          </Button>
        </div>
      </Card.Header>

      <Card.Content className="fav-card-content">
        <div className="fav-summary">
          <div className="fav-summary-item">
            <div className="fav-summary-label">总插座</div>
            <div className="fav-summary-value">{summary.total}</div>
          </div>
          <div className="fav-summary-item">
            <div className="fav-summary-label">可用</div>
            <div className="fav-summary-value is-success">{summary.available}</div>
          </div>
          <div className="fav-summary-item">
            <div className="fav-summary-label">占用</div>
            <div className="fav-summary-value is-warning">{summary.occupied}</div>
          </div>
          <div className="fav-summary-item">
            <div className="fav-summary-label">未知</div>
            <div className="fav-summary-value">{summary.unknown}</div>
          </div>
        </div>

        {outlets.length > 0 && (
          <div className="fav-expand">
            <Button variant="secondary" onPress={() => setExpanded((v) => !v)}>
              {expanded ? '收起详情' : '展开详情'}
            </Button>
          </div>
        )}

        {expanded && (
          <div className="fav-outlets">
            {loading ? (
              <LoadingSpinner label="加载中…" />
            ) : outlets.length === 0 ? (
              <div className="muted">该充电站暂无插座信息。</div>
            ) : (
              <div className="outlet-grid">
                {outlets
                  .slice()
                  .sort((a, b) => (a.outletSerialNo ?? 0) - (b.outletSerialNo ?? 0))
                  .map((outlet) => {
                    const status = statuses[outlet.outletNo] ?? null
                    const available = isAvailable(status)
                    const unknown = !status?.outlet
                    const name =
                      status?.outlet?.vOutletName?.replace('插座', '').trim() ||
                      outlet.vOutletName?.replace('插座', '').trim() ||
                      outlet.outletSerialNo?.toString() ||
                      outlet.outletNo

                    return (
                      <div key={outlet.outletId} className={`outlet-card is-static ${unknown ? 'is-unknown' : available ? 'is-available' : 'is-occupied'}`}>
                        <div className="outlet-card-top">
                          <div className="outlet-name">{`插座 ${name}`}</div>
                          <div className={`outlet-badge ${unknown ? 'is-unknown' : available ? 'is-available' : 'is-occupied'}`}>
                            {unknown ? '未知' : available ? '可用' : '占用'}
                          </div>
                        </div>
                        <div className="outlet-card-bottom">
                          {unknown ? (
                            <span className="muted">状态未知</span>
                          ) : available ? (
                            <span className="muted">空闲中</span>
                          ) : (
                            <>
                              <span className="kpi">{status.powerFee?.billingPower ?? '未知'}</span>
                              <span className="kpi">¥{(status.usedfee ?? 0).toFixed(2)}</span>
                              <span className="kpi">{status.usedmin ?? 0} 分钟</span>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}
      </Card.Content>
    </Card>
  )
}
