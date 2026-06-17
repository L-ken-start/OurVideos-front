<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()

// ---- 状态 ----
const video = ref(null)
const relatedVideos = ref([])
const loading = ref(true)
const errorMsg = ref('')
const commentText = ref('')
const comments = ref([])
const commentTotal = ref(0)
const submitingComment = ref(false)
const videoLiked = ref(false)
const likingVideo = ref(false)
const likeBurst = ref(false)
const videoRef = ref(null)
const episodes = ref([])
const episodeLoading = ref(false)

// ---- 工具函数 ----
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

function formatDate(str) {
  if (!str) return ''
  return str.split(' ')[0] // "2026-06-08" 部分
}

function goVideo(id) {
  router.push(`/video/${id}`)
}

function goHome() {
  router.push('/')
}

// ---- API 调用 ----
async function loadVideo() {
  loading.value = true
  try {
    const id = route.params.id
    const [detailRes, relatedRes, commentRes] = await Promise.all([
      request.get(`/videos/${id}`),
      request.get('/videos', { params: { sort: 'popular', limit: 8 } }),
      request.get(`/videos/${id}/comments`, { params: { offset: 0, limit: 20, sort: 'latest' } }),
    ])
    console.log(detailRes.data)
    video.value = detailRes.data.video
    videoLiked.value = detailRes.data.is_liked || false
    relatedVideos.value = (relatedRes.data.videos || []).filter(v => v.id !== parseInt(id)).slice(0, 7)
    // 有系列 ID 则加载选集
    if (video.value.series_id > 0) loadEpisodes(video.value.series_id)
    comments.value = commentRes.data?.comments || []
    commentTotal.value = commentRes.data?.total || 0
  } catch (err) {
    errorMsg.value = err.response?.data?.error || '加载失败'
  } finally {
    loading.value = false
  }
}

async function loadEpisodes(seriesID) {
  episodeLoading.value = true
  try {
    const { data } = await request.get(`/videos/series/${seriesID}`)
    episodes.value = data.episodes || []
  } catch (err) {
    console.error('加载选集失败', err)
  } finally {
    episodeLoading.value = false
  }
}

async function toggleVideoLike() {
  if (likingVideo.value) return
  likingVideo.value = true
  try {
    await request.post(`/videos/${route.params.id}/like`)
    // 后端 toggle：有记录就删，没记录就插，前端只管翻转状态
    videoLiked.value = !videoLiked.value
    video.value.like_count += videoLiked.value ? 1 : -1
    if (videoLiked.value) {
      likeBurst.value = true
      setTimeout(() => { likeBurst.value = false }, 600)
    }
  } catch (err) {
    console.error(err)
  } finally {
    likingVideo.value = false
  }
}

async function toggleCommentLike(commentId) {
  const comment = comments.value.find(c => c.id === commentId)
  if (!comment) return
  try {
    const {data} =await request.post(`/comments/${commentId}/like`)
    comment.is_liked = !comment.is_liked
    comment.like_count = data.like_count
  } catch (err) {
    console.error(err)
  }
}

async function submitComment() {
  const text = commentText.value.trim()
  if (!text) return
  submitingComment.value = true
  try {
    const { data } = await request.post(`/videos/${route.params.id}/comments`, {
      video_id: Number(route.params.id),
      content: text,
    })
    // 把新评论插入列表最前面
    comments.value.unshift(data.new_comment)
    commentTotal.value++
    commentText.value = ''
  } catch (err) {
    // 评论失败不阻塞，后端逻辑你自己加
    console.error(err)
  } finally {
    submitingComment.value = false
  }
}

onMounted(() => {
  loadVideo()
})

// 监听路由参数变化，从视频 A 切换到视频 B 时重新加载
watch(() => route.params.id, () => {
  loadVideo()
})
</script>

