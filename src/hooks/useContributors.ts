import { useState, useEffect, useCallback } from 'react'
import { fetchContributors, fetchRepoStats, GitHubContributor } from '../utils/github'

export interface RepoStats {
  stars: number
  forks: number
  issues: number
  lastUpdated: string
  language: string
  license: string
}

export const useContributors = () => {
  const [contributors, setContributors] = useState<GitHubContributor[]>([])
  const [repoStats, setRepoStats] = useState<RepoStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [hasAttempted, setHasAttempted] = useState(false)

  const loadContributors = useCallback(async (force = false) => {
    // 防重复请求，除非强制刷新
    if (!force && (isLoading || (hasAttempted && lastUpdated && Date.now() - lastUpdated.getTime() < 5 * 60 * 1000))) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // 并行获取贡献者和仓库统计信息
      const [contributorsData, statsData] = await Promise.all([
        fetchContributors(),
        fetchRepoStats()
      ])

      setContributors(contributorsData)
      setRepoStats(statsData)
      setLastUpdated(new Date())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取贡献者信息失败'
      setError(errorMessage)
      console.error('Failed to load contributors:', err)
    } finally {
      setIsLoading(false)
      setHasAttempted(true)
    }
  }, [isLoading, hasAttempted, lastUpdated])

  // 组件挂载时自动加载
  useEffect(() => {
    loadContributors()
  }, [loadContributors])

  // 计算统计信息
  const stats = {
    totalContributors: contributors.length
  }

  return {
    contributors,
    repoStats,
    stats,
    isLoading,
    error,
    lastUpdated,
    loadContributors,
    refresh: () => loadContributors(true)
  }
}
