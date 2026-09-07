/**
 * SEO 优化工具函数
 * 提供动态生成meta标签、结构化数据等功能
 */

export interface SEOConfig {
  title?: string
  description?: string
  keywords?: string[]
  image?: string
  url?: string
  type?: 'website' | 'article' | 'app'
  author?: string
  locale?: string
  siteName?: string
}

// 默认SEO配置
const defaultSEO: Required<SEOConfig> = {
  title: '充电桩地图查询 - EndlessPower',
  description: '闪开来电充电桩地图查询应用，实时查找附近充电桩，查看充电状态，支持收藏管理。覆盖全国主要城市充电站点，为电动汽车用户提供便捷的充电桩查询服务。',
  keywords: [
    '充电桩', '充电站', '电动汽车充电', '新能源汽车', 
    '充电桩查询', '充电桩地图', '闪开来电', 'EndlessPower',
    '实时充电状态', '附近充电桩', '充电桩导航', 'EV充电',
    '电动车充电', '新能源充电', '充电桩分布', '充电服务'
  ],
  image: '/pwa-512x512.svg',
  url: 'https://issks.sile.mom',
  type: 'website',
  author: 'EndlessPower Team',
  locale: 'zh_CN',
  siteName: 'EndlessPower'
}

/**
 * 生成页面标题
 */
export const generateTitle = (pageTitle?: string): string => {
  if (!pageTitle) return defaultSEO.title
  return `${pageTitle} - ${defaultSEO.siteName}`
}

/**
 * 生成meta描述
 */
export const generateDescription = (description?: string): string => {
  return description || defaultSEO.description
}

/**
 * 生成关键词字符串
 */
export const generateKeywords = (additionalKeywords: string[] = []): string => {
  const allKeywords = [...defaultSEO.keywords, ...additionalKeywords]
  return [...new Set(allKeywords)].join(', ')
}

/**
 * 生成Open Graph数据
 */
export const generateOpenGraph = (config: SEOConfig = {}): Record<string, string> => {
  const finalConfig = { ...defaultSEO, ...config }
  
  return {
    'og:type': finalConfig.type,
    'og:title': finalConfig.title,
    'og:description': finalConfig.description,
    'og:image': finalConfig.image,
    'og:url': finalConfig.url,
    'og:site_name': finalConfig.siteName,
    'og:locale': finalConfig.locale
  }
}

/**
 * 生成Twitter Cards数据
 */
export const generateTwitterCards = (config: SEOConfig = {}): Record<string, string> => {
  const finalConfig = { ...defaultSEO, ...config }
  
  return {
    'twitter:card': 'summary_large_image',
    'twitter:title': finalConfig.title,
    'twitter:description': finalConfig.description,
    'twitter:image': finalConfig.image,
    'twitter:site': '@EndlessPower',
    'twitter:creator': '@EndlessPower'
  }
}

/**
 * 生成结构化数据 (JSON-LD)
 */
export const generateStructuredData = (config: SEOConfig = {}) => {
  const finalConfig = { ...defaultSEO, ...config }
  
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    'name': finalConfig.siteName,
    'description': finalConfig.description,
    'url': finalConfig.url,
    'image': finalConfig.image,
    'author': {
      '@type': 'Organization',
      'name': finalConfig.author
    },
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'CNY',
      'description': '免费充电桩查询服务'
    },
    'applicationCategory': 'LifestyleApplication',
    'operatingSystem': 'Web',
    'browserRequirements': 'Requires modern web browser with JavaScript enabled',
    'softwareVersion': '1.2.0',
    'dateCreated': '2024-01-01',
    'dateModified': new Date().toISOString().split('T')[0],
    'inLanguage': 'zh-CN',
    'isAccessibleForFree': true,
    'keywords': finalConfig.keywords.join(', '),
    'mainEntity': {
      '@type': 'Service',
      'name': '充电桩查询服务',
      'description': '为电动汽车用户提供实时充电桩查询、导航和状态监控服务',
      'provider': {
        '@type': 'Organization',
        'name': finalConfig.siteName
      },
      'areaServed': {
        '@type': 'Country',
        'name': 'China'
      },
      'serviceType': '充电桩查询',
      'hasOfferCatalog': {
        '@type': 'OfferCatalog',
        'name': '充电桩服务',
        'itemListElement': [
          {
            '@type': 'Offer',
            'itemOffered': {
              '@type': 'Service',
              'name': '实时充电桩查询'
            }
          },
          {
            '@type': 'Offer', 
            'itemOffered': {
              '@type': 'Service',
              'name': '充电桩导航服务'
            }
          },
          {
            '@type': 'Offer',
            'itemOffered': {
              '@type': 'Service', 
              'name': '充电状态监控'
            }
          }
        ]
      }
    }
  }
  
  return JSON.stringify(structuredData)
}

/**
 * 生成面包屑导航结构化数据
 */
export const generateBreadcrumbStructuredData = (breadcrumbs: Array<{name: string, url: string}>) => {
  const breadcrumbList = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': item.name,
      'item': item.url
    }))
  }
  
  return JSON.stringify(breadcrumbList)
}

/**
 * 动态设置页面meta标签
 */
export const updatePageSEO = (config: SEOConfig = {}) => {
  const finalConfig = { ...defaultSEO, ...config }
  
  // 更新标题
  document.title = finalConfig.title
  
  // 更新或创建meta标签
  const updateMetaTag = (name: string, content: string, property = false) => {
    const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`
    let meta = document.querySelector(selector) as HTMLMetaElement
    
    if (!meta) {
      meta = document.createElement('meta')
      if (property) {
        meta.setAttribute('property', name)
      } else {
        meta.setAttribute('name', name)
      }
      document.head.appendChild(meta)
    }
    
    meta.setAttribute('content', content)
  }
  
  // 基础meta标签
  updateMetaTag('description', finalConfig.description)
  updateMetaTag('keywords', finalConfig.keywords.join(', '))
  updateMetaTag('author', finalConfig.author)
  
  // Open Graph标签
  const ogData = generateOpenGraph(finalConfig)
  Object.entries(ogData).forEach(([property, content]) => {
    updateMetaTag(property, content, true)
  })
  
  // Twitter Cards标签
  const twitterData = generateTwitterCards(finalConfig)
  Object.entries(twitterData).forEach(([name, content]) => {
    updateMetaTag(name, content)
  })
  
  // 更新结构化数据
  let structuredDataScript = document.querySelector('script[type="application/ld+json"]')
  if (!structuredDataScript) {
    structuredDataScript = document.createElement('script')
    structuredDataScript.setAttribute('type', 'application/ld+json')
    document.head.appendChild(structuredDataScript)
  }
  structuredDataScript.textContent = generateStructuredData(finalConfig)
}

// 页面特定的SEO配置
export const pageSEOConfigs = {
  home: {
    title: '充电桩地图查询 - EndlessPower',
    description: '智能充电桩查询应用，实时显示附近充电站状态，支持充电桩导航、收藏管理，为新能源汽车用户提供便捷充电服务。',
    keywords: ['首页', '充电桩地图', '附近充电桩']
  },
  favorites: {
    title: '我的收藏 - 充电桩管理',
    description: '管理您收藏的充电桩，快速访问常用充电站，支持置顶、批量操作等功能。',
    keywords: ['收藏夹', '充电桩收藏', '常用充电站']
  },
  settings: {
    title: '设置 - 个性化配置',
    description: '个性化设置您的充电桩查询体验，包括刷新频率、显示偏好、主题模式等。',
    keywords: ['设置', '偏好设置', '个性化']
  }
}
