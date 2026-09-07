import { useEffect, useState } from 'react'
import { Button, Card, Chip } from '@heroui/react'
import { useStationStore } from './store/stationStore'
import { useThemeStore } from './store/themeStore'
import { useErrorStore } from './store/errorStore'
import { useVisitorsCount } from './hooks/useVisitorsCount'
import MapView from './components/MapView'
import FavoritesView from './components/FavoritesView'
import OutletMonitorView from './components/OutletMonitorView'
import SettingsModal from './components/SettingsModal'
import PWAUpdatePrompt from './components/PWAUpdatePrompt'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import DomainMigrationNotice from './components/DomainMigrationNotice'
import Hud from './components/Hud'
import { UsersIcon } from './components/icons'

type ViewType = 'map' | 'favorites' | 'monitor'

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('map')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const initializeStations = useStationStore((s) => s.initializeStations)
  const refreshStations = useStationStore((s) => s.refreshStations)
  const canRefreshStations = useStationStore((s) => s.canRefresh)
  const initializeTheme = useThemeStore((s) => s.initializeTheme)
  const error = useErrorStore((s) => s.error)
  const clearError = useErrorStore((s) => s.clearError)
  const { visitorsCount, isConnected } = useVisitorsCount()
  const isAutomated = typeof navigator !== 'undefined' && Boolean((navigator as any).webdriver)
  const enablePwaUi = import.meta.env.PROD || import.meta.env.VITE_PWA_DEV === '1'

  useEffect(() => {
    initializeTheme()
  }, [initializeTheme])

  useEffect(() => {
    initializeStations()
  }, [initializeStations])

  // 页面重新获得焦点/从后台恢复时，尽量刷新到最新数据（后台刷新，不打断用户）
  useEffect(() => {
    const refreshIfNeeded = () => {
      if (document.visibilityState !== 'visible') return
      if (!canRefreshStations()) return
      void refreshStations(undefined, undefined, { showLoading: false })
    }

    window.addEventListener('focus', refreshIfNeeded)
    document.addEventListener('visibilitychange', refreshIfNeeded)
    return () => {
      window.removeEventListener('focus', refreshIfNeeded)
      document.removeEventListener('visibilitychange', refreshIfNeeded)
    }
  }, [canRefreshStations, refreshStations])

  useEffect(() => {
    const handleSwitchToMonitor = () => setCurrentView('monitor')
    window.addEventListener('switchToMonitor', handleSwitchToMonitor)
    return () => window.removeEventListener('switchToMonitor', handleSwitchToMonitor)
  }, [])

  return (
    <div className="app-root">
      <main className="app-main">
        {currentView === 'map' && <MapView />}
        {currentView === 'favorites' && <FavoritesView onOpenMap={() => setCurrentView('map')} />}
        {currentView === 'monitor' && <OutletMonitorView onBack={() => setCurrentView('map')} />}
      </main>

      <Hud
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenSettings={() => setSettingsOpen(true)}
        isHidden={currentView === 'monitor' || settingsOpen}
      >
        {currentView !== 'map' && (
          <div className="hud-top" aria-label="在线人数">
            <Chip color={isConnected ? 'success' : 'default'} variant="secondary" size="sm">
              <span className="online-chip">
                <UsersIcon size={14} aria-hidden="true" />
                <span className="online-chip-value">{isConnected ? visitorsCount : '—'}</span>
              </span>
            </Chip>
          </div>
        )}
      </Hud>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {enablePwaUi && !isAutomated && <PWAUpdatePrompt />}
      {enablePwaUi && !isAutomated && <PWAInstallPrompt />}
      <DomainMigrationNotice />

      {error && (
        <div className="alert-overlay" role="alert">
          <Card className="alert-card">
            <Card.Header className="alert-header">
              <Card.Title>提示</Card.Title>
            </Card.Header>
            <Card.Content className="alert-body">
              <div className="alert-text">{error}</div>
              <div className="alert-actions">
                <Button variant="primary" onPress={clearError}>
                  知道了
                </Button>
              </div>
            </Card.Content>
          </Card>
        </div>
      )}
    </div>
  )
}
