<template>
  <div class="image-viewer-box">
    <div class="left-panel">
      <div class="store-info" @click="handleBack">
        <h2>
          <el-icon> <Back /> </el-icon><span>{{ storeImgInfo.storeName }}</span>
        </h2>
      </div>

      <el-tabs v-model="activeCategory" class="image-tabs">
        <el-tab-pane :label="t2('All')" name="all">
          <div class="image-list">
            <div v-for="(img, index) in allImages" :key="index" class="image-item" :class="{ active: activeImageIndex === index }" @click="selectImage(index)">
              <img :src="img" alt="" />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane :label="t('Image1')" name="store" v-if="storeImgInfo.own === 1">
          <div class="image-list">
            <div
              v-for="(img, index) in storeImgInfo.storeImgList"
              :key="index"
              class="image-item"
              :class="{
                active: activeImageIndex === allImages.findIndex((i) => i === img),
              }"
              @click="selectImage(allImages.findIndex((i) => i === img))"
            >
              <img :src="img" alt="" />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane :label="t('Image2')" name="posm" v-if="storeImgInfo.own === 1">
          <div class="image-list">
            <div
              v-for="(img, index) in storeImgInfo.posmImgList"
              :key="index"
              class="image-item"
              :class="{
                active: activeImageIndex === allImages.findIndex((i) => i === img),
              }"
              @click="selectImage(allImages.findIndex((i) => i === img))"
            >
              <img :src="img" alt="" />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <div class="right-panel">
      <el-carousel ref="carousel" :autoplay="false" indicator-position="none" arrow="never" height="calc(100vh - 60px)">
        <el-carousel-item v-for="(img, index) in allImages" :key="index">
          <div class="carousel-image-container">
            <img :src="img" alt="" class="carousel-image" />
          </div>
        </el-carousel-item>
      </el-carousel>

      <div class="carousel-controls" v-if="allImages.length > 1">
        <div class="left" @click="prevImage" :disabled="activeImageIndex === 0">
          <el-icon color="#fff">
            <ArrowLeft />
          </el-icon>
        </div>
        <div class="right" @click="nextImage" :disabled="activeImageIndex === allImages.length - 1">
          <el-icon color="#fff">
            <ArrowRight />
          </el-icon>
        </div>
      </div>

      <div class="close" @click="handleClose">
        <el-icon color="#fff">
          <CloseBold></CloseBold>
        </el-icon>
      </div>
      <div class="download" @click="showImage()" v-if="allImages.length > 0">
        <el-icon> <Download></Download> </el-icon>{{ t2('download') }}
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { ref, computed, watch, PropType } from 'vue'
  import { ArrowLeft, ArrowRight, Back, Download, CloseBold } from '@element-plus/icons-vue'
  import { MapStoreImg } from './type'
  const emit = defineEmits(['closeImage']) //声明 emits
  
  const t2 = (str:string) => str
  const t = t2
  const props = defineProps({
    storeImgInfo: {
      type: Object as PropType<MapStoreImg>,
      required: true,
    },
  })

  const activeCategory = ref('all')
  const activeImageIndex = ref(0)
  const carousel = ref(null)

  // 计算属性

  const allImages = computed(() => {
    let all = []
    if (activeCategory.value === 'all') {
      all = []
        .concat(...props.storeImgInfo.googleImgList)
        .concat(...props.storeImgInfo.storeImgList)
        .concat(...props.storeImgInfo.posmImgList)
    } else if (activeCategory.value === 'store') {
      all = props.storeImgInfo.storeImgList
    } else if (activeCategory.value === 'posm') {
      all = props.storeImgInfo.posmImgList
    }
    // if (props.storeImgInfo && props.storeImgInfo.googleImgList && props.storeImgInfo.storeImgList && props.storeImgInfo.posmImgList) {
    //   all = []
    //     .concat(...props.storeImgInfo.googleImgList)
    //     .concat(...props.storeImgInfo.storeImgList)
    //     .concat(...props.storeImgInfo.posmImgList)
    // }
    all = all.filter((item) => item != '' && item != null && item != undefined)
    return all
  })

  // 方法
  const selectImage = (index) => {
    activeImageIndex.value = index
    if (carousel.value) {
      carousel.value.setActiveItem(index)
    }
  }

  const prevImage = () => {
    if (activeImageIndex.value > 0) {
      activeImageIndex.value--
      carousel.value.prev()
    }
  }

  const nextImage = () => {
    if (activeImageIndex.value < allImages.value.length - 1) {
      activeImageIndex.value++
      carousel.value.next()
    }
  }

  // 监听轮播图变化
  watch(activeImageIndex, (newVal) => {
    if (carousel.value) {
      carousel.value.setActiveItem(newVal)
    }
  })

  // 显示图片的方法
  const showImage = () => {
    if (allImages.value.length > 0 && allImages.value[activeImageIndex.value]) {
      downloadImage(allImages.value[activeImageIndex.value], 'store.jpg')
    }
  }
  async function downloadImage(url, filename) {
    try {
      const img = new Image()
      img.crossOrigin = 'Anonymous' // 尝试跨域请求
      img.src = url

      img.onload = async () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)

        try {
          // 尝试导出为 Blob（如果图片未设置 CORS，这里会抛出安全错误）
          canvas.toBlob(async (blob) => {
            if (!blob) throw new Error('Canvas is tainted')

            const blobUrl = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = blobUrl
            a.download = filename || 'image.jpg'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(blobUrl)
          }, 'image/jpeg')
        } catch (error) {
          console.error('Canvas is tainted due to CORS:', error)
        }
      }

      img.onerror = () => {
        console.error('Failed to load image')
      }
    } catch (error) {
      console.error('Download failed:', error)
    }
  }
  const handleClose = () => {
    activeCategory.value = 'all'
    activeImageIndex.value = 0
    emit('closeImage')
  }
  const handleBack = () => {
    activeCategory.value = 'all'
    activeImageIndex.value = 0
    emit('closeImage')
  }
