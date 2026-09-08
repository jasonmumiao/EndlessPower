import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, ListBox, Select } from '@heroui/react'
import { useMonitorStore, type MonitorData } from '../store/monitorStore'
import { fetchOutletStatus } from '../utils/api'
import { getVersionInfo } from '../utils/version'
import LoadingSpinner from './LoadingSpinner'

type OutletMonitorViewProps = {
  onBack: () => void
}

function formatTime(ts: number) {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export default function OutletMonitorView({ onBack }: OutletMonitorViewProps) {
  const {
    currentTarget,
    monitorHistory,
    pollInterval,
    isMonitoring,
    addMonitorData,
    clearHistory,
    setPollInterval,
    setMonitoring,
    setLastPollTime
  } = useMonitorStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollTimerRef = useRef<number | null>(null)
  const versionInfo = getVersionInfo()

  // 防休眠：Wake Lock + WebAudio 静音保活
  const wakeLockRef = useRef<{ release?: () => Promise<void> } | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioStartedRef = useRef(false)

  const requestWakeLock = useCallback(async () => {
    try {
      const wakeLock = (navigator as any).wakeLock
      if (wakeLock && document.visibilityState === 'visible') {
        wakeLockRef.current = await wakeLock.request('screen')
      }
    } catch {
      // ignore
    }
  }, [])

  const startSilentAudio = useCallback(async () => {
    if (audioStartedRef.current) return
    try {
      // @ts-expect-error - webkitAudioContext 是旧版浏览器前缀
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      gain.gain.value = 0
      osc.connect(gain).connect(ctx.destination)
      osc.start()
      audioCtxRef.current = ctx
      audioStartedRef.current = true
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock().catch(() => {})
      } else {
        try {
          wakeLockRef.current?.release?.()
        } catch {
          // ignore
        }
      }
    }

    requestWakeLock().catch(() => {})
    startSilentAudio().catch(() => {})
    document.addEventListener('visibilitychange', handleVisibility)

    const resumeOnGesture = () => {
      if (!audioStartedRef.current) startSilentAudio().catch(() => {})
      requestWakeLock().catch(() => {})
    }

    document.addEventListener('click', resumeOnGesture)
    document.addEventListener('touchstart', resumeOnGesture)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      document.removeEventListener('click', resumeOnGesture)
      document.removeEventListener('touchstart', resumeOnGesture)
      try {
        wakeLockRef.current?.release?.()
      } catch {
        // ignore
      }
      try {
        audioCtxRef.current?.close?.()
      } catch {
        // ignore
      }
    }
  }, [requestWakeLock, startSilentAudio])

  const fetchAndRecordData = useCallback(async () => {
    if (!currentTarget) return
    setLoading(true)
    setError(null)
    try {
      const status = await fetchOutletStatus(currentTarget.outlet.outletNo)
      if (status && status.outlet) {
        const powerStr = status.powerFee?.billingPower || '0W'
        const powerMatch = powerStr.match(/(\d+\.?\d*)\s*(kW|W)/i)
        let power = 0
        if (powerMatch) {
          const value = Number(powerMatch[1])
          const unit = powerMatch[2].toLowerCase()
          power = unit === 'kw' ? value * 1000 : value
        }
        const data: MonitorData = {
          timestamp: Date.now(),
          power,
          fee: status.usedfee || 0,
          duration: status.usedmin || 0
        }
        addMonitorData(data)
        setLastPollTime(Date.now())
      } else {
        setError('无法获取插座状态')
      }
    } catch (e) {
      setError('获取数据失败')
    } finally {
      setLoading(false)
    }
  }, [addMonitorData, currentTarget, setLastPollTime])

  useEffect(() => {
    if (!isMonitoring || !currentTarget) {
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
      return
    }

    fetchAndRecordData()
    pollTimerRef.current = window.setInterval(() => {
      fetchAndRecordData()
    }, pollInterval * 1000)

    return () => {
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [currentTarget, fetchAndRecordData, isMonitoring, pollInterval])

  useEffect(() => {
    return () => {
      setMonitoring(false)
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [setMonitoring])

  const latest = monitorHistory[monitorHistory.length - 1]

  const stats = useMemo(() => {
    if (monitorHistory.length === 0) return null
    const avgPower = monitorHistory.reduce((sum, d) => sum + d.power, 0) / monitorHistory.length
    const maxPower = Math.max(...monitorHistory.map((d) => d.power))

    // 梯形法则积分（kWh）
    let totalEnergy = 0
    for (let i = 1; i < monitorHistory.length; i++) {
      const timeDiffHours = (monitorHistory[i].timestamp - monitorHistory[i - 1].timestamp) / (1000 * 60 * 60)
      const avgPowerInterval = (monitorHistory[i].power + monitorHistory[i - 1].power) / 2
      totalEnergy += (avgPowerInterval / 1000) * timeDiffHours
    }

    const monitorDuration =
      monitorHistory.length >= 2 ? Math.round((monitorHistory[monitorHistory.length - 1].timestamp - monitorHistory[0].timestamp) / (1000 * 60)) : 0

    return { avgPower, maxPower, totalEnergy, monitorDuration }
  }, [monitorHistory])

  const energyText = useMemo(() => {
    if (!stats) return ''
    if (stats.totalEnergy < 1) return `${(stats.totalEnergy * 1000).toFixed(0)} Wh`
    return `${stats.totalEnergy.toFixed(2)} kWh`
  }, [stats])

  const unitPriceText = useMemo(() => {
    if (!stats || !latest) return ''
    if (stats.totalEnergy <= 0) return ''
    const pricePerKWh = latest.fee / stats.totalEnergy
    if (stats.totalEnergy < 1) return `¥${(pricePerKWh / 1000).toFixed(4)}/Wh`
    return `¥${pricePerKWh.toFixed(2)}/kWh`
  }, [latest, stats])

  if (!currentTarget) {
    return (
      <div className="monitor-empty">
        <Card className="monitor-empty-card">
          <Card.Header>
            <Card.Title>未选择插座</Card.Title>
            <Card.Description>请先在地图中选择充电站插座进入监控。</Card.Description>
          </Card.Header>
          <Card.Content>
            <Button variant="primary" onPress={onBack}>
              返回地图
            </Button>
          </Card.Content>
        </Card>
      </div>
    )
  }

  return (
    <div className="monitor-view" data-testid="monitor-view">
      <div className="page-inner monitor-inner">
        <div className="monitor-header">
          <Button variant="secondary" onPress={onBack}>
            返回
          </Button>

          <div className="monitor-title">
            <div className="monitor-station">{currentTarget.stationName}</div>
            <div className="monitor-outlet">{currentTarget.outletName}</div>
          </div>

          <div className="monitor-actions">
            <Button variant={isMonitoring ? 'danger' : 'primary'} onPress={() => setMonitoring(!isMonitoring)}>
              {isMonitoring ? '停止' : '开始'}
            </Button>
            <Button variant="secondary" onPress={fetchAndRecordData} isDisabled={loading}>
              刷新
            </Button>
            <Button variant="secondary" onPress={clearHistory} isDisabled={monitorHistory.length === 0}>
              清空
            </Button>
          </div>
        </div>

        <div className="monitor-toolbar">
          <div className="monitor-interval">
            <span>轮询间隔</span>
            <Select
              aria-label="轮询间隔"
              selectedKey={String(pollInterval)}
              onSelectionChange={(key) => {
                const next = Number(String(key))
                if (Number.isFinite(next)) setPollInterval(next)
              }}
              className="monitor-select"
            >
              <Select.Trigger aria-label="轮询间隔">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox aria-label="轮询间隔" selectionMode="single">
                  {versionInfo.isDevelopment && (
                    <ListBox.Item id="5" textValue="5秒（仅开发）">
                      5秒（仅开发）
                    </ListBox.Item>
                  )}
                  <ListBox.Item id="300" textValue="5分钟">
                    5分钟
                  </ListBox.Item>
                  <ListBox.Item id="600" textValue="10分钟">
                    10分钟
                  </ListBox.Item>
                  <ListBox.Item id="1800" textValue="30分钟">
                    30分钟
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          <div className="monitor-meta">
            <span className="muted">采样 {monitorHistory.length} 次</span>
            {latest && <span className="muted">最近 {formatTime(latest.timestamp)}</span>}
          </div>
        </div>

        {error && (
          <div className="monitor-error" role="alert">
            {error}
          </div>
        )}

        <div className="monitor-chart">
          {loading && <LoadingSpinner label="获取数据…" />}
          <PowerChart data={monitorHistory} />
        </div>

        {latest && stats && (
          <div className="monitor-stats">
            <Card className="monitor-stat">
              <Card.Content>
                <div className="stat-label">当前功率</div>
                <div className="stat-value">{latest.power.toFixed(0)} W</div>
                <div className="stat-sub">
                  平均 {stats.avgPower.toFixed(0)} W · 峰值 {stats.maxPower.toFixed(0)} W
                </div>
              </Card.Content>
            </Card>
            <Card className="monitor-stat">
              <Card.Content>
                <div className="stat-label">总电量</div>
                <div className="stat-value is-success">{energyText}</div>
              </Card.Content>
            </Card>
            <Card className="monitor-stat">
              <Card.Content>
                <div className="stat-label">时长</div>
                <div className="stat-value">{latest.duration} 分钟</div>
                <div className="stat-sub">监视 {stats.monitorDuration} 分钟</div>
              </Card.Content>
            </Card>
            <Card className="monitor-stat">
              <Card.Content>
                <div className="stat-label">费用</div>
                <div className="stat-value is-warning">¥{latest.fee.toFixed(2)}</div>
                <div className="stat-sub">{unitPriceText}</div>
              </Card.Content>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

const PowerChart: React.FC<{ data: MonitorData[] }> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const width = rect.width
    const height = rect.height
    const padding = { top: 24, right: 18, bottom: 36, left: 56 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    ctx.clearRect(0, 0, width, height)

    const maxPower = Math.max(...data.map((d) => d.power), 1)
    const minPower = 0
    const powerRange = maxPower || 1

    const dark = document.documentElement.classList.contains('dark')

    // Grid
    ctx.strokeStyle = dark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.08)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(padding.left + chartWidth, y)
      ctx.stroke()
    }

    // Axes
    ctx.strokeStyle = dark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.22)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(padding.left, padding.top)
    ctx.lineTo(padding.left, padding.top + chartHeight)
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight)
    ctx.stroke()

    // Y labels
    ctx.fillStyle = dark ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)'
    ctx.font = '12px system-ui'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let i = 0; i <= 5; i++) {
      const value = maxPower - (powerRange / 5) * i
      const y = padding.top + (chartHeight / 5) * i
      ctx.fillText(`${value.toFixed(0)} W`, padding.left - 10, y)
    }

    // X labels
    const minTime = data[0].timestamp
    const maxTime = data[data.length - 1].timestamp
    const timeRange = maxTime - minTime || 1
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    const labelCount = Math.min(data.length, 6)
    for (let i = 0; i < labelCount; i++) {
      const dataIndex = labelCount > 1 ? Math.floor((data.length - 1) * (i / (labelCount - 1))) : 0
      const point = data[dataIndex]
      const x = padding.left + ((point.timestamp - minTime) / timeRange) * chartWidth
      ctx.fillText(formatTime(point.timestamp), x, padding.top + chartHeight + 10)
    }

    // Curve
    if (data.length > 1) {
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight)
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.28)')
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.03)')

      ctx.beginPath()
      data.forEach((point, idx) => {
        const x = padding.left + ((point.timestamp - minTime) / timeRange) * chartWidth
        const y = padding.top + chartHeight - ((point.power - minPower) / powerRange) * chartHeight
        if (idx === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight)
      ctx.lineTo(padding.left, padding.top + chartHeight)
      ctx.closePath()
      ctx.fillStyle = gradient
      ctx.fill()

      ctx.beginPath()
      data.forEach((point, idx) => {
        const x = padding.left + ((point.timestamp - minTime) / timeRange) * chartWidth
        const y = padding.top + chartHeight - ((point.power - minPower) / powerRange) * chartHeight
        if (idx === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
    }
  }, [data])

  return <canvas ref={canvasRef} className="monitor-canvas" />
}
