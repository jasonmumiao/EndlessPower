import { expect, test } from '@playwright/test'

const stationsFixture = [
  {
    stationId: 999,
    stationName: '清水河校区充电站（测试）',
    address: '四川省成都市（测试地址）',
    // GCJ-02（会在应用里按设置转换到 WGS84）
    latitude: 30.754736739439924,
    longitude: 103.92946279311207,
    freeNum: 2,
    switchType: 4
  }
]

const stationOutletsFixture: Record<number, any[]> = {
  999: [
    { outletId: 1, outletNo: 'A-01', outletSerialNo: 1, vOutletName: '插座01', iCurrentChargingRecordId: 0 },
    { outletId: 2, outletNo: 'A-02', outletSerialNo: 2, vOutletName: '插座02', iCurrentChargingRecordId: 0 }
  ]
}

const outletStatusFixture: Record<string, any> = {
  'A-01': {
    outlet: { outletId: 1, outletNo: 'A-01', outletSerialNo: 1, vOutletName: '插座01', iCurrentChargingRecordId: 0 },
    usedmin: 0,
    usedfee: 0,
    powerFee: { billingPower: '0W' }
  },
  'A-02': {
    outlet: { outletId: 2, outletNo: 'A-02', outletSerialNo: 2, vOutletName: '插座02', iCurrentChargingRecordId: 123 },
    usedmin: 18,
    usedfee: 5.5,
    powerFee: { billingPower: '2.4kW' }
  }
}

test.beforeEach(async ({ page }) => {
  await page.route('**/device/v1/near/station', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: '1', data: { elecStationData: stationsFixture } })
    })
  })

  await page.route('**/charge/v1/outlet/station/outlets/*', async (route) => {
    const url = new URL(route.request().url())
    const stationId = Number(url.pathname.split('/').pop())
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: '1', data: stationOutletsFixture[stationId] ?? [] })
    })
  })

  await page.route('**/charge/v1/charging/outlet/*', async (route) => {
    const url = new URL(route.request().url())
    const outletNo = url.pathname.split('/').pop() ?? ''
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: '1', data: outletStatusFixture[outletNo] ?? null })
    })
  })

  await page.goto('/')
})

test('loads map and search', async ({ page }) => {
  await expect(page.getByTestId('map-view')).toBeVisible()
  await expect(page.getByTestId('search-field')).toBeVisible()
  await expect(page.getByRole('button', { name: '清水河校区充电站（测试）' })).toBeVisible()
})

test('selecting search suggestion opens station modal', async ({ page }) => {
  await expect(page.getByTestId('map-view')).toBeVisible()

  await page.getByTestId('search-field').click()
  await page.getByRole('option', { name: /清水河校区充电站（测试）/ }).click()

  await expect(page.getByRole('heading', { name: '清水河校区充电站（测试）' })).toBeVisible()
})

test('opens station modal and enters monitor view', async ({ page }) => {
  const marker = page.getByRole('button', { name: '清水河校区充电站（测试）' })
  await expect(marker).toBeVisible()
  await marker.dispatchEvent('click')

  await expect(page.getByRole('heading', { name: '清水河校区充电站（测试）' })).toBeVisible()
  await expect(page.getByTestId('outlet-grid')).toBeVisible()

  await page.getByRole('button', { name: /插座 01/ }).click()
  await expect(page.getByTestId('monitor-view')).toBeVisible()
  await expect(page.getByText('清水河校区充电站（测试）')).toBeVisible()
})

test('adds favorite and shows in favorites view', async ({ page }) => {
  const marker = page.getByRole('button', { name: '清水河校区充电站（测试）' })
  await expect(marker).toBeVisible()
  await marker.dispatchEvent('click')

  await expect(page.getByRole('heading', { name: '清水河校区充电站（测试）' })).toBeVisible()
  await page.locator('.station-actions').getByRole('button', { name: '收藏' }).click()
  await page.getByRole('button', { name: '关闭' }).click()
  await page.locator('[data-slot="modal-backdrop"]').first().waitFor({ state: 'hidden' })

  await page.locator('.bottom-nav').getByRole('button', { name: '收藏' }).click()
  await expect(page.getByTestId('favorites-view')).toBeVisible()
  await expect(page.getByText('清水河校区充电站（测试）')).toBeVisible()
})

test('opens settings modal', async ({ page }) => {
  await page.locator('.bottom-nav').getByRole('button', { name: '设置' }).click()
  await expect(page.getByRole('heading', { name: '设置' })).toBeVisible()
  await expect(page.getByRole('button', { name: '完成' })).toBeVisible()

  const coordFix = page.getByRole('switch', { name: '中国坐标纠偏' })
  await expect(coordFix).toBeChecked()
  await coordFix.press('Space')
  await expect(coordFix).not.toBeChecked()

  const refreshIntervalTrigger = page.getByRole('button', { name: '刷新间隔' })
  await refreshIntervalTrigger.click()
  await page.getByRole('option', { name: '10 秒' }).click()
  await expect(refreshIntervalTrigger).toContainText('10 秒')

  await page.getByRole('button', { name: '完成' }).click()
  await page.locator('[data-slot="modal-backdrop"]').first().waitFor({ state: 'hidden' })
})
