<template>
    <div class="map-container"> 
          <div ref="mapContainer" class="map"></div>
        </div>
  </template>
  
  <script lang="ts" setup>
  import { ref, onMounted, nextTick } from 'vue'
  import { Loader } from '@googlemaps/js-api-loader'
  import { MarkerClusterer } from '@googlemaps/markerclusterer'
  import { debounce } from 'lodash-es' 
   
  const loading = ref(false) 
  const apiKey = import.meta.env.VITE_API_KEY as string
  const loadLatLngList = () => {
    return new Promise(async (resolve, reject) => {
      try {
        let randomData: any[] = getRandomData()
        initMarkerAndClusters(randomData)
        console.log('渲染结束')
        resolve('加载完毕')
      } catch (error) {
        reject(error)
      }
    })
  }
  
  const getRandomData = () => {
    const COUNT = 30000 // 300000
    const locations = []
  
    // 深圳市中心坐标范围（大致）
    const baseLat = 54.0
    const baseLng = -2.0
  
    for (let i = 0; i < COUNT; i++) {
      const lat = baseLat + (Math.random() - 0.5) * 30.5 // +-0.25范围
      const lng = baseLng + (Math.random() - 0.5) * 100.5
  
      locations.push({
        id: `${i + 1}`,
        type: i % 2 === 0 ? 1 : 0,
        lat: parseFloat(lat.toFixed(6)),
        lng: parseFloat(lng.toFixed(6))
      })
    }
    return locations
  }
  
  const markersRed: google.maps.marker.AdvancedMarkerElement[] = []
  const markersGreen: google.maps.marker.AdvancedMarkerElement[] = []
  
  const algorithmOptions = {
    gridSize: 1, // 聚合半径 50px
    maxZoom: 15 // 缩放至 15 级 之后时展开
  }
  
  // 地图相关变量
  const mapContainer = ref(null)
  let map: google.maps.Map
  let markers: google.maps.marker.AdvancedMarkerElement[] = []
  let markerClusters: {
    red: MarkerClusterer | null
    green: MarkerClusterer | null
  } = {
    red: null,
    green: null
  } 
  const lastBounds = ref(null)
  let lastZoom = ref(0)
  let lastCenter = ref(null)
  
  const beachFlagImg = document.createElement('img')
  beachFlagImg.src = '/public/dashboard/local.png'
  
  const beachFlagImg2 = document.createElement('img')
  beachFlagImg2.src = '/public/dashboard/local2.png'
  const createMarkerDivContent = (id: string, type: 'normal' | 'active' = 'normal') => {
    let url = ''
    if (type === 'normal') {
      url = '/public/dashboard/local2.png'
    } else {
      url = '/public/dashboard/local.png'
    }
    const customContent = document.createElement('div')
    customContent.innerHTML = `
          <img class="marker-hg-img" style="width:30px" data-id="${id}" src="${url}" alt="Marker Icon" >
      `
    return customContent
  }
  //初始化聚合器
  const initMarkerAndClusters = (list: any[]) => {
  markers.forEach((marker) => {
    marker.map = null
  })
  markers = [] 

  markerClusters.red && markerClusters.red.clearMarkers()
  markerClusters.green && markerClusters.green.clearMarkers()

  let markersRed: google.maps.marker.AdvancedMarkerElement[] = []
  let markersGreen: google.maps.marker.AdvancedMarkerElement[] = []
    // 创建所有标记点
    markers = list.map((store) => {
      const markerDiv = createMarkerDivContent(store.id, 'normal')
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: store.lat, lng: store.lng },
        map: null,
        title: `${store.type}`,
        content: markerDiv,
      })
      if (store.type) {
        markersGreen.push(marker)
      } else {
        markersRed.push(marker)
      }
      // 添加点击事件
      marker.addListener('click', async () => {
      
      })
      return marker
    })
    // // 创建红色门店聚类器
    markerClusters.red = new MarkerClusterer({
      map,
      markers: markersRed,
      algorithmOptions: algorithmOptions,
      renderer: {
        render: ({ count, position }) => {
          return new google.maps.marker.AdvancedMarkerElement({
            position,
            content: createClusterIcon(count, 'red')
          })
        }
      }
    })
  
    // // 创建绿色门店聚类器
    markerClusters.green = new MarkerClusterer({
      map,
      markers: markersGreen,
      algorithmOptions: algorithmOptions,
      renderer: {
        render: ({ count, position }) => {
          return new google.maps.marker.AdvancedMarkerElement({
            position,
            content: createClusterIcon(count, 'green')
          })
        }
      }
    })
  }
  
  const resetAllMarkerClusters = debounce(() => {
    console.log('全局刷新 start')
    //还原显示所有标记
    markerClusters.red && markerClusters.red.clearMarkers()
    markerClusters.green && markerClusters.green.clearMarkers()
    let newRedMarkers: google.maps.marker.AdvancedMarkerElement[] = []
    let newGreenMarkers: google.maps.marker.AdvancedMarkerElement[] = []
    markers.forEach((marker) => {
      if (marker.title === '0') {
        newRedMarkers.push(marker)
      } else {
        newGreenMarkers.push(marker)
      }
      marker.map = map
    })
    if (markerClusters.red) {
      markerClusters.red!.addMarkers(newRedMarkers)
    }
    if (markerClusters.green) {
      markerClusters.green!.addMarkers(newGreenMarkers)
    }
    // loading.value = false
    console.log('全局刷新 end')
  }, 1000)
  
  const resetPartialMarkerClusters = debounce(() => {
    console.log('局部刷新 start')
    markerClusters.red && markerClusters.red.clearMarkers()
    markerClusters.green && markerClusters.green.clearMarkers()
    let newRedMarkers: google.maps.marker.AdvancedMarkerElement[] = []
    let newGreenMarkers: google.maps.marker.AdvancedMarkerElement[] = []
    markers.forEach((marker) => {
      if (map.getBounds()?.contains(marker.position!)) {
        if (marker.title === '0') {
          newRedMarkers.push(marker)
        } else {
          newGreenMarkers.push(marker)
        }
        marker.map = map
      } else {
        // console.log('marker.setVisible')
        marker.map = null
      }
    })
    if (markerClusters.red) {
      markerClusters.red!.addMarkers(newRedMarkers)
    }
    if (markerClusters.green) {
      markerClusters.green!.addMarkers(newGreenMarkers)
    }
    console.log('局部刷新 end')
  }, 1000)
  
  // 创建自定义聚类图标
  const createClusterIcon = (count: number, type: string) => {
    const color = type === 'green' ? '#00BD24' : '#E0312C'
    const svg = `
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
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
    const pinSvg = parser.parseFromString(svg, 'image/svg+xml').documentElement
    return pinSvg
  }
 
  
  // 初始化地图
  const initMap = async () => {
    try {
      const loader = new Loader({
        apiKey:apiKey ,
        version: 'weekly',
        libraries: ['places']
      })
  
      await loader.load()
  
      const { Map } = await google.maps.importLibrary('maps')
      const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary('marker')
      // 创建地图实例 - 初始视角设置为英国
      map = new Map(mapContainer.value, {
        center: { lat: 54.0, lng: -2.0 },
        zoom: 10,
        mapId: 'DEMO_MAP_ID',
        mapTypeId: 'roadmap',
        mapTypeControl: false,
        gestureHandling: 'greedy',
        streetViewControl: false
      })
      // 添加地图拖动和缩放事件监听器
      map.addListener('idle', (event:any) => {
        // console.log('now bounds:', JSON.stringify(requestBound))
        const currentCenter = map.getCenter()
        const currentZoom = map.getZoom()
        const isZoom = lastZoom.value !== currentZoom
  
        if (isZoom) {
          console.log('地图缩放：上一次', lastZoom.value, '当前', currentZoom)
          if (currentZoom < 7 && lastZoom.value >= 7) {
            nextTick(() => {
              resetAllMarkerClusters() // 全局刷新
            })
          }
        } else {
          console.log('地图移动：上一次', JSON.stringify(lastCenter.value), '当前', JSON.stringify(currentCenter))
          if (map.getZoom() >= 7) {
            resetPartialMarkerClusters() // 局部刷新
          }
        }
        lastZoom.value = map.getZoom()
        lastCenter.value = map.getCenter()
        lastBounds.value = map.getBounds()
      })
   
      // 初始获取边界
      lastBounds.value = map.getBounds()
      lastCenter.value = map.getCenter()
      lastZoom.value = map.getZoom()
  
      // 监听地图边界变化
      map.addListener('bounds_changed', () => {
        // 这里请求后台数据 刷新左边店铺列表
        // lastBounds.value = map.getBounds()
      })
  
      // 地图点击时关闭信息窗口
      map.addListener('click', () => {})
      map.addListener('dragstart', () => { })
      map.addListener('zoom_changed', () => { })
    } catch (error) {
      console.error('Error loading Google Maps:', error)
    }
  }
  
  onMounted(async () => {
    loading.value = true
    try {
      await initMap() 
      await loadLatLngList() 
      loading.value = false 
    } catch (error) {
      console.error('Error loading data:', error)
      loading.value = false
    }
  
  })
 

  </script>
  
  <style  scoped> 
  .map-container {
    height: 100%;
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
  }

  .map-container .map {
      width: 100%;
      height: 100%;
    } 
  .marker-hg-img {
    width: 25px !important;
    height: 33px !important;
  }
  
  .loading {
    text-align: center;
    padding: 20px;
    color: #909399;
  }
  </style>
  