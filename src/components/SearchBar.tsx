import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, Chip, ListBox, SearchField } from '@heroui/react'
import { useStationStore } from '../store/stationStore'
import type { Station } from '../types/station'
import { UsersIcon } from './icons'

type SearchBarProps = {
  onStationSelect?: (station: Station) => void
  visitorsCount?: number
  isConnected?: boolean
}

export default function SearchBar({ onStationSelect, visitorsCount, isConnected }: SearchBarProps) {
  const { searchKeyword, setSearchKeyword, isUsingSimulatedData, getFilteredStations } = useStationStore()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const stations = getFilteredStations()
  const suggestions = useMemo(() => {
    return stations
      .filter((s) => (s.freeNum ?? 0) > 0)
      .sort((a, b) => (b.freeNum ?? 0) - (a.freeNum ?? 0))
      .slice(0, 10)
  }, [stations])

  useEffect(() => {
    const onDocPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (!containerRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDocPointerDown)
    return () => document.removeEventListener('pointerdown', onDocPointerDown)
  }, [])

  const handleSelect = (stationId: number) => {
    const station = stations.find((s) => s.stationId === stationId)
    if (!station) return
    setSearchKeyword(station.stationName)
    setOpen(false)
    onStationSelect?.(station)
  }

  return (
    <div className="search" ref={containerRef}>
      <SearchField
        aria-label="搜索充电站"
        value={searchKeyword}
        onChange={setSearchKeyword}
        onFocusChange={(focused) => focused && setOpen(true)}
        className="search-field"
        data-testid="search-field"
      >
        <SearchField.Group className="search-group">
          <SearchField.SearchIcon />
          <SearchField.Input placeholder={isUsingSimulatedData ? '搜索充电站（模拟数据）…' : '搜索充电站…'} />
          {visitorsCount !== undefined && (
            <Chip color={isConnected ? 'success' : 'default'} variant="flat" size="sm" className="search-online-chip">
              <span className="online-chip">
                <UsersIcon size={14} aria-hidden="true" />
                <span className="online-chip-value">{isConnected ? visitorsCount : '—'}</span>
              </span>
            </Chip>
          )}
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>

      {open && (
        <Card className="search-dropdown">
          <Card.Content className="search-dropdown-content">
            {suggestions.length === 0 ? (
              <div className="search-empty">当前没有可用充电桩</div>
            ) : (
              <ListBox
                aria-label="可用充电桩列表"
                selectionMode="single"
                onAction={(key) => handleSelect(Number(key))}
              >
                {suggestions.map((station) => (
                  <ListBox.Item key={station.stationId} id={String(station.stationId)} textValue={station.stationName}>
                    <div className="search-item">
                      <div className="search-item-main">
                        <div className="search-item-title">{station.stationName}</div>
                        <div className="search-item-subtitle">{station.address}</div>
                      </div>
                      <div className="search-item-meta">
                        <span className="search-item-free">{station.freeNum ?? 0}</span>
                        <span className="search-item-total">/{station.switchType ?? '-'}</span>
                      </div>
                    </div>
                  </ListBox.Item>
                ))}
              </ListBox>
            )}
          </Card.Content>
        </Card>
      )}
    </div>
  )
}
