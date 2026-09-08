/**
 * GitHub API 相关工具函数
 * 用于获取项目贡献者信息
 */
export interface GitHubContributor {
  id: number
  login: string
  avatar_url: string
  html_url: string
  contributions: number
  type: 'User' | 'Bot'
  site_admin: boolean
}

// GitHub仓库信息
const GITHUB_REPO = {
  owner: 'jasonmumiao',
  repo: 'EndlessPower'
}

/**
 * 获取GitHub仓库贡献者列表
 */
export const fetchContributors = async (): Promise<GitHubContributor[]> => {
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO.owner}/${GITHUB_REPO.repo}/contributors?per_page=100`,
    {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'EndlessPower-App'
      }
    }
  )

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
  }

  const contributors: GitHubContributor[] = await response.json()

  // 过滤掉机器人账户
  return contributors.filter(contributor =>
    contributor.type === 'User' &&
    !contributor.login.includes('[bot]')
  )
}

/**
 * 获取仓库统计信息
 */
export const fetchRepoStats = async () => {
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO.owner}/${GITHUB_REPO.repo}`,
    {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'EndlessPower-App'
      }
    }
  )

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`)
  }

  const repo = (await response.json()) as any
  return {
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    issues: repo.open_issues_count || 0,
    lastUpdated: repo.updated_at,
    language: repo.language,
    license: repo.license?.name || 'Unknown'
  }
}
