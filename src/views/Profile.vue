<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { getToken } from '@/utils/auth'
import request from '@/utils/request'

const router = useRouter()

const activeTab = ref('profile')

const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')

// 个人信息
const form = ref({
  id: 0,
  username: '',
  bio: '',
  email: '',
  phone: '',
  gender: 0,
  avatar: '',
})

const avatarPreview = ref('')
const avatarFile = ref(null)
const showAvatarMenu = ref(false)

const genderOptions = [
  { value: 0, label: '未设置' },
  { value: 1, label: '男' },
  { value: 2, label: '女' },
]

// 账号安全
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const changingPassword = ref(false)
const securityError = ref('')
const showOldPwd = ref(false)
const showNewPwd = ref(false)
const showConfirmPwd = ref(false)

const passwordStrength = computed(() => {
  const pwd = newPassword.value
  if (!pwd) return { level: 0, label: '', color: '', width: '0%' }
  let score = 0
  if (pwd.length >= 8) score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (score <= 1) return { level: 1, label: '弱', color: '#ff4d4f', width: '25%' }
  if (score <= 2) return { level: 2, label: '一般', color: '#faad14', width: '50%' }
  if (score <= 3) return { level: 3, label: '良好', color: '#52c41a', width: '75%' }
  return { level: 4, label: '强', color: '#1890ff', width: '100%' }
})

