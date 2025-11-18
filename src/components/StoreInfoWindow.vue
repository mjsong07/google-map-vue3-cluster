<template>
  <div class="store-info">
    <!-- 图片Banner -->
    <div class="image-banner">
      <img class="bg" :src="store.mainImgUrl ? store.mainImgUrl : '/dashboard/empty.jpg'" alt="" />
      <!-- <img class="close" src="/dashboard/close.png" alt="Close" @click="handleClose" /> -->

      <div class="close" @click="handleClose">
        <el-icon color="#fff">
          <CloseBold></CloseBold>
        </el-icon>
      </div>

      <div class="detail" @click="showImage()" v-if="store.mainImgUrl">
        <el-icon>
          <Picture></Picture>
        </el-icon>
        {{ t2('View image') }}
      </div>
    </div>
    <div class="name">
      <img :src="store.own === 1 ? '/dashboard/flag1.png' : '/dashboard/flag2.png'" alt="" /><span>{{ store.storeName }}</span>
    </div>
    <!-- 销量和HG占比 -->
    <div class="metrics" v-if="store.own === 1">
      <el-tag type="danger">{{ t('Sales') }} : {{ formatStrShow(store.monthSales) }}</el-tag>
    </div>

    <!-- 地址 -->
    <p class="address">
      <img src="/dashboard/local3.png" alt="" /><span>{{ formatStrShow(store.address) }}</span>
    </p>
    <!-- 其他信息 -->
    <ul class="store-info-list" v-if="store.own === 1">
 
      <li> {{ t('XXXXX') }} : {{ formatStrShow(store.storeType) }} </li>
      <li> {{ t2('YYYYYY') }} : {{ formatStrShow(store.storeCategory) }} </li>
    </ul>
    <ul class="store-info-list" v-else>
      <li> {{ t('XXXXX') }} : {{ formatStrShow(store.storeType) }} </li>
      <li> {{ t2('YYYYYY') }} : {{ formatStrShow(store.storeCategory) }} </li>
    
    </ul>
  </div>
</template>

<script lang="ts" setup>
  import { defineProps, PropType } from 'vue'
  import { Picture } from '@element-plus/icons-vue'
  import { MapStore } from './type'  
  import { CloseBold } from '@element-plus/icons-vue'
  function formatStrShow(val: any) {
  if (val === 0) return 0
  return val ? val : '/'
}
  const t2 = (str:string) => str
  const t = t2

  const emit = defineEmits(['showImage', 'closeInfo']) //声明 emits
  const props = defineProps({
    store: {
      type: Object as PropType<MapStore>,
      required: true,
    },
    infoWindow: {
      type: Object,
      required: true,
    },
  })

  // 显示图片的方法
  const showImage = () => {
    emit('showImage', props.store)
  }
  const handleClose = () => {
    emit('closeInfo', props.infoWindow)
  }
</script>

<style lang="scss" scoped>
  .store-info {
    min-width: 250px;
    max-width: 390px;
    position: relative;
  }

  .image-banner {
    margin-bottom: 10px;
    position: relative;

    .bg {
      width: 100%;
      height: 150px;
      max-height: 150px;
      min-width: 280px;
      border-radius: 4px;
      object-fit: cover;
    }

    // .close {
    //   position: absolute;
    //   top: 16px;
    //   right: 16px;
    //   width: 30px;
    //   cursor: pointer;
    // }
    .close {
      position: absolute;
      top: 16px;
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

    .detail {
      position: absolute;
      left: 17px;
      padding: 4px 8px;
      bottom: 14px;
      border-radius: 4px;
      color: #fff;
      background: #00000099;
      display: flex;
      align-items: center;
      cursor: pointer;
      i {
        margin-right: 4px;
      }
    }
  }

  .name {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    margin-top: 14px;

    img {
      width: 17px;
      margin-right: 7px;
    }
  }

  .metrics {
    display: flex;
    gap: 10px;
    margin-top: 14px;
  }

  .address {
    color: #666;
    display: flex;
    flex-direction: row;
    margin-top: 14px;
    padding-bottom: 10px;
    justify-content: flex-start;
    align-items: center;
    line-height: 24px;

    img {
      width: 12px;
      height: fit-content;
      margin-right: 10px;
    }

    border-bottom: #e8e8e8 1px solid;
  }

  .store-info-list {
    list-style-type: none;
    padding-left: 0;
    margin-top: 15px;
    line-height: 24px;

    li {
      margin-bottom: 8px;
      position: relative;
      padding-left: 24px;
      a {
        width: 100%;
        white-space: nowrap;
        /* 溢出内容隐藏 */
        overflow: hidden;
        /* 溢出部分显示省略号 */
        text-overflow: ellipsis;
        /* 行内元素需要转为块级或行内块级才能设置宽度 */
        display: inline-block;
        /* 可选：添加下划线保持链接样式 */
        text-decoration: underline;
      }
    }

    li::before {
      content: '';
      display: inline-block;
      width: 11px;
      /* 圆形大小 */
      height: 11px;
      background-color: #5a74ff;
      /* 红色 */
      border-radius: 50%;
      /* 圆形 */
      position: absolute;
      left: 0;
      /* 调整位置 */
      top: 5px;
      /* 垂直居中 */
    }
  }
</style>
