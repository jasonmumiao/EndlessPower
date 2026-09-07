import { useState } from 'react'
import { Button, Card } from '@heroui/react'

const OLD_HOSTNAMES = new Set(['endlesspower.icu', 'www.endlesspower.icu'])
const NEW_SITE_HOSTNAME = 'issks.sile.mom'

function isLegacyDomain() {
  if (typeof window === 'undefined') return false
  const hostname = window.location.hostname.toLowerCase().replace(/\.$/, '')
  return OLD_HOSTNAMES.has(hostname)
}

function getNewSiteUrl() {
  const target = new URL(window.location.href)
  target.protocol = 'https:'
  target.hostname = NEW_SITE_HOSTNAME
  target.port = ''
  return target.toString()
}

export default function DomainMigrationNotice() {
  const [isOpen, setIsOpen] = useState(isLegacyDomain)

  if (!isOpen) return null

  return (
    <div className="alert-overlay" role="dialog" aria-modal="true" aria-labelledby="domain-migration-title">
      <Card className="alert-card migration-card">
        <Card.Header className="alert-header">
          <Card.Title id="domain-migration-title">网站域名已更换</Card.Title>
        </Card.Header>
        <Card.Content className="alert-body">
          <div className="alert-text">
            EndlessPower 已迁移到新的域名：<strong>issks.sile.mom</strong>。建议立即切换，以免旧域名到期后无法访问。
          </div>
          <div className="alert-actions migration-actions">
            <Button variant="secondary" onPress={() => setIsOpen(false)}>
              稍后再说
            </Button>
            <Button variant="primary" onPress={() => window.location.assign(getNewSiteUrl())}>
              前往新域名
            </Button>
          </div>
        </Card.Content>
      </Card>
    </div>
  )
}
