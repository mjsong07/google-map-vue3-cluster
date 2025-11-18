<template>
  <div class="main-container">
    <div class="map-app-container" v-loading="loading">
      <!-- 左侧导航列表 -->
      <div :class="['store-list-container', menuShow ? '' : 'hide']">
        <div class="search-box">
          <el-autocomplete
            v-model="queryForm.quickSearch"
            :fetch-suggestions="querySearchAsync"
            :placeholder="t2('Search for store name or address')"
            @select="handleSelect"
            ref="autocompleteRef"
            popper-class="my-autocomplete"
            @blur="onQuickSearchBlur"
          >
            <template #prefix>
              <el-icon>
                <search />
              </el-icon>
            </template>
            <template #default="{ item }">
              <img data-v-5a5d23cb="" src="/dashboard/local4.png" alt="" />
              <span>{{ item.value }}</span>
            </template>
          </el-autocomplete>
        </div>
        <el-scrollbar class="store-list" ref="scrollbarRef" @scroll="onScroll" v-loading="leftLoading">
          <el-empty v-if="storeList.length === 0" :description="t2('No matching stores found')" :image-size="100" />

          <div v-for="store in storeList" :key="store.id" shadow="hover" class="store-item" :class="{ active: storeIsSelected(store) }" @click="focusOnStore(store)">
            <div class="store-info">
              <div class="name">
                <div class="icon">
                  <img :src="store.own === 1 ? '/dashboard/flag1.png' : '/dashboard/flag2.png'" alt="" />
                </div>
                {{ store.storeName }}
              </div>
              <div class="address">
                <div class="icon"> <img src="/dashboard/local4.png" alt="" /></div>
                <div class="content">
                  <p>{{ store.address }}</p>
                  <div class="types" v-if="store.own === 1">
                    <el-tag v-if="store.storeLevelName" type="warning"> {{ store.storeLevelName }} </el-tag>
                    <el-tag v-if="store.storeType" type="success">{{ store.storeType }}</el-tag>
                    <el-tag v-if="store.supervisionName" type="primary">{{ store.supervisionName }}</el-tag>
                  </div>
                  <div class="types" v-else>
                    <el-tag v-if="store.storeCategory" type="success">{{ store.storeCategory }}</el-tag>
                    <el-tag v-if="store.city" type="primary"> {{ store.city }} </el-tag>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="moreLoading" class="loading">{{ t('utils.Loading') }}</div>
          <div v-if="isNoMore" class="loading">{{ t2('Not More Content') }}</div>
        </el-scrollbar>
      </div>

      <div :class="['store-arrow-box', menuShow ? 'left' : 'right']" @click="menuToggle">
        <div class="triangle"></div>
      </div>

      <!-- 右侧地图 -->
      <div class="map-container">
        <el-row :gutter="20" class="filter-bar custom-select"> 
          <el-col :span="4">
            <el-form-item label="">
              <el-select v-model="queryForm.countryCode" :placeholder="t('Country')" clearable @change="countryChange">
                <el-option v-for="coutry in countries" :key="coutry.id" :label="coutry.name" :value="coutry.id" />
              </el-select>
            </el-form-item>
          </el-col>
 
        </el-row>
        <div ref="mapContainer" class="map"></div>
      </div>
    </div>
    <div class="image-viewer-container" v-show="isShowImageViewer">
      <ImageViewer :storeImgInfo="storeImgInfo" @closeImage="closeImage"></ImageViewer>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { ref, reactive, onMounted, computed, watch, createApp, watchEffect, nextTick } from 'vue'
  import { Loader } from '@googlemaps/js-api-loader'
  import { MarkerClusterer } from '@googlemaps/markerclusterer'
  import { Search } from '@element-plus/icons-vue'
  import StoreInfoWindow from './StoreInfoWindow.vue'
  import ImageViewer from './ImageViewer.vue'
  import ElementPlus from 'element-plus'
  import { debounce } from 'lodash-es'
  import { MapQueryForm, MapStore, MapLatLng, MapStoreImg, BaseLatLng, MapBound, MapInit } from './type'
  import type { ElAutocomplete, ElScrollbar } from 'element-plus'
  import { useCountryProvCityStreetSelect } from '/@/utils/hooks/useCountryProvCityStreetSelect' 
  import { getLatLngStatistics, getLatLngList, getStoreList, getStoreCount, getStoreInfo, getStoreImg, getDropdown } from './api2'
  import { t, initT2 } from '/@/utils/i18n'
  const t2  = (str:string) => str
 const t  = t2

  const props = defineProps({
    apiKey: {
      type: String,
      required: true,
    },
  })
  const menuShow = ref(true)
  const page = ref(1)

  const scrollbarRef = ref<InstanceType<typeof ElScrollbar>>()
  const autocompleteRef = ref<InstanceType<typeof ElAutocomplete>>()
  const storeList = ref<MapStore[]>([])
  const loading = ref(false)
  const moreLoading = ref(false)
  const leftLoading = ref(false)
  const rightMapLoading = ref(false)
  const isShowImageViewer = ref(false)
  const isNoMore = ref(false)
  const isFristLoad = ref(true)
  const owns = ref<any>([])
  const countries = ref<any>([])
  const cities = ref<any>([])
  const storeLevels = ref<any>([])
  const channelTypes = ref<any>([])
  const supervisions = ref<any>([])

  // 阀只变量
  const detailZoom = 16 // 显示具体详细时候的zoom
  const markerClusterMaxZoom = detailZoom - 1 // 显示具体详细时候的zoom
  const countryInitZoom = 5 // 国家跳转 5 开始
  const countryAmericInitZoom = 3 // 美国跳转 3
  const provinceZoom = 8 // 省/州 临界点
  const cityZoom = 12 // 城市
  const mapInitZoom = countryInitZoom // 地图第一次显示尺寸
  const mapMinZoom = 3 // 最小缩放级别
  const mapMaxZoom = detailZoom // 最大缩放级别
  const googleMaxCnt = 3000 // 谷歌最大显示数量 5000
  const getCountryZoom = () => {
    const nowContinentList = getCurrentContinent(map)
    if (nowContinentList!.length == 1 && nowContinentList!.includes('Americas')) {
      return countryAmericInitZoom
    } else {
      return countryInitZoom
    }
  }

  const getProvinceZoom = () => {
    const nowContinentList = getCurrentContinent(map)
    if (nowContinentList!.length == 1 && nowContinentList!.includes('Americas')) {
      return provinceZoom // - 1 减越多就越早开始逻辑 记得跟城市同步改
    } else {
      return provinceZoom
    }
  }

  const getCityZoom = () => {
    const nowContinentList = getCurrentContinent(map)
    if (nowContinentList!.length == 1 && nowContinentList!.includes('Americas')) {
      return cityZoom // - 1 减越多就越早开始逻辑
    } else {
      return cityZoom
    }
  }
 
  let countrySummyList: any[] = []
  // 地图相关变量
  const mapContainer = ref(null)
  let map: google.maps.Map
  let markers: google.maps.marker.AdvancedMarkerElement[] = []
  const selectedMarker = ref<google.maps.marker.AdvancedMarkerElement | null>(null)
  let markerClusters: {
    red: MarkerClusterer | null | []
    green: MarkerClusterer | null | []
  } = {
    red: null,
    green: null,
  }
  let infoWindow: google.maps.InfoWindow
  let markersRed: google.maps.marker.AdvancedMarkerElement[] = []
  let markersGreen: google.maps.marker.AdvancedMarkerElement[] = []
 
  const algorithmOptions = {
    gridSize: 50, // 聚合半径 50
    maxZoom: markerClusterMaxZoom, // 缩放至 15 级 之后时展开
  }

  const storeImgInfo = ref<MapStoreImg>({
    storeImgList: [],
    googleImgList: [],
    posmImgList: [],
    storeName: '',
    own: 0,
  })

  const queryForm = reactive<MapQueryForm>({
    ownList: [],
    countryCode: '',
    cityNames: [],
    supervisionNames: [],
    storeLevelNames: [],
    channelTypeNames: [],
    quickSearch: '',
  })
  // 国家跳转 经纬度字典
  const countryLatLngMap: any = {
    GB: {
      ori: {
        lat: 51.500974,
        lng: -0.156653,
      },
      own: {
        lat: 52.284048,
        lng: -1.854785,
      },
      no_own: {
        lat: 54.33167,
        lng: -1.569141,
      },
      zoom: countryInitZoom,
    },
    US: {
      ori: {
        lat: 40.7396451623328,
        lng: -102.55468301929768,
      },
      own: {
        lat: 39.831881,
        lng: -97.533593,
      },
      no_own: {
        lat: 39.153634,
        lng: -107.553124,
      },
      zoom: countryAmericInitZoom,
    },
    DE: {
      ori: {
        lat: 51.165691,
        lng: 10.451526,
      },
      own: {
        lat: 49.531369,
        lng: 10.137536,
      },
      no_own: {
        lat: 52.273966,
        lng: 9.346521,
      },
      zoom: countryInitZoom,
    },
  }


  // ************************** 地图处理 ******************************
  // 初始化地图
  const initMap = async () => {
    try {
      const loader = new Loader({
        apiKey: props.apiKey,
        version: 'weekly',
        libraries: ['places'],
      })
      await loader.load()
      const { Map } = await google.maps.importLibrary('maps')
      const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary('marker')

      // 默认英国
      let initLat = countryLatLngMap.GB.ori.lat
      let initLng = countryLatLngMap.GB.ori.lng
      let initZoom = mapInitZoom
      const initCoordinates: MapInit = getInitCoordinates()
      if (initCoordinates) {
        initLat = initCoordinates.ori.lat
        initLng = initCoordinates.ori.lng
        initZoom = initCoordinates.zoom
      }
      // 创建地图实例 - 初始视角设置为英国
      map = new Map(mapContainer.value, {
        center: { lat: initLat, lng: initLng }, //lat: 40.7396451623328, lng: -102.55468301929768 美国
        zoom: initZoom,
        mapId: 'DEMO_MAP_ID',
        minZoom: mapMinZoom, // 最小缩放级别
        maxZoom: mapMaxZoom, // 最大缩放级别
        mapTypeId: 'roadmap',
        fullscreenControl: true,
        // styles: [
        //   {
        //     featureType: 'water',
        //     elementType: 'geometry',
        //     stylers: [{ color: '#d1e1f0' }],
        //   },
        //   {
        //     featureType: 'landscape',
        //     elementType: 'geometry',
        //     stylers: [{ color: '#f5f5f5' }],
        //   },
        // ],
        mapTypeControl: false,
        gestureHandling: 'greedy',
        streetViewControl: false,
      })
      // 添加地图拖动和缩放事件监听器
      map.addListener('idle', async () => {
        if (isFristLoad.value) {
          isFristLoad.value = false
          resetData()
          return
        }
      })

      // // 初始化信息窗口
      infoWindow = new google.maps.InfoWindow({
        headerDisabled: true,
      })

      // 监听地图边界变化
      map.addListener('bounds_changed', () => {})
      // 地图点击时关闭信息窗口
      map.addListener('click', (event: any) => {
        // const latLng = event.latLng;
        // console.log("latLng:",`${latLng.lat().toFixed(6)}, ${latLng.lng().toFixed(6)}`)
        resetSelectMarker()
        infoWindow.close()
      })
      map.addListener('dragstart', () => {
        infoWindow.close()
        resetSelectMarker()
      })
      map.addListener('dragend', () => {
        resetData()
      })

      map.addListener('zoom_changed', () => {
        infoWindow.close()
        // const a = splitBoundsInto3x3(map.getBounds())
        if (map.getZoom() === detailZoom) {
          // 如果是最详情的比例不显示
        } else {
          resetData()
        }
      })
    } catch (error) {
      console.error('Error loading Google Maps:', error)
    }
  }

  const createMarkerDivContent = (gno: string, own: number, type: 'base' | 'show') => {
    let url = ''
    let width = 22
    const mapOwn: any = {
      1: () => {
        url = '/dashboard/local1.png'
      },
      0: () => {
        url = '/dashboard/local2.png'
      },
    }
    mapOwn[own] && mapOwn[own]()
    const mapType: any = {
      base: () => {
        width = 22
      },
      show: () => {
        width = 40
      },
    }

    mapType[type] && mapType[type]()

    const customContent = document.createElement('div')
    customContent.innerHTML = `
        <img class="marker-hg-img" style="width:${width}px" data-gno="${gno}" data-own="${own}"  data-type="${type}" src="${url}" alt="Marker Icon" >
    `
    return customContent
  }
  const initMarkers = (list: MapLatLng[], existMarker: any | null = null) => {
    const tempStoreId = getStoreIdByMarker(existMarker)
    markers = list.map((store) => {
      if (store.gno === tempStoreId) {
        return existMarker
      }
      return createNewMarker(store.gno, store)
    })
  }

  //初始化聚合器
  const initClusters = (list: MapLatLng[]) => {
    markersRed = []
    markersGreen = []
    // // 创建红色门店聚类器
    markerClusters.red = new MarkerClusterer({
      map,
      markers: markersRed,
      algorithmOptions: algorithmOptions,
      renderer: {
        render: ({ count, position }) => {
          return new google.maps.marker.AdvancedMarkerElement({
            position,
            content: createClusterIcon(count, 'red'),
          })
        },
      },
    })

    // 创建绿色门店聚类器
    markerClusters.green = new MarkerClusterer({
      map,
      markers: markersGreen,
      algorithmOptions: algorithmOptions,
      renderer: {
        render: ({ count, position }) => {
          return new google.maps.marker.AdvancedMarkerElement({
            position,
            content: createClusterIcon(count, 'green'),
          })
        },
      },
    })
  }

  const cleanAllMarkers = (saveMarker: any = null) => {
    markersRed = []
    markersGreen = []
    if (saveMarker) {
      markers.forEach((marker) => {
        if (saveMarker != marker) {
          marker.map = null
        }
      })
      markers = [saveMarker]
    } else {
      markers.forEach((marker) => {
        marker.map = null
      })
      markers = []
      if (selectedMarker.value) {
        selectedMarker.value.map = null
      }
      selectedMarker.value = null
    }

    markerClusters.red && markerClusters.red.clearMarkers()
    markerClusters.green && markerClusters.green.clearMarkers()
    markerClusters.red = null
    markerClusters.green = null

    countrySummyList &&
      countrySummyList.forEach((marker) => {
        marker.map = null
      })
    countrySummyList = []
  }

  const getDateSetByMarker = (marker: google.maps.marker.AdvancedMarkerElement) => {
    if (marker && marker.content && marker.content.querySelector('img') && marker.content.querySelector('img')!.dataset) {
      return marker.content.querySelector('img').dataset
    }
    return null
  }

  const getStoreIdByMarker = (marker: google.maps.marker.AdvancedMarkerElement) => {
    const dataSet = getDateSetByMarker(marker)
    return dataSet ? dataSet.gno : null
  }

  const resetSelectMarker = () => {
    if (selectedMarker.value) {
      // 恢复之前选中标记的样式
      changeMarkerState(selectedMarker.value, 'base')
    }
  }

  const createNewMarker = (gno: string, store: MapLatLng) => {
    const markerDiv = createMarkerDivContent(gno, store.own, 'base')
    const marker = new google.maps.marker.AdvancedMarkerElement({
      position: { lat: store.lat, lng: store.lng },
      map: map,
      // title: `${store.own}`,
      content: markerDiv,
    })
    if (store.own) {
      markersGreen.push(marker)
    } else {
      markersRed.push(marker)
    }
    // 添加点击事件
    marker.addListener('click', async () => {
      // if (!rightMapLoading.value) {
      //   // 标记点击
      markerClickByMarker(marker, store)
      // }
    })
    return marker
  }

  const findMarkerByStoreId = (storeId: string) => {
    const marker = markers.find((marker) => {
      const gno = getStoreIdByMarker(marker)
      return gno === storeId
    })
    return marker
  }

  const changeMarkerState = (marker: google.maps.marker.AdvancedMarkerElement, type: 'base' | 'show') => {
    const dataSet = getDateSetByMarker(marker)
    marker.content = createMarkerDivContent(dataSet.gno, dataSet.own, type)
  }

  const markerClickByMarker = async (marker: google.maps.marker.AdvancedMarkerElement, store: MapLatLng) => {
    resetSelectMarker()
    const dataSet = getDateSetByMarker(marker)
    changeMarkerState(marker, 'show')
    selectedMarker.value = marker
    try {
      // 调用接口查询详情数据
      const res: any = await getStoreInfo(dataSet.gno)
      if (res.data && res.data.row) {
        // 详情页面显示
        const storeDetail = res.data.row
        const content = document.createElement('div')
        infoWindow.setContent(content)
        infoWindow.open(map, marker)
        const app = createApp(StoreInfoWindow, { store: storeDetail, infoWindow, onShowImage: showImage, onCloseInfo: closeInfo })
        app.use(ElementPlus)
        app.mount(content)
      }
    } catch (error) {
      // loading.value = false
      console.error('Error fetching store info:', error)
    }
  }

  const getBoundObj: any = (bounds: google.maps.LatLngBounds) => {
    const boundObj = {
      southWest: {
        lat: bounds.getSouthWest().lat(),
        lng: bounds.getSouthWest().lng(),
      },
      northEast: {
        lat: bounds.getNorthEast().lat(),
        lng: bounds.getNorthEast().lng(),
      },
    }
    return boundObj
  }

  function getZoomLevelType(zoom: number) {
    // 定义经验范围（可根据实际情况调整）
    if (zoom! <= getCountryZoom()) {
      return 'country'
    } else if (zoom! > getCountryZoom() && zoom! <= getProvinceZoom()) {
      return 'province'
    } else {
      return 'city'
    }
  }

  const createCountrySummy = (countryList: any[], level: string) => {
    cleanAllMarkers()
    const zoom = map.getZoom() // 获取当前缩放级别
    let size = 40 //默认40
    if (level === 'country') {
      size = calculateClusterSize(zoom!) // 动态计算尺寸
    }
    countryList.forEach((obj) => {
      let initLat = obj.lat
      let initLng = obj.lng
      let title = obj.name
      if (obj.level === 'country' && obj.name && countryLatLngMap[obj.name]) {
        let initLatLng = null
        if (obj.own === 1) {
          initLatLng = countryLatLngMap[obj.name].own
        } else {
          initLatLng = countryLatLngMap[obj.name].no_own
        }
        if (initLatLng) {
          initLat = initLatLng.lat
          initLng = initLatLng.lng
        }
      }
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: initLat, lng: initLng },
        map: map,
        title: title,
        content: createClusterIcon(obj.total, obj.own === 1 ? 'green' : 'red', size),
      })
      marker.addListener('click', async () => {
        if (zoom! + 2 <= detailZoom) {
          map.setZoom(zoom! + 1)
          map.panTo(new google.maps.LatLng(marker.position.lat, marker.position.lng))
        }
      })
      countrySummyList.push(marker)
    })
  }
  const calculateClusterSize = (zoom: number): number => {
    // 缩放级别越大，图标越小（根据实际需求调整公式） 最小 40 最大 70
    return Math.max(40, 90 - (1 / (zoom - 2)) * 70) // 最小10px，每级减少2px 6 5 4 3 2 1
  }
  const createClusterIcon = (count: number, type: string, size: number = 40) => {
    const color = type === 'green' ? '#00BD24' : '#E0312C'
    const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <g opacity="0.280000">
        <circle id="椭圆 201" cx="20" cy="20" r="20" fill="${color}" />
      </g>
      <g opacity="0.520000">
        <circle id="椭圆 202" cx="20" cy="20" r="17" fill="${color}"  />
      </g>
      <circle id="椭圆 203" cx="20" cy="20" r="14" fill="${color}" />
      <text x="20" y="25" font-size="10" fill="#fff" text-anchor="middle" dominant-baseline="top">
        ${count}
      </text>
    </svg>
  `
    const parser = new DOMParser()
    return parser.parseFromString(svg, 'image/svg+xml').documentElement
  }
  const getNowMapBounds = () => {
    if (map && map.getBounds()) {
      return getBoundObj(map.getBounds())
    }
    return null
  }

  const getInitCoordinates = (): MapInit => {
    let countryCode = 'GB' 
    return countryLatLngMap[countryCode]
  }

  function getCurrentContinent(map: google.maps.Map): string[] | null {
    const bounds = map.getBounds()
    if (!bounds) return null

    const ne = bounds.getNorthEast()
    const sw = bounds.getSouthWest()

    const continents = [
      {
        name: 'Europe',
        bounds: {
          north: 72.0,
          south: 34.0,
          west: -25.0,
          east: 45.0,
        },
      },
      {
        name: 'Americas',
        bounds: {
          north: 83.0,
          south: -56.0,
          west: -170.0,
          east: -30.0,
        },
      },
      // 你可以继续添加其他大洲，比如 Asia, Africa 等
    ]

    return continents
      .filter((c) => {
        const b = c.bounds
        return ne.lat() >= b.south && sw.lat() <= b.north && ne.lng() >= b.west && sw.lng() <= b.east
      })
      .map((c) => c.name)
  }
  function splitBoundsInto3x3(bounds: any) {
    const sw = bounds.getSouthWest()
    const ne = bounds.getNorthEast()

    // 计算纬度和经度的差值
    const latDiff = ne.lat() - sw.lat()
    const lngDiff = ne.lng() - sw.lng()

    // 处理跨度为0的情况，避免除以0
    const stepLat = latDiff === 0 ? 0 : latDiff / 3
    const stepLng = lngDiff === 0 ? 0 : lngDiff / 3

    // 生成纬度分界点（包含原始SW和NE）
    const latPoints = [sw.lat(), sw.lat() + stepLat, sw.lat() + 2 * stepLat, ne.lat()]

    // 生成经度分界点（包含原始SW和NE）
    const lngPoints = [sw.lng(), sw.lng() + stepLng, sw.lng() + 2 * stepLng, ne.lng()]

    const result = []
    // 遍历生成3x3的网格
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const southWest = new google.maps.LatLng(latPoints[i], lngPoints[j])
        const northEast = new google.maps.LatLng(latPoints[i + 1], lngPoints[j + 1])
        result.push(new google.maps.LatLngBounds(southWest, northEast))
      }
    }

    return result
  }

  // ************************** 数据处理 ******************************
  const resetData = debounce(async () => {
    if (!map || !map.getBounds()) {
      return
    }
    const zoom = map.getZoom()!
    if (zoom <= 1) {
      storeList.value = []
      cleanAllMarkers()
      return
    }

    let isLoadGoogleClusters = false
    if (zoom >= getCityZoom()) {
      // 城市维度的时候，
      //先获取当前总数，如果总数大于100000，就不显示聚合
      const resCnt = await getStoreCount(queryForm, getNowMapBounds())
      if (resCnt && resCnt.data && resCnt.data.storeCount <= googleMaxCnt) {
        isLoadGoogleClusters = true
      }
    }
    const level = getZoomLevelType(zoom!)
    console.log('level', level)
    let requestBound = getNowMapBounds()
    if (level === 'country') {
      requestBound = null
    }

    //处理左边列表查询
    reloadLeftStoreList(requestBound)
    console.log('resetData zoom', map.getZoom())
    //汇总加载

    if (isLoadGoogleClusters) {
      reloadRightGoogList()
    } else {
      let res = await getLatLngStatistics(queryForm, requestBound, getZoomLevelType(zoom!)) // 后台汇总
      cleanAllMarkers()
      createCountrySummy(res.data, level)
    }
  }, 1000)

  const reloadLeftStoreList = (requestBound: MapBound) => {
    page.value = 1
    isNoMore.value = false
    moreLoading.value = false
    leftLoading.value = true
    getStoreList(page.value, 10, queryForm, requestBound)
      .then((res) => {
        storeList.value = res.data
      })
      .finally(() => {
        leftLoading.value = false
        scrollbarRef.value?.scrollTo(0, 0)
      })
  }

  const reloadRightGoogList = () => {
    rightMapLoading.value = true
    getLatLngList(queryForm, getNowMapBounds())
      .then((res: any) => {
        cleanAllMarkers()
        initMarkers(res.data)
        initClusters(res.data)
      })
      .finally(() => {
        rightMapLoading.value = false
      })
  }

  const reloadRightGoogDetailList = (callbackFn: Function | null = null, storeId: string | null = null, existMarker: any | null = null) => {
    rightMapLoading.value = true
    getLatLngList(queryForm, getNowMapBounds())
      .then((res: any) => {
        cleanAllMarkers(existMarker)
        initMarkers(res.data, existMarker)
        // callbackFn && callbackFn(storeId)
      })
      .finally(() => {
        rightMapLoading.value = false
      })
  }

  const loadDropdown = () => {
    getDropdown().then((res) => {
      const row = res.data.row
      owns.value = row.own
      countries.value = row.countries
      cities.value = row.cities
      storeLevels.value = row.storeLevels
      channelTypes.value = row.channelTypes
      supervisions.value = row.supervisions
    })
  }

  // ************************** vue处理 ******************************
  onMounted(async () => {
    loading.value = true
    try {
      await initMap()
      loadDropdown()
      loading.value = false
    } catch (error) {
      console.error('Error onMounted:', error)
    }
  })

  watch(
    () => [queryForm.ownList, queryForm.countryCode, queryForm.cityNames, queryForm.supervisionNames, queryForm.storeLevelNames, queryForm.channelTypeNames, queryForm.channelTypeNames],
    async () => {
      page.value = 1
      resetData()
    },
    { deep: true },
  )
  


  // ************************** 左边菜单导航处理 ******************************
  const menuToggle = () => {
    menuShow.value = !menuShow.value
  }
  // 加载更多数据
  const loadMore = async () => {
    if (moreLoading.value) return
    moreLoading.value = true
    const queryPage = page.value + 1
    getStoreList(queryPage, 10, queryForm, getNowMapBoundsByZoom()).then((res: any) => {
      moreLoading.value = false
      if (res.data && res.data.length > 0) {
        storeList.value = storeList.value.concat(res.data)
        page.value++
        isNoMore.value = false
      } else {
        isNoMore.value = true
      }
    })
  }

  // 处理滚动事件
  const onScroll = ({ scrollTop }: { scrollTop: number }) => {
    const wrapEl = scrollbarRef.value?.wrapRef as HTMLDivElement
    if (!wrapEl) return

    const { scrollHeight, clientHeight } = wrapEl
    const threshold = 10
    if (scrollTop + clientHeight >= scrollHeight - threshold) {
      if (!isNoMore.value) {
        loadMore()
      }
    }
  }

  const getNowMapBoundsByZoom = () => {
    const level = getZoomLevelType(map.getZoom())
    let requestBound = getNowMapBounds()
    if (level === 'country') {
      requestBound = null
    }
    return requestBound
  }

  const querySearchAsync = (queryString: string, cb: (arg: any) => void) => {
    getStoreList(page.value, 10, queryForm, getNowMapBoundsByZoom(), true).then((res: any) => {
      const results = res.data.map((store: MapStore) => {
        return { value: store.storeName, store: store }
      })
      cb(results)
    })
  }

  const handleSelect = (item: any) => {
    queryForm.quickSearch = ''
    focusOnStore(item.store)
  }

  const closeInfo = (infoWindow: any) => {
    infoWindow.close()
  }

  const showImage = (store: any) => {
    loading.value = true
    getStoreImg(store.id)
      .then((res: any) => {
        loading.value = false
        storeImgInfo.value = res.data.row
        nextTick(() => {
          isShowImageViewer.value = true
        })
      })
      .catch((err: any) => {
        loading.value = false
      })
  }

  const closeImage = () => {
    isShowImageViewer.value = false
  }

  const storeIsSelected = (store: MapStore) => {
    if (selectedMarker.value) {
      const gno = selectedMarker.value.content!.querySelector('img')!.dataset.gno
      const type = selectedMarker.value.content!.querySelector('img')!.dataset.type
      if (gno == store.id && type !== 'base') {
        return true
      }
    }
    return false
  }

  const onQuickSearchBlur = () => {
    if (queryForm.quickSearch) {
      queryForm.quickSearch = ''
    }
  }

  const markerClick = (gno: string) => {
    setTimeout(() => {
      const marker = markers.find((m) => {
        return m.content!.querySelector('img')!.dataset.gno === gno
      })
      if (marker) {
        google.maps.event.trigger(marker, 'click')
      }
    }, 300)
  }

  const isNeedCreateMarker = (store: MapStore) => {
    let isNeedCreate = false
    if (markers.length == 0) {
      // 需要动态创建这个标记点
      isNeedCreate = true
    } else {
      const isCreate = markers.some((m) => {
        if (m.content!.querySelector('img')!.dataset.gno === `${store.id}`) {
          return true
        }
        return false
      })
      isNeedCreate = !isCreate
    }
    return isNeedCreate
  }

  // 聚焦到特定门店
  const focusOnStore = (store: MapStore) => {
    const lastZoom = map.getZoom()
    map.setZoom(detailZoom)
    map.panTo(new google.maps.LatLng(store.lat, store.lng))
    autocompleteRef.value!.blur()
    let temp = findMarkerByStoreId(`${store.id}`)
    if (!temp) {
      temp = createNewMarker(`${store.id}`, store)
      markers.push(temp)
    }
    setTimeout(() => {
      markerClickByMarker(temp, { own: store.own })
      if (lastZoom !== detailZoom) {
        setTimeout(async () => {
          reloadLeftStoreList(getNowMapBounds())
          //处理左边列表查询
          reloadRightGoogDetailList(markerClick, `${store.id}`, temp)
        }, 1200)
      }
    }, 300)
  }

  const countryChange = () => {
    if (queryForm.countryCode && countryLatLngMap[queryForm.countryCode]) {
      const latLng: BaseLatLng = countryLatLngMap[queryForm.countryCode].ori
      const zoom = countryLatLngMap[queryForm.countryCode].zoom
      if (zoom) {
        map.setZoom(zoom)
      } else {
        map.setZoom(mapInitZoom)
      }
      // cleanAllMarkers() // 提前清空
      infoWindow.close()
      setTimeout(() => {
        if (latLng) {
          map.panTo(new google.maps.LatLng(latLng.lat, latLng.lng))
        }
      }, 500)
    }
  }
</script>

<style lang="scss" scoped>
  .main-container {
    position: relative;
  }

  .image-viewer-container {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 100;
    width: 100%;
  }

  .map-app-container {
    top: 0;
    left: 0;
    position: absolute;
    display: flex;
    width: 100%;
    height: calc(100vh - 70px);
    border: 1px solid #dcdfe6;
    overflow: hidden;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    background-color: #fff;
    z-index: 99;
  }

  .store-arrow-box {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 35px;
    height: 80px;
    background-color: #ffffffcf;
    border-radius: 0 10px 10px 0;
    z-index: 1;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);

    .triangle {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-top: 10px solid transparent;
      border-bottom: 10px solid transparent;
    }

    &:hover {
      background-color: #fff;
    }

    &.left {
      left: 350px;
      transition: width 0.3s ease;

      .triangle {
        left: 8px;
        border-right: 12px solid #8b8b8b;
        border-left: 0;
      }
    }

    &.right {
      left: 0;
      transition: width 0.3s ease;

      .triangle {
        border-left: 12px solid #8b8b8b;
        border-right: 0;
        left: 13px;
      }
    }
  }

  .store-list-container {
    width: 350px;
    display: flex;
    visibility: visible;
    flex-direction: column;

    &.show {
      width: 350px;
      display: flex;
      visibility: visible;
    }

    &.hide {
      width: 0;
      // transition: width 0.3s ease;
      visibility: hidden;
    }
  }

  .search-box {
    padding: 12px;

    :deep(.el-autocomplete) {
      width: 100%;
    }
  }

  .store-list {
    flex: 1;

    .store-item {
      transition: all 0.3s;
      cursor: pointer;
      position: relative;
      overflow: hidden;
    }

    .store-item.active {
      background-color: #f4f4f4;
    }

    .store-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 2px 6px 0 rgba(0, 0, 0, 0.1);
    }

    .store-color {
      position: absolute;
      left: 0;
      top: 0;
      width: 4px;
      height: 100%;
    }

    .store-info {
      padding: 23px 16px 18px 13px;
      border-bottom: #e8e8e8 1px solid;
    }

    .name {
      color: #000;
      font-size: 16px;
      font-weight: 400;
      display: flex;
      align-items: center;

      .icon {
        img {
          width: 13px;
        }

        margin-right: 10px;
      }
    }

    .address {
      font-size: 14px;
      color: #454545;
      display: flex;
      flex-direction: row;
      justify-content: flex-start;
      margin-top: 13px;
      line-height: 24px;

      .icon {
        img {
          width: 11px;
        }

        margin-right: 10px;
        padding-top: 3px;
      }

      .content {
        width: 320px;
        min-height: 15px;
        font-size: 14px;

        .types {
          display: flex;
          align-items: center;
          margin-top: 13px;
        }

        .types .el-tag {
          margin-right: 8px;
        }
      }
    }
  }

  .map-container {
    flex: 1;
    height: 100%;
    position: relative;

    .filter-bar {
      padding: 15px;
      background-color: transparent;
      position: absolute;
      margin-right: 50px !important;
      left: 0;
      top: 0;
      z-index: 1;
    }

    .map {
      width: 100%;
      height: 100%;
    }
  }

  .custom-select {
    :deep(.el-input__inner) {
      color: #000 !important;
    }

    :deep(.el-select-v2__placeholder) {
      color: #000 !important;
    }

    :deep(.el-input__inner::placeholder) {
      color: #434242 !important;
    }

    :deep(.el-input__wrapper) {
      border-radius: 15px;
      background-color: #ffffffe6;
      color: #000;
    }

    :deep(.el-select-v2) {
      width: 100%;
      color: #000;
    }

    :deep(.el-select-v2__wrapper) {
      border-radius: 15px;
      background-color: #ffffffe6;
      color: #000;
    }

    :deep(.el-select .el-input .el-select__caret.el-icon) {
      color: #000;
    }
  }

  .marker-hg-img {
    width: 25px !important;
    height: 33px !important;
  }

  .list-item {
    padding: 12px;
    border-bottom: 1px solid #eee;
    transition: background-color 0.3s;
  }

  .list-item:hover {
    background-color: #f5f7fa;
  }

  .loading {
    text-align: center;
    padding: 20px;
    color: #909399;
  }

  .my-autocomplete li {
    line-height: normal;
    padding: 7px;

    img {
      width: 10px;
      height: auto;
    }

    span {
      padding-left: 5px;
    }
  }
</style>
