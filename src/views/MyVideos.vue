<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import request from '@/utils/request'
import { getToken } from '@/utils/auth'
import { message } from 'ant-design-vue'

const router = useRouter()

const videos = ref([])
const loading = ref(true)
const errorMsg = ref('')

// 添加剧集弹窗
const showModal = ref(false)
const editingSeries = ref(null)
const epTitle = ref('')
const epFile = ref(null)
const epUploading = ref(false)
const epVideoUrl = ref('')
const epSubmitting = ref(false)
const epVideoInput = ref(null)

function parseJwt(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
  } catch { return null }
}

function formatPlayCount(count) {
  if (!count) return '0'
  if (count >= 10000) return (count / 10000).toFixed(1) + '万'
  return count.toLocaleString()
}

function goVideo(id) { router.push(`/video/${id}`) }
function goHome() { router.push('/') }

async function loadMyVideos() {
  loading.value = true
  const jwt = parseJwt(getToken())
  if (!jwt?.user_id) { loading.value = false; return }
  try {
    const { data } = await request.get('/videos', { params: { user_id: jwt.user_id, limit: 50 } })
    videos.value = data.videos || []
  } catch (err) {
    errorMsg.value = err.response?.data?.error || '加载失败'
  } finally {
    loading.value = false
  }
}

// 打开添加剧集弹窗
function openAddEpisode(video) {
  editingSeries.value = video
  epTitle.value = `${video.title} 第X集`
  epFile.value = null
  epVideoUrl.value = ''
  showModal.value = true
}

function handleEpFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  epFile.value = file
  uploadEpVideo()
}

async function uploadEpVideo() {
  if (!epFile.value) return
  epUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', epFile.value)
    fd.append('type', 'video')
    const { data } = await request.post('/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    epVideoUrl.value = data.url
  } catch (err) {
    errorMsg.value = '视频上传失败'
  } finally {
    epUploading.value = false
  }
}

async function submitEpisode() {
  if (!epVideoUrl.value) { errorMsg.value = '请上传视频'; return }
  epSubmitting.value = true
  try {
    const title = epTitle.value ;
    const parts = title.split("第")[1]; // "5集"
    const episodeNumber = parseInt(parts.split("集")[0]); // "5"
    console.log("上传的数据为：",editingSeries.value.series_id)
    await request.post('/upload_video', {
      title: epTitle.value || `${editingSeries.value.title} 第X集`,
      category: editingSeries.value.category,
      poster_url:editingSeries.value.poster_url,
      video_url: epVideoUrl.value,
      series_id:editingSeries.value.series_id,
      year: editingSeries.value.year || 0,
      episode:episodeNumber,

    })
    
    message.info("上传成功")
    showModal.value = false
    loadMyVideos()
  } catch (err) {
    errorMsg.value = err.response?.data?.error || '添加失败'
  } finally {
    epSubmitting.value = false
  }
}

onMounted(() => { loadMyVideos() })
</script>

