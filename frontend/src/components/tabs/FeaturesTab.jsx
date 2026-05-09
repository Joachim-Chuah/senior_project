import React, { useState } from 'react'
import {
  hotkeysCoreFeature,
  selectionFeature,
  syncDataLoaderFeature,
} from '@headless-tree/core'
import { useTree } from '@headless-tree/react'
import {
  FolderIcon,
  FolderOpenIcon,
  FileIcon,
  Activity,
  Layers,
  SlidersHorizontal,
  Brain,
  BarChart2,
  ArrowRight,
} from 'lucide-react'
import { Tree, TreeItem, TreeItemLabel } from '@/components/ui/tree'

// Map leaf IDs to the feature they navigate to
const FEATURE_MAP = {
  'signal':         'dashboard',
  'stocktwits':     'dashboard',
  'reddit':         'dashboard',
  'sector-perf':    'sectors',
  'sector-news':    'sectors',
  'signal-scan':    'screener',
  'screener-detail':'screener',
  'chat':           'dashboard',
  'rag':            'dashboard',
  'news-search':    'dashboard',
  'watchlist':      'home',
  'trending':       'home',
}

const FOLDER_ICONS = {
  'sentiment':  Activity,
  'sectors':    Layers,
  'screener':   SlidersHorizontal,
  'ai':         Brain,
  'overview':   BarChart2,
}

const items = {
  root: {
    name: 'Rylo',
    children: ['overview', 'sentiment', 'sectors', 'screener', 'ai'],
  },
  overview: {
    name: 'Market Overview',
    children: ['watchlist', 'trending'],
  },
  watchlist:  { name: 'Watchlist' },
  trending:   { name: 'Trending Tickers' },
  sentiment: {
    name: 'Sentiment Analysis',
    children: ['signal', 'stocktwits', 'reddit'],
  },
  signal:     { name: 'Real-time Signal' },
  stocktwits: { name: 'StockTwits Feed' },
  reddit:     { name: 'Reddit Posts' },
  sectors: {
    name: 'Sector Rotation',
    children: ['sector-perf', 'sector-news'],
  },
  'sector-perf': { name: 'Sector Performance' },
  'sector-news': { name: 'Supporting News' },
  screener: {
    name: 'Stock Screener',
    children: ['signal-scan'],
  },
  'signal-scan': { name: 'Signal Scanner' },
  ai: {
    name: 'AI Analysis — Wong',
    children: ['chat', 'rag', 'news-search'],
  },
  chat:         { name: 'Chat Interface' },
  rag:          { name: 'Market Context (RAG)' },
  'news-search':{ name: 'News Search' },
}

const indent = 20

export default function FeaturesTab({ onSelect }) {
  const [treeItems] = useState(items)

  const tree = useTree({
    initialState: {
      expandedItems: ['overview', 'sentiment', 'sectors', 'screener', 'ai'],
    },
    indent,
    rootItemId: 'root',
    getItemName: (item) => item.getItemData().name,
    isItemFolder: (item) => (item.getItemData()?.children?.length ?? 0) > 0,
    dataLoader: {
      getItem: (itemId) => treeItems[itemId],
      getChildren: (itemId) => treeItems[itemId]?.children ?? [],
    },
    features: [syncDataLoaderFeature, hotkeysCoreFeature, selectionFeature],
  })

  function handleLeafClick(item) {
    const feature = FEATURE_MAP[item.getId()]
    if (feature) onSelect(feature)
  }

  return (
    <div className="flex flex-col items-center px-6 py-12 max-w-2xl mx-auto w-full">
      <div className="w-full mb-6">
        <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
          Features
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Browse the app's capabilities. Click any feature to open it.
        </p>
      </div>

      <div
        className="w-full rounded-lg border p-3"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <Tree indent={indent} tree={tree} className="w-full">
          {tree.getItems().map((item) => {
            const isFolder = item.isFolder()
            const FolderIconComp = FOLDER_ICONS[item.getId()] || null
            const feature = FEATURE_MAP[item.getId()]

            return (
              <TreeItem key={item.getId()} item={item}>
                <TreeItemLabel>
                  <span
                    className="flex items-center justify-between w-full"
                    onClick={!isFolder ? () => handleLeafClick(item) : undefined}
                    style={!isFolder ? { cursor: 'pointer' } : undefined}
                  >
                    <span className="flex items-center gap-2">
                      {isFolder ? (
                        item.isExpanded() ? (
                          FolderIconComp
                            ? <FolderIconComp size={14} style={{ color: 'var(--text-muted)' }} />
                            : <FolderOpenIcon size={14} style={{ color: 'var(--text-muted)' }} />
                        ) : (
                          FolderIconComp
                            ? <FolderIconComp size={14} style={{ color: 'var(--text-muted)' }} />
                            : <FolderIcon size={14} style={{ color: 'var(--text-muted)' }} />
                        )
                      ) : (
                        <FileIcon size={14} style={{ color: 'var(--text-muted)' }} />
                      )}
                      <span style={{ color: 'var(--text)' }}>{item.getItemName()}</span>
                    </span>
                    {!isFolder && feature && (
                      <ArrowRight size={12} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                    )}
                  </span>
                </TreeItemLabel>
              </TreeItem>
            )
          })}
        </Tree>
      </div>
    </div>
  )
}
