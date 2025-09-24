<template>
  <el-dialog v-model="visible" title="扫码识别" width="525px" @close="stop">
    <div class="scanner-container">
      <div class="video-wrapper">
        <video ref="video" autoplay playsinline></video>
        <div class="scan-box"></div>
      </div>
      <canvas ref="canvas" class="hidden"></canvas>
    </div>
    <template #footer>
      <el-button @click="stop">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, onUnmounted, defineExpose } from 'vue'
import jsQR from 'jsqr'

const visible = ref(false)
const video = ref(null)
const canvas = ref(null)
const result = ref('')
let stream = null
let rafId = null
let scanning = false
let paused = false

const emit = defineEmits(['detect'])

// 打开并开始扫码
const start = async () => {
  visible.value = true
  result.value = ''
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    })
    video.value.srcObject = stream
    scanning = true
    paused = false

    video.value.onloadedmetadata = () => {
      video.value.play()
      rafId = requestAnimationFrame(scanLoop)
    }
  } catch (err) {
    console.error('摄像头访问失败:', err)
  }
}

// 暂停扫描 + 画面
const pause = () => {
  paused = true
  stream?.getTracks().forEach((track) => (track.enabled = false))
}

// 恢复扫描 + 画面
const resume = () => {
  paused = false
  stream?.getTracks().forEach((track) => (track.enabled = true))
  rafId = requestAnimationFrame(scanLoop)
}

// 停止并关闭弹窗
const stop = () => {
  scanning = false
  paused = false
  if (rafId) cancelAnimationFrame(rafId)
  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
    stream = null
  }
  visible.value = false
}

// 扫描循环
const scanLoop = () => {
  if (!scanning || paused) return
  if (video.value.videoWidth === 0 || video.value.videoHeight === 0) {
    rafId = requestAnimationFrame(scanLoop)
    return
  }
  const ctx = canvas.value.getContext('2d', { willReadFrequently: true })
  const scanSize = 200
  const sx = Math.floor(video.value.videoWidth / 2 - scanSize / 2)
  const sy = Math.floor(video.value.videoHeight / 2 - scanSize / 2)

  canvas.value.width = scanSize
  canvas.value.height = scanSize

  // 只把视频的中心 200x200 区域画到 canvas
  ctx.drawImage(
    video.value,
    sx,
    sy,
    scanSize,
    scanSize, // 来源区域
    0,
    0,
    scanSize,
    scanSize, // 目标区域
  )

  const imageData = ctx.getImageData(0, 0, scanSize, scanSize)
  const qrCode = jsQR(imageData.data, imageData.width, imageData.height)

  if (qrCode && qrCode.data !== '') {
    console.log(qrCode.data)
    emit('detect', qrCode.data)
    pause()
  } else {
    rafId = requestAnimationFrame(scanLoop)
  }
}

defineExpose({
  start,
  stop,
  pause,
  resume,
})

onUnmounted(() => {
  stop()
})
</script>

<style scoped>
.scanner-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.video-wrapper {
  overflow: hidden; /* 超出裁剪 */
  position: relative;
}

.video-wrapper video {
  display: block;
  /* 保持原始分辨率，不缩放 */
  object-fit: none;
  width: 100%;
  height: 100%;
  min-width: 100%;
  min-height: 100%;
  position: relative;
}

.scan-box {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 200px;
  height: 200px;
  transform: translate(-50%, -50%);
  border: 2px solid white;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5); /* 四周半透明遮罩 */
  pointer-events: none;
}

.hidden {
  display: none;
}
</style>