<template>
  <div class="myvideos-page">

    <header class="top-bar">
      <div class="top-left">
        <button class="back-btn" @click="goHome">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
        <router-link to="/" class="logo-link">
          <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          <span class="logo-text">OurVideos</span>
        </router-link>
      </div>
    </header>

    <main class="main-content">
      <div class="page-header">
        <h1 class="page-title">我的视频</h1>
        <router-link to="/upload" class="upload-link">+ 投稿新视频</router-link>
      </div>

      <div v-if="loading" class="skeleton-list">
        <div v-for="i in 4" :key="i" class="skeleton-row"><div class="s-thumb"/><div class="s-info"><div class="s-line w50"/><div class="s-line w30"/></div></div>
      </div>

      <div v-else-if="errorMsg" class="empty-state"><p>{{ errorMsg }}</p></div>

      <div v-else-if="videos.length === 0" class="empty-state">
        <p class="empty-title">还没有发布视频</p>
        <router-link to="/upload" class="empty-btn">去投稿</router-link>
      </div>

      <div v-else class="video-list">
        <div v-for="item in videos" :key="item.id" class="video-row">
          <div class="v-thumb" @click="goVideo(item.id)">
            <img :src="item.poster_url" :alt="item.title" />
            <span class="v-ep" v-if="item.episode">第{{ item.episode }}集</span>
          </div>
          <div class="v-info">
            <h3 class="v-title" @click="goVideo(item.id)">{{ item.title }}</h3>
            <div class="v-meta">{{ item.category }} · {{ formatPlayCount(item.play_count) }} 播放</div>
            <div class="v-actions">
              <button v-if="item.category === '电视剧' || item.category === '动画'" class="v-add-ep-btn" @click="openAddEpisode(item)">+ 添加剧集</button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 添加剧集弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
          <div class="modal-box">
            <h3 class="modal-title">添加剧集</h3>
            <p class="modal-desc">{{ editingSeries?.title }}</p>

            <div class="form-group">
              <label class="form-label">标题</label>
              <input v-model="epTitle" type="text" class="form-input" />
            </div>

            <div class="form-group">
              <label class="form-label">视频文件</label>
              <div class="ep-upload-zone" @click="epVideoInput?.click()">
                <div v-if="epFile" class="ep-file-info">
                  <svg viewBox="0 0 24 24" fill="#e50914" width="24" height="24"><path d="M8 5v14l11-7z"/></svg>
                  <span>{{ epFile.name }}</span>
                </div>
                <div v-else class="ep-upload-hint">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/></svg>
                  <span>点击上传 MP4</span>
                </div>
                <span v-if="epUploading" class="uploading-tag">上传中...</span>
              </div>
              <input ref="epVideoInput" type="file" accept="video/mp4" class="file-hidden" @change="handleEpFileChange" />
            </div>

            <div class="modal-actions">
              <button class="modal-submit" :disabled="epSubmitting || !epVideoUrl" @click="submitEpisode">
                {{ epSubmitting ? '提交中...' : '发布' }}
              </button>
              <button class="modal-cancel" @click="showModal = false">取消</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.myvideos-page { min-height: 100vh; background: #0d0d0d; color: #fff; font-family: 'DM Sans', sans-serif; }

.top-bar { position: fixed; top:0; left:0; right:0; z-index:10; display:flex; align-items:center; padding:0 32px; height:56px; background:rgba(13,13,13,0.95); backdrop-filter:blur(12px); border-bottom:1px solid rgba(255,255,255,0.04); }
.top-left { display:flex; align-items:center; gap:14px; }
.back-btn { width:34px; height:34px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:8px; color:rgba(255,255,255,0.6); cursor:pointer; display:flex; align-items:center; justify-content:center; }
.back-btn:hover { background:rgba(255,255,255,0.1); color:#fff; }
.logo-link { display:flex; align-items:center; gap:8px; text-decoration:none; }
.logo-icon { width:26px; height:26px; color:#e50914; }
.logo-text { font-size:18px; font-weight:700; color:#e50914; font-family:'DM Serif Display', serif; }

.main-content { padding: 88px 32px 60px; max-width: 800px; margin: 0 auto; }

.page-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:28px; }
.page-title { font-size:22px; font-weight:600; margin:0; font-family:'DM Serif Display', serif; }
.upload-link { padding:8px 18px; background:#e50914; color:#fff; text-decoration:none; border-radius:8px; font-size:13px; font-weight:600; transition:background 0.2s; }
.upload-link:hover { background:#f40612; }

.skeleton-list { display:flex; flex-direction:column; gap:12px; }
.skeleton-row { display:flex; gap:14px; padding:10px; }
.s-thumb { width:160px; aspect-ratio:16/10; border-radius:8px; background:linear-gradient(90deg,#1a1a1a 25%,#222 50%,#1a1a1a 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; }
.s-info { flex:1; display:flex; flex-direction:column; gap:8px; padding-top:8px; }
.s-line { height:12px; border-radius:4px; background:linear-gradient(90deg,#1a1a1a 25%,#222 50%,#1a1a1a 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; }
.w50 { width:50%; } .w30 { width:30%; }
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

.empty-state { display:flex; flex-direction:column; align-items:center; padding:80px 0; gap:16px; }
.empty-title { font-size:16px; color:rgba(255,255,255,0.25); margin:0; }
.empty-btn { padding:10px 24px; background:#e50914; color:#fff; text-decoration:none; border-radius:8px; font-size:14px; }

.video-list { display:flex; flex-direction:column; gap:4px; }
.video-row { display:flex; gap:16px; padding:12px; border-radius:10px; transition:background 0.2s; }
.video-row:hover { background:rgba(255,255,255,0.02); }
.v-thumb { position:relative; width:180px; flex-shrink:0; aspect-ratio:16/10; border-radius:8px; overflow:hidden; cursor:pointer; background:#181818; }
.v-thumb img { width:100%; height:100%; object-fit:cover; }
.v-ep { position:absolute; bottom:6px; right:6px; padding:2px 7px; background:rgba(0,0,0,0.7); border-radius:4px; font-size:11px; color:#fff; }
.v-info { flex:1; min-width:0; display:flex; flex-direction:column; justify-content:center; }
.v-title { font-size:15px; font-weight:600; margin:0 0 4px; cursor:pointer; color:#fff; }
.v-title:hover { color:#e50914; }
.v-meta { font-size:12px; color:rgba(255,255,255,0.35); margin-bottom:8px; }
.v-add-ep-btn { padding:6px 14px; background:rgba(229,9,20,0.12); border:1px solid rgba(229,9,20,0.2); border-radius:6px; color:#e50914; font-size:12px; cursor:pointer; font-family:inherit; transition:all 0.2s; align-self:flex-start; }
.v-add-ep-btn:hover { background:rgba(229,9,20,0.2); }

/* modal */
.modal-overlay { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); }
.modal-box { background:#1a1a1a; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:28px; width:460px; max-width:90vw; }
.modal-title { font-size:18px; font-weight:600; margin:0 0 4px; }
.modal-desc { font-size:13px; color:rgba(255,255,255,0.3); margin:0 0 20px; }
.form-group { margin-bottom:18px; }
.form-label { display:block; font-size:13px; color:rgba(255,255,255,0.5); margin-bottom:6px; }
.form-input { width:100%; padding:10px 14px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:8px; color:#fff; font-size:14px; font-family:inherit; outline:none; box-sizing:border-box; }
.form-input:focus { border-color:rgba(229,9,20,0.3); }
.ep-upload-zone { border:2px dashed rgba(255,255,255,0.1); border-radius:10px; padding:24px; cursor:pointer; text-align:center; transition:all 0.2s; }
.ep-upload-zone:hover { border-color:rgba(255,255,255,0.2); }
.ep-upload-hint { display:flex; align-items:center; justify-content:center; gap:10px; color:rgba(255,255,255,0.3); font-size:14px; }
.ep-file-info { display:flex; align-items:center; gap:10px; font-size:14px; color:#fff; }
.uploading-tag { position:absolute; top:8px; right:8px; padding:3px 8px; background:rgba(229,9,20,0.8); border-radius:4px; font-size:11px; }
.file-hidden { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; }
.modal-actions { display:flex; gap:10px; padding-top:4px; }
.modal-submit { padding:10px 28px; background:#e50914; color:#fff; border:none; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; font-family:inherit; }
.modal-submit:disabled { opacity:0.4; cursor:not-allowed; }
.modal-cancel { padding:10px 22px; background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.5); border:1px solid rgba(255,255,255,0.1); border-radius:8px; font-size:14px; cursor:pointer; font-family:inherit; }
.modal-enter-active, .modal-leave-active { transition:opacity 0.25s; }
.modal-enter-from, .modal-leave-to { opacity:0; }

@media (max-width:640px) {
  .top-bar { padding:0 12px; }
  .main-content { padding:72px 12px 40px; }
  .video-row { flex-direction:column; }
  .v-thumb { width:100%; }
}
</style>
