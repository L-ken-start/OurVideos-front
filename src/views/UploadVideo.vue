<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import request from '@/utils/request'
import { message } from 'ant-design-vue'

const router = useRouter()

const title = ref('')
const category = ref('movie')
const description = ref('')
const posterFile = ref(null)
const posterPreview = ref('')
const videoFile = ref(null)
const tags = ref('')
const year = ref(new Date().getFullYear())
const submitting = ref(false)
const errorMsg = ref('')

// 上传状态
const posterUrl = ref('')
const videoUrl = ref('')
const uploadingPoster = ref(false)
const uploadingVideo = ref(false)
const posterInput = ref(null)
const videoInput = ref(null)

const categories = [
  { label: '电影', value: 'movie' },
  { label: '电视剧', value: 'series' },
  { label: '动画', value: 'anime' },
]

function handlePosterChange(e) {
  const file = e.target.files[0]
  if (!file) return
  posterFile.value = file
  const reader = new FileReader()
  reader.onload = (ev) => { posterPreview.value = ev.target.result }
  reader.readAsDataURL(file)
  uploadPoster()
}

async function uploadPoster() {
  if (!posterFile.value) return
  uploadingPoster.value = true
  try {
    const fd = new FormData()
    fd.append('file', posterFile.value)
    fd.append('type', 'poster')
    const { data } = await request.post('/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    posterUrl.value = data.url
  } catch (err) {
    errorMsg.value = '封面上传失败'
  } finally {
    uploadingPoster.value = false
  }
}

function handleVideoChange(e) {
  const file = e.target.files[0]
  if (!file) return
  videoFile.value = file
  uploadVideo()
}

async function uploadVideo() {
  if (!videoFile.value) return
  uploadingVideo.value = true
  try {
    // 视频文件暂存本地 static/videos，通过 /upload 接口
    const fd = new FormData()
    fd.append('file', videoFile.value)
    fd.append('type', 'video')
    const { data } = await request.post('/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    videoUrl.value = data.url
  } catch (err) {
    errorMsg.value = '视频上传失败'
  } finally {
    uploadingVideo.value = false
  }
}

async function handleSubmit() {
  if (!title.value.trim()) { errorMsg.value = '请输入标题'; return }
  if (!posterUrl.value) { errorMsg.value = '请上传封面'; return }
  if (!videoUrl.value) { errorMsg.value = '请上传视频文件'; return }

  submitting.value = true
  errorMsg.value = ''
  try {
    await request.post('/upload_videos', {
      title: title.value,
      category: category.value,
      description: description.value,
      poster_url: posterUrl.value,
      video_url: videoUrl.value,
      tags: tags.value,
      year: year.value,
    })
    message.info("投稿成功")
    router.push('/')
  } catch (err) {
    errorMsg.value = err.response?.data?.error || '投稿失败'
  } finally {
    submitting.value = false
  }
}

function goBack() { router.push('/') }
</script>

<template>
  <div class="upload-page">

    <!-- 顶部导航 -->
    <header class="top-bar">
      <div class="top-left">
        <button class="back-btn" @click="goBack">
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

    <main class="main-content">
      <div class="form-container">
        <div class="form-header">
          <h1 class="form-title">视频投稿</h1>
          <p class="form-desc">分享你的精彩内容，让更多人看到</p>
        </div>

        <!-- 错误 -->
        <Transition name="fade">
          <div v-if="errorMsg" class="error-bar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="error-icon"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            {{ errorMsg }}
          </div>
        </Transition>

        <!-- 标题 -->
        <div class="form-group">
          <label class="form-label">标题 <span class="required">*</span></label>
          <input v-model="title" type="text" class="form-input" placeholder="输入视频标题" maxlength="100" />
        </div>

        <!-- 分类 -->
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">分类 <span class="required">*</span></label>
            <div class="category-tabs">
              <button v-for="c in categories" :key="c.value" type="button"
                class="cat-btn" :class="{ active: category === c.value }"
                @click="category = c.value">{{ c.label }}</button>
            </div>
          </div>
          <div class="form-group flex-1">
            <label class="form-label">年份</label>
            <input v-model.number="year" type="number" class="form-input" placeholder="2025" min="1900" max="2030" />
          </div>
        </div>

        <!-- 简介 -->
        <div class="form-group">
          <label class="form-label">简介</label>
          <textarea v-model="description" class="form-textarea" placeholder="简单介绍一下视频内容..." maxlength="500" rows="3"></textarea>
          <span class="char-count">{{ description.length }}/500</span>
        </div>

        <!-- 标签 -->
        <div class="form-group">
          <label class="form-label">标签</label>
          <input v-model="tags" type="text" class="form-input" placeholder="科幻, 冒险, 史诗（用逗号分隔）" />
        </div>

        <!-- 封面上传 -->
        <div class="form-group">
          <label class="form-label">封面 <span class="required">*</span></label>
          <div class="upload-zone" :class="{ done: posterUrl }" @click="posterInput?.click()">
            <div v-if="posterPreview" class="upload-preview">
              <img :src="posterPreview" alt="封面预览" />
              <div class="upload-overlay">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                <span>更换封面</span>
              </div>
            </div>
            <div v-else class="upload-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              <span>点击上传封面</span>
              <span class="upload-hint">JPG / PNG / WebP，建议 400x600</span>
            </div>
            <span v-if="uploadingPoster" class="uploading-badge">上传中...</span>
          </div>
          <input ref="posterInput" type="file" accept="image/*" class="file-hidden" @change="handlePosterChange" />
        </div>

        <!-- 视频上传 -->
        <div class="form-group">
          <label class="form-label">视频文件 <span class="required">*</span></label>
          <div class="upload-zone" :class="{ done: videoUrl }" @click="videoInput?.click()">
            <div v-if="videoFile" class="upload-preview video-preview">
              <svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40" style="color:#e50914"><path d="M8 5v14l11-7z"/></svg>
              <div class="video-file-info">
                <span class="video-filename">{{ videoFile.name }}</span>
                <span class="video-filesize">{{ (videoFile.size / 1024 / 1024).toFixed(1) }} MB</span>
              </div>
            </div>
            <div v-else class="upload-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/><polyline points="16 16 12 12 8 16"/></svg>
              <span>点击上传视频</span>
              <span class="upload-hint">MP4 格式，建议 H.264 编码</span>
            </div>
            <span v-if="uploadingVideo" class="uploading-badge">上传中...</span>
          </div>
          <input ref="videoInput" type="file" accept="video/mp4" class="file-hidden" @change="handleVideoChange" />
        </div>

        <!-- 提交 -->
        <div class="form-actions">
          <button class="submit-btn" :disabled="submitting" @click="handleSubmit">
            <span v-if="!submitting">发布视频</span>
            <span v-else class="btn-loading">
              <span class="spinner-sm" />发布中...
            </span>
          </button>
          <button class="cancel-btn" @click="goBack">取消</button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.upload-page { min-height: 100vh; background: #0d0d0d; color: #fff; font-family: 'DM Sans', sans-serif; }

.top-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 10; display: flex; align-items: center; padding: 0 32px; height: 56px; background: rgba(13,13,13,0.95); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.04); }
.top-left { display: flex; align-items: center; gap: 14px; }
.back-btn { width: 34px; height: 34px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; color: rgba(255,255,255,0.6); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.back-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
.logo-link { display: flex; align-items: center; gap: 8px; text-decoration: none; }
.logo-icon { width: 26px; height: 26px; color: #e50914; }
.logo-text { font-size: 18px; font-weight: 700; color: #e50914; font-family: 'DM Serif Display', serif; }

.main-content { padding: 88px 32px 60px; max-width: 720px; margin: 0 auto; }

.form-header { margin-bottom: 32px; }
.form-title { font-size: 26px; font-weight: 600; margin: 0 0 6px; font-family: 'DM Serif Display', serif; }
.form-desc { font-size: 14px; color: rgba(255,255,255,0.35); margin: 0; }

.error-bar { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: rgba(229,9,20,0.1); border: 1px solid rgba(229,9,20,0.2); border-radius: 10px; color: #ff6b6b; font-size: 13px; margin-bottom: 24px; }
.error-icon { width: 18px; height: 18px; flex-shrink: 0; }
.fade-enter-active, .fade-leave-active { transition: all 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-8px); }

.form-group { margin-bottom: 22px; position: relative; }
.form-label { display: block; font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.6); margin-bottom: 8px; }
.required { color: #e50914; }
.form-input { width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; color: #fff; font-size: 14px; font-family: inherit; outline: none; transition: all 0.2s; box-sizing: border-box; }
.form-input:focus { border-color: rgba(229,9,20,0.3); box-shadow: 0 0 0 3px rgba(229,9,20,0.06); background: rgba(255,255,255,0.07); }
.form-input::placeholder { color: rgba(255,255,255,0.18); }

.form-row { display: flex; gap: 16px; }
.flex-1 { flex: 1; }

.category-tabs { display: flex; gap: 8px; }
.cat-btn { padding: 10px 20px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; color: rgba(255,255,255,0.4); font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.2s; }
.cat-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
.cat-btn.active { background: rgba(229,9,20,0.12); border-color: rgba(229,9,20,0.3); color: #e50914; font-weight: 600; }

.form-textarea { width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; color: #fff; font-size: 14px; font-family: inherit; outline: none; resize: vertical; min-height: 80px; transition: all 0.2s; box-sizing: border-box; }
.form-textarea:focus { border-color: rgba(229,9,20,0.3); box-shadow: 0 0 0 3px rgba(229,9,20,0.06); }
.char-count { position: absolute; right: 12px; bottom: 10px; font-size: 11px; color: rgba(255,255,255,0.15); pointer-events: none; }

.upload-zone { position: relative; border: 2px dashed rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden; cursor: pointer; transition: all 0.2s; }
.upload-zone:hover { border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.02); }
.upload-zone.done { border-color: rgba(229,9,20,0.2); border-style: solid; }
.upload-placeholder { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 36px; color: rgba(255,255,255,0.2); }
.upload-placeholder svg { opacity: 0.5; }
.upload-placeholder span { font-size: 14px; }
.upload-hint { font-size: 11px !important; color: rgba(255,255,255,0.12) !important; }
.upload-preview { position: relative; }
.upload-preview img { width: 100%; max-height: 240px; object-fit: cover; display: block; }
.upload-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; opacity: 0; transition: opacity 0.2s; }
.upload-zone:hover .upload-overlay { opacity: 1; }
.upload-overlay svg, .upload-overlay span { color: #fff; font-size: 13px; }
.video-preview { display: flex; align-items: center; gap: 16px; padding: 24px; }
.video-file-info { display: flex; flex-direction: column; gap: 4px; }
.video-filename { font-size: 14px; color: #fff; }
.video-filesize { font-size: 12px; color: rgba(255,255,255,0.3); }
.uploading-badge { position: absolute; top: 10px; right: 10px; padding: 4px 10px; background: rgba(229,9,20,0.9); border-radius: 4px; font-size: 11px; color: #fff; }
.file-hidden { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; }

.form-actions { display: flex; gap: 12px; padding-top: 16px; }
.submit-btn { padding: 13px 36px; background: #e50914; color: #fff; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; }
.submit-btn:hover:not(:disabled) { background: #f40612; transform: translateY(-1px); box-shadow: 0 8px 30px rgba(229,9,20,0.3); }
.submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.cancel-btn { padding: 13px 28px; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; font-size: 15px; cursor: pointer; font-family: inherit; transition: all 0.2s; }
.cancel-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
.btn-loading { display: flex; align-items: center; gap: 8px; }
.spinner-sm { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.5s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 640px) {
  .top-bar { padding: 0 12px; }
  .main-content { padding: 72px 12px 40px; }
  .form-row { flex-direction: column; }
}
</style>
