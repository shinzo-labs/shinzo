import { getAuthHeader } from './utils'
import { BACKEND_URL } from './config'
// import { BlockchainQuery, GridItem, Dashboard, NetworkList } from './types'

// const handleAuthError = () => {
//   document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
//   window.location.reload()
// }

// const dashboardService = {
//   async list(filters?: { owner_uuid?: string }): Promise<Dashboard[]> {
//     try {
//       const response = await fetch(`${BACKEND_URL}/dashboard/list`, {
//         method: 'POST',
//         headers: getAuthHeader(),
//         body: JSON.stringify(filters || {})
//       })

//       if (response.status === 401) {
//         handleAuthError()
//         return []
//       }

//       const data = await response.json()
//       return data.error ? [] : data.body.dashboards
//     } catch (error) {
//       console.error('Error in list:', error)
//       return []
//     }
//   },

//   async read(uuid: string): Promise<{
//     error?: boolean
//     body?: Dashboard
//   }> {
//     try {
//       const response = await fetch(`${BACKEND_URL}/dashboard/read`, {
//         method: 'POST',
//         headers: getAuthHeader(),
//         body: JSON.stringify({ uuid })
//       })

//       if (response.status === 401) {
//         handleAuthError()
//         return { error: true }
//       }

//       const data = await response.json()

//       if (data.body?.config?.gridItems) {
//         const typedGridItems: Record<string, GridItem> = {}
//         Object.entries(data.body.config.gridItems).forEach(([id, item]) => {
//           const gridItem = item as GridItem
//           typedGridItems[id] = gridItem
//         })
//         data.body.config.gridItems = typedGridItems
//       }

//       if (data.body?.config?.blockchainQueries) {
//         const typedBlockchainQueries: Record<string, BlockchainQuery> = {}
//         Object.entries(data.body.config.blockchainQueries).forEach(([id, query]) => {
//           const blockchainQuery = query as BlockchainQuery
//           typedBlockchainQueries[id] = blockchainQuery
//         })
//         data.body.config.blockchainQueries = typedBlockchainQueries
//       }

//       return data
//     } catch (error) {
//       console.error('Error in read:', error)
//       return { error: true }
//     }
//   },

//   async update(uuid: string, updates: Partial<Dashboard>): Promise<void> {
//     await fetch(`${BACKEND_URL}/dashboard/update`, {
//       method: 'POST',
//       headers: getAuthHeader(),
//       body: JSON.stringify({ uuid, ...updates })
//     })
//   },

//   async create(name: string): Promise<{
//     error?: boolean
//     body?: Dashboard
//   }> {
//     const response = await fetch(`${BACKEND_URL}/dashboard/create`, {
//       method: 'POST',
//       headers: getAuthHeader(),
//       body: JSON.stringify({
//         name,
//         visibility: 'private',
//         config: {
//           gridItems: {},
//           blockchainQueries: {}
//         }
//       })
//     })
//     return await response.json()
//   },

//   async delete(uuid: string): Promise<void> {
//     await fetch(`${BACKEND_URL}/dashboard/delete`, {
//       method: 'POST',
//       headers: getAuthHeader(),
//       body: JSON.stringify({ uuid })
//     })
//   },

//   async toggleStar(uuid: string): Promise<{
//     error?: boolean
//     body?: {
//       uuid: string
//       stars_count: number
//       isStarred: boolean
//     }
//   }> {
//     const response = await fetch(`${BACKEND_URL}/dashboard/toggleStar`, {
//       method: 'POST',
//       headers: getAuthHeader(),
//       body: JSON.stringify({ uuid })
//     })
//     return await response.json()
//   }
// }

// const userService = {
//   async login(message: string, signature: string): Promise<{
//     error?: boolean
//     body?: {
//       token: string
//       uuid: string
//     }
//   }> {
//     const response = await fetch(`${BACKEND_URL}/user/login`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ message, signature })
//     })
//     return await response.json()
//   }
// }

// const blockchainService = {
//   async getNetworks(): Promise<NetworkList> {
//     const response = await fetch(`${BACKEND_URL}/blockchain/list`, {
//       method: 'POST',
//       headers: getAuthHeader(),
//       body: JSON.stringify({})
//     })
//     const data = await response.json()
//     return data.error ? {} : data.body
//   },

//   async callBlockchain(request: {
//     address: string
//     functionSignature: string
//     network: string
//     networkEnv: string
//     params: any[]
//   }): Promise<{
//     error?: boolean
//     body?: any
//   }> {
//     const response = await fetch(`${BACKEND_URL}/blockchain/call`, {
//       method: 'POST',
//       headers: getAuthHeader(),
//       body: JSON.stringify(request)
//     })
//     return await response.json()
//   }
// }

// export {
//   blockchainService,
//   dashboardService,
//   userService
// }