<template>
  <div class="watch-page">

    <!-- ==================== 顶部导航 ==================== -->
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

    <!-- ==================== Loading ==================== -->
    <div v-if="loading" class="loading-state">
      <div class="loading-player" />
      <div class="loading-body">
        <div class="loading-main">
          <div class="shimmer-line w-60" />
          <div class="shimmer-line w-30" />
          <div class="shimmer-line w-90" />
          <div class="shimmer-line w-80" />
        </div>
        <div class="loading-sidebar">
          <div class="shimmer-card" v-for="i in 6" :key="i" />
        </div>
      </div>
    </div>

    <!-- ==================== Error ==================== -->
    <div v-else-if="errorMsg" class="error-state">
      <svg viewBox="0 0 80 80" fill="none" class="error-icon">
        <circle cx="40" cy="40" r="36" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
        <circle cx="40" cy="40" r="30" stroke="rgba(229,9,20,0.12)" stroke-width="1"/>
        <line x1="28" y1="28" x2="52" y2="52" stroke="rgba(255,255,255,0.15)" stroke-width="2" stroke-linecap="round"/>
        <line x1="52" y1="28" x2="28" y2="52" stroke="rgba(255,255,255,0.15)" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p>{{ errorMsg }}</p>
      <button class="error-back" @click="goHome">返回首页</button>
    </div>

    <!-- ==================== 主内容 ==================== -->
    <template v-else-if="video">
      <div class="watch-body">

        <!-- ===== 左侧：播放器 + 信息 + 评论 ===== -->
        <div class="watch-main">

          <!-- 播放器：有视频地址就播，没有就显示占位 -->
          <div v-if="video.video_url" class="player-container">
            <video
              ref="videoRef"
              class="player-video"
              :src="video.video_url"
              :poster="video.poster_url"
              controls
              preload="metadata"
            ></video>
          </div>
          <div v-else class="player-placeholder">
            <div class="player-backdrop" :style="{ backgroundImage: `url(${video.poster_url})` }" />
            <div class="player-overlay" />
            <div class="player-center">
              <div class="play-ring">
                <div class="play-inner">
                  <svg viewBox="0 0 24 24" fill="currentColor" class="play-icon"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </div>
              <span class="player-hint">视频播放功能即将上线</span>
            </div>
            <div class="player-bottom-bar">
              <div class="progress-track"><div class="progress-fill" style="width:0%" /></div>
              <div class="bottom-actions">
                <span class="time-label">00:00 / {{ formatDuration(video.duration) || '--:--' }}</span>
                <div class="right-actions">
                  <button class="player-btn" title="画质">1080P</button>
                  <button class="player-btn" title="倍速">1.0x</button>
                  <button class="player-btn" title="全屏">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><polygon points="8 3 8 8 3 8 3 5 6 5 5 3"/><polygon points="16 3 16 8 21 8 21 5 18 5 19 3"/><polygon points="21 16 16 16 16 21 19 21 18 19 21 19"/><polygon points="3 16 8 16 8 21 5 21 6 19 3 19"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 视频信息 -->
          <div class="video-info">
            <h1 class="video-title">{{ video.title }}</h1>

            <div class="video-stats-row">
              <div class="stats-left">
                <span class="stat-item">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                  {{ formatPlayCount(video.play_count) }} 次播放
                </span>
                <span class="stat-divider">·</span>
                <span class="stat-item">{{ formatDate(video.created_at) }}</span>
                <span class="stat-divider">·</span>
                <span class="stat-item">{{ video.category }}</span>
              </div>
              <div class="stats-right">
                <button
                  class="action-btn like-btn"
                  :class="{ liked: videoLiked }"
                  :disabled="likingVideo"
                  @click="toggleVideoLike"
                >
                  <div class="like-icon-box" :class="{ burst: likeBurst }">
                    <svg viewBox="0 0 24 24" :fill="videoLiked ? '#e50914' : 'none'" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </div>
                  <span class="like-count" :class="{ 'count-up': likeBurst }">{{ video.like_count || 0 }}</span>
                </button>
                <button class="action-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  分享
                </button>
              </div>
            </div>

            <!-- 标签 -->
            <div class="tags-row" v-if="video.tags">
              <span v-for="tag in video.tags.split(',')" :key="tag" class="tag-chip">{{ tag.trim() }}</span>
            </div>

            <!-- 简介 -->
            <div class="description-box" v-if="video.description">
              <p class="description-text">{{ video.description }}</p>
            </div>

            <!-- 选集面板 -->
            <div class="episodes-panel" v-if="video.series_id > 0 && episodes.length > 0">
              <div class="episodes-header">
                <h3 class="episodes-title">选集</h3>
                <span class="episodes-count">共 {{ episodes.length }} 集</span>
              </div>
              <div class="episodes-grid">
                <button
                  v-for="ep in episodes"
                  :key="ep.id"
                  class="episode-btn"
                  :class="{ active: ep.id === video.id }"
                  @click="goVideo(ep.id)"
                >
                  <span class="ep-num">{{ ep.episode || 1 }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- ===== 评论区占位 ===== -->
          <div class="comments-section">
            <h3 class="section-title">评论 <span class="comment-count">{{ commentTotal }}</span></h3>

            <!-- 评论输入框 -->
            <div class="comment-input-box">
              <div class="comment-avatar">
                <svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2c0 .7.5 1.2 1.2 1.2h16.8c.7 0 1.2-.5 1.2-1.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
              </div>
              <textarea
                v-model="commentText"
                class="comment-textarea"
                placeholder="发一条友善的评论..."
                rows="2"
                @keyup.enter.ctrl="submitComment"
              ></textarea>
              <button
                class="comment-submit-btn"
                :disabled="!commentText.trim() || submitingComment"
                @click="submitComment"
              >
                <span v-if="!submitingComment">发布</span>
                <span v-else class="btn-spin"></span>
              </button>
            </div>

            <!-- 评论列表 -->
            <div v-if="comments.length" class="comment-list">
              <div v-for="item in comments" :key="item.id" class="comment-item">
                <div class="comment-item-avatar">
                  <img v-if="item.avatar" :src="item.avatar" />
                  <svg v-else viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2c0 .7.5 1.2 1.2 1.2h16.8c.7 0 1.2-.5 1.2-1.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
                </div>
                <div class="comment-item-body">
                  <div class="comment-item-header">
                    <span class="comment-item-name">{{ item.username }}</span>
                    <span class="comment-item-time">{{ item.create_at }}</span>
                  </div>
                  <p class="comment-item-content">{{ item.content }}</p>
                  <button
                    class="comment-like-btn"
                    :class="{ liked: item.is_liked }"
                    @click="toggleCommentLike(item.id)"
                  >
                    <svg viewBox="0 0 24 24" :fill="item.is_liked ? '#e50914' : 'none'" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    <span v-if="item.like_count">{{ item.like_count }}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- 空评论 -->
            <div v-else class="comments-empty">
              <div class="empty-cube">
                <svg viewBox="0 0 100 100" fill="none">
                  <rect x="25" y="40" width="50" height="6" rx="3" fill="rgba(255,255,255,0.06)"/>
                  <rect x="25" y="52" width="35" height="6" rx="3" fill="rgba(255,255,255,0.04)"/>
                  <rect x="25" y="64" width="40" height="6" rx="3" fill="rgba(255,255,255,0.04)"/>
                  <circle cx="50" cy="22" r="14" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>
                  <path d="M43 22h14M50 15v14" stroke="rgba(255,255,255,0.06)" stroke-width="1.2" stroke-linecap="round"/>
                </svg>
              </div>
              <span class="empty-label">还没有评论，来说点什么吧</span>
            </div>
          </div>
        </div>

        <!-- ===== 右侧：推荐视频 ===== -->
        <aside class="watch-sidebar">
          <h3 class="sidebar-title">推荐视频</h3>
          <div class="sidebar-list">
            <div
              v-for="item in relatedVideos"
              :key="item.id"
              class="sidebar-card"
              @click="goVideo(item.id)"
            >
              <div class="sidebar-thumb">
                <img :src="item.poster_url" :alt="item.title" loading="lazy" />
                <span class="sidebar-duration" v-if="item.duration">{{ formatDuration(item.duration) }}</span>
              </div>
              <div class="sidebar-info">
                <h4 class="sidebar-video-title">{{ item.title }}</h4>
                <div class="sidebar-meta">
                  <span>{{ item.category }}</span>
                  <span v-if="item.play_count"> · {{ formatPlayCount(item.play_count) }} 播放</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 推荐列表为空时 -->
          <div v-if="relatedVideos.length === 0" class="sidebar-empty">
            <span>暂无推荐</span>
          </div>
        </aside>

      </div>
    </template>
  </div>
</template>

<style scoped>
/* =================================================================
   GLOBAL
   ================================================================= */
.watch-page {
  min-height: 100vh;
  background: #0a0a0a;
  color: #f1f1f1;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* =================================================================
   TOP BAR
   ================================================================= */
.top-bar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  display: flex; align-items: center;
  padding: 0 32px; height: 56px;
  background: rgba(10, 10, 10, 0.94);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.top-left { display: flex; align-items: center; gap: 14px; }
.back-btn {
  width: 34px; height: 34px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; color: rgba(255,255,255,0.6);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.back-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
.logo-link { display: flex; align-items: center; gap: 8px; text-decoration: none; }
.logo-icon { width: 26px; height: 26px; color: #e50914; }
.logo-text { font-size: 18px; font-weight: 700; color: #e50914; font-family: 'DM Serif Display', serif; }

/* =================================================================
   LOADING
   ================================================================= */
.loading-state { padding-top: 56px; }
.loading-player { width: 100%; aspect-ratio: 16/9; background: #111; max-height: 520px; }
.loading-body { display: flex; gap: 24px; padding: 24px 32px; max-width: 1440px; margin: 0 auto; }
.loading-main { flex: 1; display: flex; flex-direction: column; gap: 14px; padding-top: 8px; }
.shimmer-line { height: 14px; border-radius: 4px; background: linear-gradient(90deg, #151515 25%, #1d1d1d 50%, #151515 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.w-60 { width: 60%; } .w-30 { width: 30%; } .w-90 { width: 90%; } .w-80 { width: 80%; }
.loading-sidebar { width: 340px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px; }
.shimmer-card { height: 80px; border-radius: 8px; background: linear-gradient(90deg, #151515 25%, #1d1d1d 50%, #151515 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* =================================================================
   ERROR
   ================================================================= */
.error-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 16px; color: rgba(255,255,255,0.35); }
.error-icon { width: 80px; height: 80px; }
.error-back { padding: 10px 24px; background: #e50914; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-family: inherit; }

/* =================================================================
   MAIN LAYOUT
   ================================================================= */
.watch-body {
  display: flex; gap: 0;
  max-width: 1440px; margin: 0 auto;
  padding-top: 56px;
}
.watch-main { flex: 1; min-width: 0; }
.watch-sidebar { width: 360px; flex-shrink: 0; padding: 20px 24px 40px 0; }

/* =================================================================
   PLAYER
   ================================================================= */
.player-container {
  width: 100%;
  aspect-ratio: 16/9;
  max-height: 580px;
  background: #000;
  border-radius: 0 0 8px 8px;
  overflow: hidden;
}
.player-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  outline: none;
}

/* =================================================================
   PLAYER PLACEHOLDER
   ================================================================= */
.player-placeholder {
  position: relative; width: 100%;
  aspect-ratio: 16/9; max-height: 580px;
  background: #0d0d0d; overflow: hidden; border-radius: 0 0 8px 8px;
}
.player-backdrop {
  position: absolute; inset: 0;
  background-size: cover; background-position: center;
  filter: blur(40px) brightness(0.18);
  transform: scale(1.15);
}
.player-overlay {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at center, rgba(229,9,20,0.06) 0%, transparent 60%),
              linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.6) 100%);
}
.player-center {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px;
}
.play-ring {
  width: 72px; height: 72px; border-radius: 50%;
  background: rgba(229,9,20,0.18); border: 2px solid rgba(229,9,20,0.3);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.35s;
}
.play-ring:hover {
  background: rgba(229,9,20,0.3); border-color: rgba(229,9,20,0.5);
  transform: scale(1.1); box-shadow: 0 0 40px rgba(229,9,20,0.25);
}
.play-inner {
  width: 48px; height: 48px; border-radius: 50%;
  background: linear-gradient(135deg, #e50914, #b20710);
  display: flex; align-items: center; justify-content: center;
}
.play-icon { width: 22px; height: 22px; color: #fff; margin-left: 3px; }
.player-hint { font-size: 13px; color: rgba(255,255,255,0.25); font-weight: 500; }

/* bottom bar */
.player-bottom-bar { position: absolute; bottom: 0; left: 0; right: 0; padding: 16px 20px 12px; background: linear-gradient(transparent, rgba(0,0,0,0.7)); }
.progress-track { height: 3px; background: rgba(255,255,255,0.15); border-radius: 2px; margin-bottom: 12px; }
.progress-fill { height: 100%; background: #e50914; border-radius: 2px; }
.bottom-actions { display: flex; align-items: center; justify-content: space-between; }
.time-label { font-size: 12px; color: rgba(255,255,255,0.5); }
.right-actions { display: flex; gap: 8px; }
.player-btn {
  padding: 4px 10px; background: rgba(255,255,255,0.08); border: none; border-radius: 4px;
  color: rgba(255,255,255,0.6); font-size: 12px; cursor: pointer; font-family: inherit;
}
.player-btn:hover { background: rgba(255,255,255,0.14); color: #fff; }

/* =================================================================
   VIDEO INFO
   ================================================================= */
.video-info { padding: 20px 24px 0; }
.video-title { font-size: 22px; font-weight: 600; margin: 0 0 12px; font-family: 'DM Serif Display', serif; color: #fff; }
.video-stats-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 10px; }
.stats-left { display: flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.45); font-size: 13px; }
.stat-item { display: flex; align-items: center; gap: 4px; }
.stat-divider { color: rgba(255,255,255,0.15); }
.stats-right { display: flex; gap: 14px; }
.action-btn {
  display: flex; align-items: center; gap: 6px; padding: 8px 16px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;
  color: rgba(255,255,255,0.55); font-size: 13px; cursor: pointer; font-family: inherit;
  transition: all 0.2s;
}
.action-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }

/* like button */
.like-btn { position: relative; overflow: visible; }
.like-btn.liked { border-color: rgba(229,9,20,0.25); background: rgba(229,9,20,0.08); color: #e50914; }
.like-icon-box { display: flex; align-items: center; transition: transform 0.15s; }
.like-icon-box.burst { animation: likeBurst 0.45s ease-out; }
.like-count { min-width: 16px; text-align: left; transition: transform 0.15s; }
.like-count.count-up { animation: countPop 0.4s ease-out; }
@keyframes likeBurst {
  0% { transform: scale(1); }
  30% { transform: scale(1.35); }
  100% { transform: scale(1); }
}
@keyframes countPop {
  0% { transform: translateY(0); opacity: 1; }
  50% { transform: translateY(-6px); opacity: 0.6; color: #e50914; }
  100% { transform: translateY(0); opacity: 1; }
}

/* tags */
.tags-row { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
.tag-chip {
  padding: 4px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px; font-size: 12px; color: rgba(255,255,255,0.4); transition: all 0.2s;
}
.tag-chip:hover { background: rgba(229,9,20,0.1); border-color: rgba(229,9,20,0.2); color: #e50914; }

/* description */
.description-box { padding: 14px 16px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid rgba(255,255,255,0.04); margin-bottom: 8px; }
.description-text { font-size: 13px; line-height: 1.7; color: rgba(255,255,255,0.45); margin: 0; }

/* episodes */
.episodes-panel { margin-top: 20px; padding: 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 10px; }
.episodes-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.episodes-title { font-size: 14px; font-weight: 600; color: #fff; margin: 0; }
.episodes-count { font-size: 12px; color: rgba(255,255,255,0.3); }
.episodes-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.episode-btn {
  width: 42px; height: 38px; border-radius: 6px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5); font-size: 13px; font-weight: 500;
  cursor: pointer; font-family: inherit; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center;
}
.episode-btn:hover { background: rgba(255,255,255,0.1); color: #fff; border-color: rgba(255,255,255,0.15); }
.episode-btn.active { background: #e50914; border-color: #e50914; color: #fff; font-weight: 600; }
.ep-num { line-height: 1; }

/* =================================================================
   COMMENTS
   ================================================================= */
.comments-section { padding: 32px 24px 0; border-top: 1px solid rgba(255,255,255,0.04); margin-top: 24px; }
.section-title { font-size: 16px; font-weight: 600; margin: 0 0 16px; color: #fff; }
.comment-count { color: rgba(255,255,255,0.3); font-weight: 400; }

.comment-input-box { display: flex; gap: 12px; align-items: center; margin-bottom: 28px; }
.comment-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #2a2a2a, #1a1a1a); display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
.comment-avatar svg { color: rgba(255,255,255,0.25); }
.comment-textarea {
  flex: 1; padding: 10px 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 8px; color: #fff; font-size: 14px; resize: vertical; min-height: 42px;
  font-family: inherit; outline: none; transition: border-color 0.2s;
}
.comment-textarea::placeholder { color: rgba(255,255,255,0.18); }
.comment-textarea:focus { border-color: rgba(229,9,20,0.3); background: rgba(255,255,255,0.05); }

.comment-submit-btn {
  padding: 10px 20px; background: #e50914; color: #fff; border: none; border-radius: 8px;
  font-size: 13px; font-weight: 600; cursor: pointer; flex-shrink: 0; font-family: inherit;
  transition: all 0.2s; display: flex; align-items: center; gap: 6px;
}
.comment-submit-btn:hover:not(:disabled) { background: #f40612; }
.comment-submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-spin { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.5s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* comment list */
.comment-list { display: flex; flex-direction: column; }
.comment-item { display: flex; gap: 12px; padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.03); }
.comment-item-avatar {
  width: 36px; height: 36px; border-radius: 50%; overflow: hidden; flex-shrink: 0;
  background: linear-gradient(135deg, #2a2a2a, #1a1a1a); display: flex; align-items: center; justify-content: center;
}
.comment-item-avatar img { width: 100%; height: 100%; object-fit: cover; }
.comment-item-avatar svg { width: 22px; height: 22px; color: rgba(255,255,255,0.2); }
.comment-item-body { flex: 1; min-width: 0; }
.comment-item-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.comment-item-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.7); }
.comment-item-time { font-size: 11px; color: rgba(255,255,255,0.2); }
.comment-item-content { font-size: 14px; line-height: 1.6; color: rgba(255,255,255,0.55); margin: 0 0 6px; }

.comment-like-btn {
  display: inline-flex; align-items: center; gap: 4px; padding: 2px 0;
  background: none; border: none; color: rgba(255,255,255,0.3); font-size: 12px;
  cursor: pointer; font-family: inherit; transition: color 0.2s;
}
.comment-like-btn:hover { color: rgba(255,255,255,0.5); }
.comment-like-btn.liked { color: #e50914; }
.comment-like-btn svg { flex-shrink: 0; transition: transform 0.2s; }
.comment-like-btn:active svg { transform: scale(1.3); }

.comments-empty { display: flex; flex-direction: column; align-items: center; padding: 40px 0; gap: 12px; }
.empty-cube svg { width: 100px; height: 80px; display: block; }
.empty-label { font-size: 13px; color: rgba(255,255,255,0.15); }

/* =================================================================
   SIDEBAR
   ================================================================= */
.sidebar-title { font-size: 15px; font-weight: 600; margin: 0 0 16px; color: #fff; }
.sidebar-list { display: flex; flex-direction: column; gap: 12px; }
.sidebar-card {
  display: flex; gap: 10px; cursor: pointer; padding: 6px; border-radius: 8px;
  transition: background 0.2s;
}
.sidebar-card:hover { background: rgba(255,255,255,0.03); }
.sidebar-thumb {
  position: relative; width: 150px; flex-shrink: 0; aspect-ratio: 16/10;
  border-radius: 6px; overflow: hidden; background: #141414;
}
.sidebar-thumb img { width: 100%; height: 100%; object-fit: cover; }
.sidebar-duration {
  position: absolute; bottom: 4px; right: 4px; padding: 2px 5px;
  background: rgba(0,0,0,0.8); border-radius: 3px; font-size: 10px; color: #fff;
}
.sidebar-info { flex: 1; min-width: 0; padding-top: 2px; }
.sidebar-video-title {
  font-size: 13px; font-weight: 500; margin: 0 0 4px; color: #fff;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  line-height: 1.4;
}
.sidebar-meta { font-size: 11px; color: rgba(255,255,255,0.3); }
.sidebar-empty { padding: 40px 0; text-align: center; color: rgba(255,255,255,0.15); font-size: 13px; }

/* =================================================================
   RESPONSIVE
   ================================================================= */
@media (max-width: 1024px) {
  .watch-body { flex-direction: column; }
  .watch-sidebar { width: 100%; padding: 0 24px 40px; }
  .sidebar-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
}
@media (max-width: 640px) {
  .top-bar { padding: 0 12px; }
  .video-info { padding: 16px 12px 0; }
  .comments-section { padding: 24px 12px 0; }
  .video-title { font-size: 18px; }
  .sidebar-list { grid-template-columns: 1fr; }
  .watch-sidebar { padding: 0 12px 40px; }
}
</style>
