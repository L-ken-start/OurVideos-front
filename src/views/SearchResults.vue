<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()

const searchQuery = ref('')
const results = ref([])
const total = ref(0)
const loading = ref(true)
const errorMsg = ref('')

function formatDuration(seconds) {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatPlayCount(count) {
  if (!count) return '0'
  if (count >= 10000) return (count / 10000).toFixed(1) + '万'
  return count.toLocaleString()
}

function goVideo(id) {
  router.push(`/video/${id}`)
}

function goHome() {
  router.push('/')
}

function handleSearch() {
  const q = searchQuery.value.trim()
  if (q) router.push(`/search?q=${encodeURIComponent(q)}`)
}

async function doSearch() {
  loading.value = true
  errorMsg.value = ''
  try {
    const { data } = await request.get('/videos/search', {
      params: { q: searchQuery.value, limit: 24 }
    })
    results.value = data.videos || []
    total.value = data.total || 0
  } catch (err) {
    errorMsg.value = err.response?.data?.error || '搜索失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  searchQuery.value = route.query.q || ''
  if (searchQuery.value) doSearch()
})

watch(() => route.query.q, (q) => {
  searchQuery.value = q || ''
  if (q) doSearch()
})
</script>

<template>
  <div class="search-page">

    <!-- 顶部导航 -->
    <header class="top-bar">
      <div class="top-left">
        <button class="back-btn" @click="goHome">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <router-link to="/" class="logo-link">
          <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="23 7 16 12 23 17 23 7"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
          <span class="logo-text">OurVideos</span>
        </router-link>
      </div>
    </header>

    <!-- 搜索栏 -->
    <div class="search-bar-area">
      <div class="search-box">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索视频..."
          class="search-input"
          @keyup.enter="handleSearch"
        />
      </div>
    </div>

    <main class="main-content">
      <!-- 结果统计 -->
      <div class="results-header" v-if="!loading && !errorMsg">
        <h2 class="results-title" v-if="searchQuery">搜索结果</h2>
        <span class="results-count" v-if="searchQuery">找到 <strong>{{ total }}</strong> 个视频</span>
      </div>

      <!-- 骨架屏 -->
      <div v-if="loading" class="skeleton-list">
        <div v-for="i in 6" :key="i" class="skeleton-row">
          <div class="skeleton-thumb" />
          <div class="skeleton-info">
            <div class="shimmer-line w-50" />
            <div class="shimmer-line w-25" />
            <div class="shimmer-line w-80" />
          </div>
        </div>
      </div>

      <!-- 错误 -->
      <div v-else-if="errorMsg" class="empty-state">
        <p>{{ errorMsg }}</p>
        <button class="empty-back" @click="goHome">返回首页</button>
      </div>

      <!-- 空结果 -->
      <div v-else-if="results.length === 0 && searchQuery" class="empty-state">
        <svg viewBox="0 0 100 100" fill="none" class="empty-icon">
          <circle cx="42" cy="42" r="18" stroke="rgba(255,255,255,0.1)" stroke-width="1.5"/>
          <line x1="56" y1="56" x2="72" y2="72" stroke="rgba(255,255,255,0.1)" stroke-width="2" stroke-linecap="round"/>
          <path d="M32 42h20M42 32v20" stroke="rgba(255,255,255,0.06)" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <p class="empty-title">未找到相关视频</p>
        <p class="empty-desc">试试更换关键词搜索</p>
      </div>

      <!-- 结果列表 -->
      <div v-else class="results-list">
        <div
          v-for="(item, idx) in results"
          :key="item.id"
          class="result-card"
          :style="{ animationDelay: idx * 0.05 + 's' }"
          @click="goVideo(item.id)"
        >
          <div class="result-thumb">
            <img :src="item.poster_url" :alt="item.title" loading="lazy" />
            <span class="result-duration" v-if="item.duration">{{ formatDuration(item.duration) }}</span>
            <span class="result-playcount" v-if="item.play_count">{{ formatPlayCount(item.play_count) }} 播放</span>
          </div>
          <div class="result-info">
            <h3 class="result-title">{{ item.title }}</h3>
            <div class="result-meta">
              <span>{{ item.category }}</span>
              <span v-if="item.year"> · {{ item.year }}</span>
              <span v-if="item.rating"> · {{ item.rating?.toFixed(1) }} 分</span>
            </div>
            <p class="result-desc" v-if="item.description">{{ item.description }}</p>
            <div class="result-tags" v-if="item.tags">
              <span v-for="tag in item.tags.split(',').slice(0,3)" :key="tag" class="result-tag">{{ tag.trim() }}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* =========== GLOBAL =========== */
.search-page {
  min-height: 100vh;
  background: #0d0d0d;
  color: #fff;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* =========== TOP BAR =========== */
.top-bar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 10;
  display: flex; align-items: center;
  padding: 0 32px; height: 56px;
  background: rgba(13, 13, 13, 0.95); backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.top-left { display: flex; align-items: center; gap: 14px; }
.back-btn {
  width: 34px; height: 34px; background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;
  color: rgba(255,255,255,0.6); cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.2s;
}
.back-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
.logo-link { display: flex; align-items: center; gap: 8px; text-decoration: none; }
.logo-icon { width: 26px; height: 26px; color: #e50914; }
.logo-text { font-size: 18px; font-weight: 700; color: #e50914; font-family: 'DM Serif Display', serif; }

/* =========== SEARCH BAR =========== */
.search-bar-area {
  padding: 80px 32px 24px;
  max-width: 720px;
  transition: padding 0.3s;
}
.search-bar-area.has-results { padding-bottom: 0; }
.search-box {
  display: flex; align-items: center;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 0 18px; height: 50px; transition: all 0.25s;
}
.search-box:focus-within { border-color: rgba(229,9,20,0.3); box-shadow: 0 0 0 4px rgba(229,9,20,0.06); background: rgba(0,0,0,0.3); }
.search-icon { width: 18px; height: 18px; color: rgba(255,255,255,0.3); flex-shrink: 0; }
.search-input {
  flex: 1; background: none; border: none; color: #fff; font-size: 15px;
  padding: 0 12px; outline: none; font-family: inherit;
}
.search-input::placeholder { color: rgba(255,255,255,0.2); }

/* =========== MAIN =========== */
.main-content { max-width: 900px; padding: 24px 32px 60px; }

.results-header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.04); }
.results-title { font-size: 20px; font-weight: 600; margin: 0 0 6px; font-family: 'DM Serif Display', serif; }
.results-count { font-size: 13px; color: rgba(255,255,255,0.25); }
.results-count strong { color: rgba(255,255,255,0.5); font-weight: 600; }

/* =========== SKELETON =========== */
.skeleton-list { display: flex; flex-direction: column; gap: 16px; }
.skeleton-row { display: flex; gap: 14px; }
.skeleton-thumb { width: 200px; aspect-ratio: 16/10; border-radius: 8px; background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; flex-shrink: 0; }
.skeleton-info { flex: 1; display: flex; flex-direction: column; gap: 10px; padding-top: 6px; }
.shimmer-line { height: 13px; border-radius: 4px; background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.w-50 { width: 50%; } .w-25 { width: 25%; } .w-80 { width: 80%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* =========== EMPTY =========== */
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 80px 0; gap: 12px; }
.empty-icon { width: 100px; height: 100px; }
.empty-title { font-size: 16px; color: rgba(255,255,255,0.25); margin: 0; }
.empty-desc { font-size: 13px; color: rgba(255,255,255,0.12); margin: 0; }
.empty-back { padding: 10px 24px; background: #e50914; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-family: inherit; }

/* =========== RESULTS LIST =========== */
.results-list { display: flex; flex-direction: column; gap: 2px; }
.result-card {
  display: flex; gap: 18px; padding: 14px 16px; border-radius: 10px; cursor: pointer;
  transition: all 0.2s; animation: fadeUp 0.4s ease-out both;
}
@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
.result-card:hover { background: rgba(255,255,255,0.03); }
.result-card:hover .result-title { color: #e50914; }
.result-thumb {
  position: relative; width: 220px; flex-shrink: 0; aspect-ratio: 16/10;
  border-radius: 8px; overflow: hidden; background: #181818;
}
.result-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
.result-card:hover .result-thumb img { transform: scale(1.05); }
.result-duration {
  position: absolute; bottom: 6px; right: 6px; padding: 2px 6px;
  background: rgba(0,0,0,0.8); border-radius: 4px; font-size: 11px; color: #fff;
}
.result-playcount {
  position: absolute; top: 6px; left: 6px; padding: 2px 8px;
  background: rgba(0,0,0,0.65); border-radius: 4px; font-size: 11px; color: rgba(255,255,255,0.75);
}
.result-info { flex: 1; min-width: 0; padding-top: 2px; }
.result-title { font-size: 16px; font-weight: 600; margin: 0 0 6px; color: #fff; line-height: 1.3; }
.result-meta { font-size: 12px; color: rgba(255,255,255,0.35); margin-bottom: 8px; }
.result-desc { font-size: 13px; line-height: 1.6; color: rgba(255,255,255,0.3); margin: 0 0 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.result-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.result-tag { padding: 2px 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; font-size: 11px; color: rgba(255,255,255,0.25); }

@media (max-width: 640px) {
  .top-bar { padding: 0 12px; }
  .search-bar-area { padding: 72px 12px 0; }
  .main-content { padding: 16px 12px 40px; }
  .result-card { flex-direction: column; }
  .result-thumb { width: 100%; aspect-ratio: 16/9; }
}
</style>