function parseJwt(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

function switchTab(tab) {
  activeTab.value = tab
  errorMsg.value = ''
  securityError.value = ''
}

async function loadUserInfo() {
  const token = getToken()
  if (!token) {
    router.push('/login')
    return
  }

  const jwt = parseJwt(token)
  if (!jwt || !jwt.user_id) {
    errorMsg.value = '无法解析用户信息，请重新登录'
    return
  }

  loading.value = true
  try {
    const { data } = await request.get(`/user/${jwt.user_id}`)
    form.value.id = data.id
    form.value.username = data.username
    form.value.email = data.email || ''
    form.value.bio = data.bio || ''
    form.value.gender = data.gender || 0
    form.value.phone = data.phone || ''
    form.value.avatar = data.avatar || ''
    avatarPreview.value = data.avatar || ''
  } catch (err) {
    console.log(err)
    errorMsg.value = err.response?.data?.error || '加载用户信息失败'
  } finally {
    loading.value = false
  }
}

function handleAvatarClick() {
  document.getElementById('avatarInput').click()
}

async function handleAvatarChange(e) {
  const file = e.target.files[0]
  if (!file) return

  if (file.size > 2 * 1024 * 1024) {
    errorMsg.value = '头像大小不能超过 2MB'
    return
  }

  avatarFile.value = file

  const reader = new FileReader()
  reader.onload = (ev) => {
    avatarPreview.value = ev.target.result
  }
  reader.readAsDataURL(file)

  const fd = new FormData()
  fd.append('file', file)
  fd.append('type', 'avatar')

  try {
    const { data } = await request.post('/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    form.value.avatar = data.url
  } catch (err) {
    errorMsg.value = err.response?.data?.error || '头像上传失败'
  }
}

function handleRemoveAvatar() {
  avatarPreview.value = ''
  avatarFile.value = null
  form.value.avatar = ''
  showAvatarMenu.value = false
}

async function handleSave() {
  saving.value = true
  errorMsg.value = ''

  try {
    const payload = {
      username: form.value.username,
      email: form.value.email,
      bio: form.value.bio,
      gender: form.value.gender,
      phone: form.value.phone,
      avatar: form.value.avatar,
    }

    const { data } = await request.put('/user/update', payload)

    form.value.username = data.username
    form.value.email = data.email || ''
    form.value.bio = data.bio || ''
    form.value.gender = data.gender || 0
    form.value.phone = data.phone || ''
    form.value.avatar = data.avatar || ''
    avatarPreview.value = data.avatar || ''
    avatarFile.value = null

    message.success('保存成功')
  } catch (err) {
    console.log(err)
    errorMsg.value = err.response?.data?.error || '保存失败'
  } finally {
    saving.value = false
  }
}

async function handleChangePassword() {
  securityError.value = ''

  if (!oldPassword.value) {
    securityError.value = '请输入当前密码'
    return
  }
  if (!newPassword.value) {
    securityError.value = '请输入新密码'
    return
  }
  if (newPassword.value.length < 1) {
    securityError.value = '新密码长度不能少于 1 位'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    securityError.value = '两次输入的新密码不一致'
    return
  }
  if (oldPassword.value === newPassword.value) {
    securityError.value = '新密码不能与当前密码相同'
    return
  }

  changingPassword.value = true
  try {
    await request.put('/user/update/password', {
      oldpsw: oldPassword.value,
      newpsw: newPassword.value,
    })
    message.success('密码修改成功，即将跳转登录')
    oldPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    setTimeout(() => {
      localStorage.removeItem('ourvideos_token')
      router.push('/login')
    }, 1500)
  } catch (err) {
    securityError.value = err.response?.data?.error || '密码修改失败'
  } finally {
    changingPassword.value = false
  }
}

function handleBack() {
  router.push('/')
}

onMounted(() => {
  loadUserInfo()
})
</script>

<template>
  <div class="profile-page">
    <div class="bg-grid" />

    <!-- 顶部导航 -->
    <header class="top-bar">
      <div class="top-left">
        <button class="back-btn" @click="handleBack">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="back-icon">
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
      <div class="profile-container">
        <!-- 左侧导航 -->
        <aside class="side-nav">
          <div class="nav-item" :class="{ active: activeTab === 'profile' }" @click="switchTab('profile')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="nav-icon">
              <circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
            </svg>
            个人信息
          </div>
          <div class="nav-item" :class="{ active: activeTab === 'security' }" @click="switchTab('security')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="nav-icon">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            账号安全
          </div>
          <div class="nav-item" :class="{ active: activeTab === 'history' }" @click="switchTab('history')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="nav-icon">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            观看记录
          </div>
        </aside>

        <!-- 右侧面板 -->
        <div class="profile-form-panel">
          <!-- Loading -->
          <div v-if="loading" class="loading-state">
            <span class="spinner" />
            <span>加载中...</span>
          </div>

          <template v-if="!loading">
            <!-- 错误提示 -->
            <Transition name="fade">
              <div v-if="errorMsg && activeTab === 'profile'" class="error-bar">
                <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                {{ errorMsg }}
              </div>
            </Transition>

            <!-- ==================== 个人信息面板 ==================== -->
            <div v-if="activeTab === 'profile'">
              <div class="section">
                <h2 class="section-title">个人信息</h2>
                <p class="section-desc">完善你的个人资料，让更多人认识你</p>

                <!-- 头像 -->
                <div class="form-row avatar-row">
                  <label class="form-label">头像</label>
                  <div class="avatar-area" @mouseenter="showAvatarMenu = true" @mouseleave="showAvatarMenu = false">
                    <div class="avatar-img" @click="handleAvatarClick">
                      <img v-if="avatarPreview" :src="avatarPreview" alt="avatar" />
                      <svg v-else viewBox="0 0 24 24" fill="currentColor" class="avatar-placeholder">
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2c0 .7.5 1.2 1.2 1.2h16.8c.7 0 1.2-.5 1.2-1.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z"/>
                      </svg>
                    </div>
                    <Transition name="fade">
                      <div v-if="showAvatarMenu" class="avatar-overlay" @click="handleAvatarClick">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="camera-icon">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                          <circle cx="12" cy="13" r="4"/>
                        </svg>
                      </div>
                    </Transition>
                    <input id="avatarInput" type="file" accept="image/*" class="avatar-input" @change="handleAvatarChange" />
                  </div>
                  <div class="avatar-hint">
                    <p>点击更换头像</p>
                    <p class="hint-sub">支持 JPG、PNG、WebP 格式，大小不超过 2MB</p>
                    <a v-if="avatarPreview" href="#" class="remove-avatar" @click.prevent="handleRemoveAvatar">移除头像</a>
                  </div>
                </div>

                <!-- 用户名 -->
                <div class="form-row">
                  <label class="form-label" for="username">用户名</label>
                  <div class="form-field">
                    <input id="username" v-model="form.username" type="text" placeholder="请输入用户名" class="input-field" />
                  </div>
                </div>

                <!-- 简介 -->
                <div class="form-row">
                  <label class="form-label" for="bio">简介</label>
                  <div class="form-field">
                    <textarea id="bio" v-model="form.bio" placeholder="介绍一下自己..." class="input-field textarea-field" maxlength="200" rows="3"></textarea>
                    <span class="field-char-count">{{ form.bio.length }} / 200</span>
                  </div>
                </div>

                <!-- 性别 -->
                <div class="form-row">
                  <label class="form-label">性别</label>
                  <div class="gender-group">
                    <button v-for="opt in genderOptions" :key="opt.value" type="button"
                      class="gender-btn" :class="{ active: form.gender === opt.value }"
                      @click="form.gender = opt.value">{{ opt.label }}</button>
                  </div>
                </div>

                <!-- 邮箱 -->
                <div class="form-row">
                  <label class="form-label" for="email">邮箱</label>
                  <div class="form-field">
                    <input id="email" v-model="form.email" type="email" placeholder="请输入邮箱地址" class="input-field" />
                  </div>
                </div>

                <!-- 手机号 -->
                <div class="form-row">
                  <label class="form-label" for="phone">手机号码</label>
                  <div class="form-field">
                    <input id="phone" v-model="form.phone" type="tel" placeholder="请输入手机号码" class="input-field" maxlength="11" />
                  </div>
                </div>
              </div>

              <div class="form-actions">
                <button class="save-btn" :disabled="saving" @click="handleSave">
                  <span v-if="!saving">保存修改</span>
                  <span v-else class="btn-content"><span class="spinner-sm" />保存中...</span>
                </button>
                <button class="cancel-btn" @click="handleBack">取消</button>
              </div>
            </div>

            <!-- ==================== 账号安全面板 ==================== -->
            <div v-if="activeTab === 'security'" class="security-panel">
              <!-- 账号状态卡片 -->
              <div class="section">
                <h2 class="section-title">账号状态</h2>
                <p class="section-desc">查看和管理你的账号绑定信息</p>

                <div class="status-list">
                  <div class="status-row">
                    <div class="status-left">
                      <div class="status-icon-box">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                      </div>
                      <div>
                        <span class="status-label">邮箱</span>
                        <span class="status-value">{{ form.email || '未绑定' }}</span>
                      </div>
                    </div>
                    <span class="status-badge" :class="form.email ? 'verified' : 'unverified'">
                      {{ form.email ? '已绑定' : '未绑定' }}
                    </span>
                  </div>

                  <div class="status-row">
                    <div class="status-left">
                      <div class="status-icon-box">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
                        </svg>
                      </div>
                      <div>
                        <span class="status-label">手机号</span>
                        <span class="status-value">{{ form.phone || '未绑定' }}</span>
                      </div>
                    </div>
                    <span class="status-badge" :class="form.phone ? 'verified' : 'unverified'">
                      {{ form.phone ? '已绑定' : '未绑定' }}
                    </span>
                  </div>

                  <div class="status-row">
                    <div class="status-left">
                      <div class="status-icon-box">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                      </div>
                      <div>
                        <span class="status-label">上次登录</span>
                        <span class="status-value">2025-06-02 14:30 于 深圳</span>
                      </div>
                    </div>
                  </div>

                  <div class="status-row">
                    <div class="status-left">
                      <div class="status-icon-box">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
                          <line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
                        </svg>
                      </div>
                      <div>
                        <span class="status-label">注册时间</span>
                        <span class="status-value">2025-03-15</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 修改密码 -->
              <div class="section">
                <h2 class="section-title">修改密码</h2>
                <p class="section-desc">建议使用字母、数字和符号组合的高强度密码</p>

                <Transition name="fade">
                  <div v-if="securityError" class="error-bar">
                    <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="15" y1="9" x2="9" y2="15"/>
                      <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    {{ securityError }}
                  </div>
                </Transition>

                <div class="form-row">
                  <label class="form-label" for="oldPassword">当前密码</label>
                  <div class="form-field">
                    <div class="input-wrapper">
                      <input id="oldPassword" v-model="oldPassword" :type="showOldPwd ? 'text' : 'password'"
                        placeholder="请输入当前密码" autocomplete="current-password" class="input-field" />
                      <button type="button" class="toggle-pwd" @click="showOldPwd = !showOldPwd" tabindex="-1">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="eye-icon">
                          <template v-if="!showOldPwd">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                          </template>
                          <template v-else>
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                          </template>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div class="form-row">
                  <label class="form-label" for="newPassword">新密码</label>
                  <div class="form-field">
                    <div class="input-wrapper">
                      <input id="newPassword" v-model="newPassword" :type="showNewPwd ? 'text' : 'password'"
                        placeholder="请输入新密码" autocomplete="new-password" class="input-field" />
                      <button type="button" class="toggle-pwd" @click="showNewPwd = !showNewPwd" tabindex="-1">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="eye-icon">
                          <template v-if="!showNewPwd">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                          </template>
                          <template v-else>
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                          </template>
                        </svg>
                      </button>
                    </div>
                    <!-- 密码强度指示器 -->
                    <div v-if="newPassword" class="strength-bar">
                      <div class="strength-track">
                        <div class="strength-fill" :style="{ width: passwordStrength.width, background: passwordStrength.color }" />
                      </div>
                      <span class="strength-label" :style="{ color: passwordStrength.color }">{{ passwordStrength.label }}</span>
                    </div>
                  </div>
                </div>

                <div class="form-row">
                  <label class="form-label" for="confirmPassword">确认密码</label>
                  <div class="form-field">
                    <div class="input-wrapper">
                      <input id="confirmPassword" v-model="confirmPassword" :type="showConfirmPwd ? 'text' : 'password'"
                        placeholder="请再次输入新密码" autocomplete="new-password" class="input-field" />
                      <button type="button" class="toggle-pwd" @click="showConfirmPwd = !showConfirmPwd" tabindex="-1">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="eye-icon">
                          <template v-if="!showConfirmPwd">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                          </template>
                          <template v-else>
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                          </template>
                        </svg>
                      </button>
                    </div>
                    <Transition name="fade">
                      <span v-if="confirmPassword && newPassword !== confirmPassword" class="field-note mismatch">
                        两次输入的密码不一致
                      </span>
                    </Transition>
                  </div>
                </div>
              </div>

              <div class="form-actions">
                <button class="save-btn" :disabled="changingPassword" @click="handleChangePassword">
                  <span v-if="!changingPassword">修改密码</span>
                  <span v-else class="btn-content"><span class="spinner-sm" />修改中...</span>
                </button>
              </div>

              <!-- 危险操作区 -->
              <div class="danger-zone">
                <div class="danger-header">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="danger-icon">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <div>
                    <span class="danger-title">注销账号</span>
                    <span class="danger-desc">注销后所有数据将被永久删除且无法恢复</span>
                  </div>
                </div>
                <button class="danger-btn" disabled>注销账号</button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* ============ 全局容器 ============ */
.profile-page {
  min-height: 100vh;
  background: #0a0a0a;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  position: relative;
}

.bg-grid {
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
  z-index: 0;
}

/* ============ 顶部导航 ============ */
.top-bar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
  height: 64px;
  background: rgba(10, 10, 10, 0.95);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.top-left { display: flex; align-items: center; gap: 16px; }

.back-btn {
  width: 36px; height: 36px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.back-btn:hover { background: rgba(255, 255, 255, 0.12); color: #fff; }
.back-icon { width: 20px; height: 20px; }

.logo-link { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.logo-icon { width: 28px; height: 28px; color: #e50914; }
.logo-text { font-size: 20px; font-weight: 800; color: #e50914; letter-spacing: -0.5px; }

/* ============ 主体 ============ */
.main-content { position: relative; z-index: 1; padding: 88px 40px 60px; }
.profile-container { max-width: 960px; margin: 0 auto; display: flex; gap: 32px; }

/* ============ 左侧导航 ============ */
.side-nav { width: 200px; flex-shrink: 0; display: flex; flex-direction: column; gap: 4px; }

.side-nav .nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}
.side-nav .nav-item:hover { color: rgba(255, 255, 255, 0.8); background: rgba(255, 255, 255, 0.04); }
.side-nav .nav-item.active { color: #fff; background: rgba(229, 9, 20, 0.12); font-weight: 500; }
.nav-icon { width: 18px; height: 18px; flex-shrink: 0; }

/* ============ 右侧面板 ============ */
.profile-form-panel { flex: 1; min-width: 0; }

.loading-state {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  padding: 100px 0;
  color: rgba(255, 255, 255, 0.5); font-size: 14px;
}
.spinner {
  width: 24px; height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-top-color: #e50914;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ============ 错误条 ============ */
.error-bar {
  display: flex; align-items: center; gap: 10px;
  background: rgba(229, 9, 20, 0.12);
  border: 1px solid rgba(229, 9, 20, 0.3);
  color: #ff6b6b;
  padding: 14px 18px;
  border-radius: 10px;
  margin-bottom: 28px;
  font-size: 14px; line-height: 1.4;
}
.error-icon { width: 18px; height: 18px; flex-shrink: 0; color: #e50914; }

.fade-enter-active, .fade-leave-active { transition: all 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-8px); }

/* ============ 分区 ============ */
.section {
  background: rgba(20, 20, 20, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 36px;
  margin-bottom: 24px;
}
.section-title { font-size: 20px; font-weight: 700; margin: 0 0 8px; color: #fff; }
.section-desc { font-size: 13px; color: rgba(255, 255, 255, 0.4); margin: 0 0 32px; }

/* ============ 表单行 ============ */
.form-row {
  display: flex; align-items: flex-start;
  margin-bottom: 24px; padding-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.form-row:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }

.form-label {
  width: 110px; flex-shrink: 0; padding-top: 12px;
  font-size: 14px; font-weight: 500; color: rgba(255, 255, 255, 0.7);
}
.form-field { flex: 1; position: relative; }

.input-wrapper { position: relative; display: flex; align-items: center; }

.input-field {
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #fff; font-size: 15px;
  outline: none;
  transition: all 0.25s;
  font-family: inherit;
}
.input-field::placeholder { color: rgba(255, 255, 255, 0.25); }
.input-field:focus {
  background: rgba(255, 255, 255, 0.09);
  border-color: rgba(229, 9, 20, 0.5);
  box-shadow: 0 0 0 3px rgba(229, 9, 20, 0.1);
}
.textarea-field { resize: vertical; min-height: 80px; line-height: 1.6; }

.field-note { display: block; margin-top: 6px; font-size: 12px; color: rgba(255, 255, 255, 0.25); }
.field-note.mismatch { color: #ff6b6b; }

.field-char-count {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  font-size: 12px; color: rgba(255, 255, 255, 0.25); pointer-events: none;
}

.toggle-pwd {
  position: absolute; right: 12px;
  background: none; border: none; cursor: pointer; padding: 4px;
  color: rgba(255, 255, 255, 0.3); transition: color 0.2s; display: flex;
}
.toggle-pwd:hover { color: rgba(255, 255, 255, 0.6); }
.eye-icon { width: 20px; height: 20px; }

/* ============ 密码强度 ============ */
.strength-bar {
  display: flex; align-items: center; gap: 10px; margin-top: 8px;
}
.strength-track {
  flex: 1; height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
}
.strength-fill {
  height: 100%; border-radius: 2px;
  transition: width 0.3s ease, background 0.3s ease;
}
.strength-label { font-size: 12px; font-weight: 500; min-width: 28px; }

/* ============ 头像 ============ */
.avatar-row { align-items: center; }

.avatar-area { position: relative; width: 88px; height: 88px; border-radius: 50%; cursor: pointer; flex-shrink: 0; }
.avatar-img {
  width: 100%; height: 100%; border-radius: 50%; overflow: hidden;
  background: linear-gradient(135deg, #2a2a2a, #1a1a1a);
  border: 2px solid rgba(255, 255, 255, 0.1);
}
.avatar-img img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder { width: 100%; height: 100%; padding: 18px; color: rgba(255, 255, 255, 0.3); }

.avatar-overlay {
  position: absolute; inset: 0; border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  display: flex; align-items: center; justify-content: center;
}
.camera-icon { width: 24px; height: 24px; color: #fff; }
.avatar-input { display: none; }

.avatar-hint { margin-left: 20px; }
.avatar-hint p { margin: 0; font-size: 13px; color: rgba(255, 255, 255, 0.5); }
.avatar-hint .hint-sub { margin-top: 4px; font-size: 12px; color: rgba(255, 255, 255, 0.25); }
.remove-avatar {
  display: inline-block; margin-top: 6px;
  font-size: 12px; color: #ff6b6b; text-decoration: none;
}
.remove-avatar:hover { text-decoration: underline; }

/* ============ 性别选择 ============ */
.gender-group { display: flex; gap: 10px; padding-top: 2px; }
.gender-btn {
  padding: 10px 24px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.5); font-size: 14px;
  cursor: pointer; transition: all 0.25s;
}
.gender-btn:hover { background: rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.8); }
.gender-btn.active { background: rgba(229, 9, 20, 0.15); border-color: rgba(229, 9, 20, 0.4); color: #e50914; font-weight: 600; }

/* ============ 操作按钮 ============ */
.form-actions { display: flex; gap: 14px; padding-top: 8px; }

.save-btn {
  padding: 13px 36px;
  background: linear-gradient(135deg, #e50914, #b20710);
  color: #fff; border: none; border-radius: 10px;
  font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.25s;
}
.save-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 30px rgba(229, 9, 20, 0.35); }
.save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.cancel-btn {
  padding: 13px 28px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  font-size: 15px; cursor: pointer; transition: all 0.25s;
}
.cancel-btn:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }

.btn-content { display: flex; align-items: center; justify-content: center; gap: 8px; }

.spinner-sm {
  width: 16px; height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

/* ============ 账号安全: 状态列表 ============ */
.status-list { display: flex; flex-direction: column; }

.status-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.status-row:first-child { padding-top: 0; }
.status-row:last-child { padding-bottom: 0; border-bottom: none; }

.status-left { display: flex; align-items: center; gap: 16px; }

.status-icon-box {
  width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.5);
}
.status-icon-box svg { width: 20px; height: 20px; }

.status-label { display: block; font-size: 13px; color: rgba(255, 255, 255, 0.4); margin-bottom: 2px; }
.status-value { font-size: 14px; color: rgba(255, 255, 255, 0.8); }

.status-badge {
  padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 500;
}
.status-badge.verified { background: rgba(82, 196, 26, 0.12); color: #52c41a; }
.status-badge.unverified { background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.35); }

/* ============ 危险操作区 ============ */
.danger-zone {
  margin-top: 24px;
  background: rgba(229, 9, 20, 0.04);
  border: 1px solid rgba(229, 9, 20, 0.12);
  border-radius: 16px;
  padding: 24px;
  display: flex; align-items: center; justify-content: space-between;
}
.danger-header { display: flex; align-items: flex-start; gap: 14px; }
.danger-icon { width: 20px; height: 20px; color: rgba(229, 9, 20, 0.5); flex-shrink: 0; margin-top: 1px; }
.danger-title { display: block; font-size: 14px; font-weight: 600; color: rgba(255, 255, 255, 0.7); margin-bottom: 4px; }
.danger-desc { font-size: 12px; color: rgba(255, 255, 255, 0.3); }

.danger-btn {
  padding: 10px 24px;
  background: transparent;
  border: 1px solid rgba(229, 9, 20, 0.25);
  border-radius: 8px;
  color: rgba(229, 9, 20, 0.5);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}
.danger-btn:hover:not(:disabled) { background: rgba(229, 9, 20, 0.1); color: #ff6b6b; border-color: rgba(229, 9, 20, 0.4); }
.danger-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* ============ 响应式 ============ */
@media (max-width: 800px) {
  .top-bar { padding: 0 20px; }
  .main-content { padding: 80px 20px 40px; }
  .profile-container { flex-direction: column; }

  .side-nav {
    width: 100%; flex-direction: row; overflow-x: auto; padding-bottom: 8px;
  }
  .side-nav .nav-item { white-space: nowrap; font-size: 13px; padding: 10px 14px; }

  .section { padding: 24px 20px; }

  .form-row { flex-direction: column; gap: 8px; }
  .form-label { width: auto; padding-top: 0; }
  .avatar-row { flex-direction: row; align-items: center; }

  .form-actions { flex-direction: column; }
  .save-btn, .cancel-btn { width: 100%; }

  .status-row { flex-direction: column; align-items: flex-start; gap: 10px; }
  .status-badge { align-self: flex-start; }

  .danger-zone { flex-direction: column; gap: 16px; }
  .danger-btn { width: 100%; }
}
</style>
