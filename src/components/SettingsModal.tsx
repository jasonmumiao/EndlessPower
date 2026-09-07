import { useMemo, useState } from 'react'
import { Button, ListBox, Modal, Radio, RadioGroup, Select, Switch, Text } from '@heroui/react'
import { useSettingsStore } from '../store/settingsStore'
import { useThemeStore } from '../store/themeStore'
import { formatVersionDisplay, getBuildEnv, getShortGitCommit } from '../utils/version'
import ContributorsSection from './ContributorsSection'

type SettingsModalProps = {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [isClearingCache, setIsClearingCache] = useState(false)
  const [resetFeedback, setResetFeedback] = useState<'idle' | 'done'>('idle')
  const {
    autoRefresh,
    showUnavailableStations,
    chinaCoordFix,
    refreshInterval,
    baseMapStyle,
    setAutoRefresh,
    setShowUnavailableStations,
    setChinaCoordFix,
    setRefreshInterval,
    setBaseMapStyle,
    resetSettings
  } = useSettingsStore()

  const { theme, setTheme } = useThemeStore()
  const envText = useMemo(() => (getBuildEnv() === 'development' ? 'development' : 'production'), [])

  const handleResetAll = () => {
    const ok = window.confirm('将恢复默认设置，是否继续？')
    if (!ok) return
    resetSettings()
    setTheme('auto')
    setResetFeedback('done')
    window.setTimeout(() => setResetFeedback('idle'), 1500)
  }

  const handleClearCache = async () => {
    const ok = window.confirm('将清除离线缓存并重新加载页面，是否继续？')
    if (!ok) return
    setIsClearingCache(true)
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((r) => r.unregister()))
      }
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
    } finally {
      window.location.reload()
    }
  }

  const sectionStyle: React.CSSProperties = {
    padding: 16,
    borderRadius: 12,
    border: '1px solid var(--border)',
    background: 'var(--surface)'
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0'
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="center" size="lg" scroll="inside">
          <Modal.Dialog style={{ maxWidth: 500 }}>
            <Modal.Header>
              <Modal.Heading>设置</Modal.Heading>
              <Modal.CloseTrigger aria-label="关闭" />
            </Modal.Header>

            <Modal.Body style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 外观 */}
              <div style={sectionStyle}>
                <Text style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, display: 'block' }}>外观</Text>
                <RadioGroup
                  value={theme}
                  onChange={(v) => setTheme(v as any)}
                  aria-label="主题模式"
                  orientation="horizontal"
                >
                  <Radio value="auto">
                    <Radio.Control><Radio.Indicator /></Radio.Control>
                    <Radio.Content>跟随系统</Radio.Content>
                  </Radio>
                  <Radio value="light">
                    <Radio.Control><Radio.Indicator /></Radio.Control>
                    <Radio.Content>亮色</Radio.Content>
                  </Radio>
                  <Radio value="dark">
                    <Radio.Control><Radio.Indicator /></Radio.Control>
                    <Radio.Content>暗色</Radio.Content>
                  </Radio>
                </RadioGroup>
              </div>

              {/* 地图与数据 */}
              <div style={sectionStyle}>
                <Text style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, display: 'block' }}>地图与数据</Text>

                <div style={{ marginBottom: 16 }}>
                  <Text style={{ fontWeight: 500, marginBottom: 8, display: 'block' }}>底图风格</Text>
                  <Select
                    aria-label="底图风格"
                    selectedKey={baseMapStyle}
                    onSelectionChange={(key) => setBaseMapStyle(String(key) as any)}
                  >
                    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                    <Select.Popover>
                      <ListBox selectionMode="single">
                        <ListBox.Item id="auto">自动（推荐）</ListBox.Item>
                        <ListBox.Item id="voyager">Voyager</ListBox.Item>
                        <ListBox.Item id="positron">Positron</ListBox.Item>
                        <ListBox.Item id="dark-matter">Dark Matter</ListBox.Item>
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>

                <div style={rowStyle}>
                  <div>
                    <Text style={{ fontWeight: 500, display: 'block' }}>自动刷新</Text>
                    <Text style={{ fontSize: 12, opacity: 0.6 }}>定期更新充电桩状态</Text>
                  </div>
                  <Switch isSelected={autoRefresh} onChange={setAutoRefresh} aria-label="自动刷新">
                    <Switch.Control><Switch.Thumb /></Switch.Control>
                  </Switch>
                </div>

                <div style={rowStyle}>
                  <div>
                    <Text style={{ fontWeight: 500, display: 'block' }}>显示无可用站点</Text>
                    <Text style={{ fontSize: 12, opacity: 0.6 }}>关闭后仅展示可用</Text>
                  </div>
                  <Switch isSelected={showUnavailableStations} onChange={setShowUnavailableStations} aria-label="显示无可用站点">
                    <Switch.Control><Switch.Thumb /></Switch.Control>
                  </Switch>
                </div>

                <div style={rowStyle}>
                  <div>
                    <Text style={{ fontWeight: 500, display: 'block' }}>中国坐标纠偏</Text>
                    <Text style={{ fontSize: 12, opacity: 0.6 }}>GCJ-02 转 WGS84</Text>
                  </div>
                  <Switch isSelected={chinaCoordFix} onChange={setChinaCoordFix} aria-label="中国坐标纠偏">
                    <Switch.Control><Switch.Thumb /></Switch.Control>
                  </Switch>
                </div>

                <div style={{ marginTop: 8 }}>
                  <Text style={{ fontWeight: 500, marginBottom: 8, display: 'block' }}>刷新间隔</Text>
                  <Select
                    aria-label="刷新间隔"
                    selectedKey={String(refreshInterval)}
                    onSelectionChange={(key) => setRefreshInterval(Number(key))}
                  >
                    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                    <Select.Popover>
                      <ListBox selectionMode="single">
                        <ListBox.Item id="3">3 秒</ListBox.Item>
                        <ListBox.Item id="5">5 秒（推荐）</ListBox.Item>
                        <ListBox.Item id="10">10 秒</ListBox.Item>
                        <ListBox.Item id="30">30 秒</ListBox.Item>
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
              </div>

              {/* 关于 */}
              <div style={sectionStyle}>
                <Text style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, display: 'block' }}>关于</Text>
                <Text style={{ display: 'block', marginBottom: 4 }}>版本：{formatVersionDisplay()}</Text>
                <Text style={{ display: 'block', marginBottom: 4 }}>提交：{getShortGitCommit()}</Text>
                <Text style={{ display: 'block' }}>环境：{envText}</Text>
                <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                  <a href="https://github.com/jasonmumiao/EndlessPower" target="_blank" rel="noopener noreferrer">GitHub</a>
                  <a href="https://issks.sile.mom/" target="_blank" rel="noopener noreferrer">官网</a>
                </div>
                {isOpen && <ContributorsSection />}
              </div>
            </Modal.Body>

            <Modal.Footer style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" onPress={handleClearCache} isDisabled={isClearingCache}>
                  {isClearingCache ? '清理中…' : '清除缓存'}
                </Button>
                <Button variant="secondary" onPress={handleResetAll}>
                  {resetFeedback === 'done' ? '已恢复' : '恢复默认'}
                </Button>
              </div>
              <Button variant="primary" onPress={onClose}>完成</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