</script>

<style lang="scss" scoped>
  .image-viewer-box {
    display: flex;
    height: calc(100vh - 70px);
    background-color: #f5f5f5;
  }

  .left-panel {
    width: 300px;
    background-color: white;
    border-right: 1px solid #e6e6e6;
    overflow-y: auto;
  }

  .right-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    background-color: white;
    position: relative;

    .close {
      position: absolute;
      top: 30px;
      right: 16px;
      width: 30px;
      height: 30px;
      border-radius: 15px;
      background: #00000060;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
    }

    .download {
      position: absolute;
      top: 30px;
      right: 60px;
      min-height: 30px;
      padding: 4px 18px;
      border-radius: 20px;
      color: #fff;
      background: #00000060;
      display: flex;
      align-items: center;
      cursor: pointer;

      i {
        margin-right: 4px;
      }
    }
  }

  .store-info {
    padding: 15px 10px;
  }

  .store-info h2 {
    margin: 0;
    font-size: 18px;
    display: flex;
    align-items: center;

    i {
      cursor: pointer;
      margin-right: 10px;
    }
    span {
      cursor: default;
    }
  }

  .store-address {
    margin: 5px 0 0;
    color: #666;
  }

  .image-list {
    height: calc(100vh - 170px);
    overflow-y: auto;
  }

  .image-item {
    height: 200px;
    cursor: pointer;
    transition: all 0.3s;
  }

  .image-item:hover {
    border-color: #409eff;
  }

  .image-item.active {
    border-color: #409eff;
    box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.3);
  }

  .image-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .image-name {
    padding: 5px;
    font-size: 12px;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .carousel-image-container {
    display: flex;
    height: 100%;
  }

  .carousel-image {
    flex: 1;
    width: 100%;
    object-fit: cover;
    background-color: #f9f9f9;
  }

  .carousel-controls {
    position: absolute;
    bottom: 15px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 50px;

    .left {
      width: 30px;
      height: 30px;
      border-radius: 15px;
      background: #00000060;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
    }

    .right {
      width: 30px;
      height: 30px;
      border-radius: 15px;
      background: #00000060;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
    }
  }

  .image-counter {
    font-size: 14px;
    color: #666;
  }

  :deep(.el-tabs__header) {
    padding: 0 15px;
    margin: 0 0 1px;
  }
</style>
