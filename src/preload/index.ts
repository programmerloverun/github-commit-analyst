import { contextBridge, ipcRenderer } from 'electron'
import type { RepoInfo, OverallStats } from '../main/github'

const api = {
  detectAuth: () =>
    ipcRenderer.invoke('detect-auth') as Promise<{ username: string; token: string }>,
  listRepos: (params: { username: string; token?: string }) =>
    ipcRenderer.invoke('fetch-repos', params) as Promise<RepoInfo[]>,
  fetchAllStats: (params: { username: string; repos: { owner: string; name: string }[]; token?: string; since?: string; until?: string }) =>
    ipcRenderer.invoke('fetch-all-stats', params) as Promise<OverallStats>,
  clearCache: (params: { username: string }) =>
    ipcRenderer.invoke('clear-cache', params) as Promise<void>,
  openExternal: (url: string) =>
    ipcRenderer.invoke('open-external', url),
  toggleSidebar: () =>
    ipcRenderer.invoke('toggle-sidebar') as Promise<void>,
  quitApp: () =>
    ipcRenderer.invoke('quit-app') as Promise<void>
}

contextBridge.exposeInMainWorld('api', api)
