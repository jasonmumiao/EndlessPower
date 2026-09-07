import type { ReactNode } from 'react'
import { HeartIcon, MapIcon, SettingsIcon } from './icons'

export type HudView = 'map' | 'favorites' | 'monitor'

type HudProps = {
  currentView: HudView
  onViewChange: (view: HudView) => void
  onOpenSettings: () => void
  isHidden?: boolean
  children?: ReactNode
}

export default function Hud({ currentView, onViewChange, onOpenSettings, isHidden, children }: HudProps) {
  const hidden = Boolean(isHidden)
  return (
    <>
      <div className={`hud-layer ${hidden ? 'is-hidden' : ''}`} aria-hidden={hidden ? 'true' : undefined}>
        {children}
      </div>

      <nav className={`bottom-nav ${hidden ? 'is-hidden' : ''}`} aria-label="主导航" aria-hidden={hidden ? 'true' : undefined}>
        <div className="bottom-nav-list">
          <button
            className={`bottom-nav-item ${currentView === 'map' ? 'is-active' : ''}`}
            onClick={() => onViewChange('map')}
            aria-label="地图"
            aria-current={currentView === 'map' ? 'page' : undefined}
          >
            <span className="bottom-nav-icon" aria-hidden="true">
              <MapIcon size={24} />
            </span>
          </button>

          <button
            className={`bottom-nav-item ${currentView === 'favorites' ? 'is-active' : ''}`}
            onClick={() => onViewChange('favorites')}
            aria-label="收藏"
            aria-current={currentView === 'favorites' ? 'page' : undefined}
          >
            <span className="bottom-nav-icon" aria-hidden="true">
              <HeartIcon size={24} />
            </span>
          </button>

          <button
            className="bottom-nav-item"
            onClick={onOpenSettings}
            aria-label="设置"
          >
            <span className="bottom-nav-icon" aria-hidden="true">
              <SettingsIcon size={24} />
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}
