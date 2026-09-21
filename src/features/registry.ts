import type { Component } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import type { FeatureMeta } from './types'

const metaModules = import.meta.glob<{ default: FeatureMeta }>('./*/meta.ts', { eager: true })
const viewModules = import.meta.glob<{ default: Component }>('./*/index.vue')

export const features: FeatureMeta[] = Object.values(metaModules)
  .map((m) => m.default)
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

export function findFeature(slug: string): FeatureMeta | undefined {
  return features.find((f) => f.slug === slug)
}

export const featureRoutes: RouteRecordRaw[] = features.map((meta) => {
  const loader = viewModules[`./${meta.slug}/index.vue`]
  if (!loader) throw new Error(`Feature "${meta.slug}" is missing index.vue`)
  return {
    path: `/features/${meta.slug}`,
    name: `feature-${meta.slug}`,
    component: loader,
    meta: { title: meta.title },
  }
})
