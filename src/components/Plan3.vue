<template>
  <div class="map-container"> 
        <div ref="mapContainer" class="map"></div>
      </div>
</template>
<script setup lang="ts">

import { ref, onMounted } from 'vue'
  import { Loader } from '@googlemaps/js-api-loader'
  import { MarkerClusterer } from '@googlemaps/markerclusterer' 
  import { debounce } from 'lodash-es'
  import type {   MapLatLng, MapInit } from './type.ts'
  import { getLatLngStatistics, getLatLngList, getStoreCount } from './api.ts' 

  const apiKey = import.meta.env.VITE_API_KEY as string
  const loading = ref(false)
  const rightMapLoading = ref(false)
  const isFristLoad = ref(true)

  // 阀只变量
  const detailZoom = 16 // 显示具体详细时候的zoom
  const markerClusterMaxZoom = detailZoom - 1 // 显示具体详细时候的zoom
  const countryInitZoom = 5 // 国家跳转 5 
  const countryAmericInitZoom = 3 // 美国跳转 3
  const provinceZoom = 8 // 省/州 临界点
  const cityZoom = 12 // 城市
  const mapInitZoom = countryInitZoom // 地图第一次显示尺寸
  const mapMinZoom = 3 // 最小缩放级别
  const mapMaxZoom = detailZoom // 最大缩放级别
  const googleMaxCnt = 3000 // 谷歌最大显示数量 5000

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
    green: null
  } 
  let markersRed: google.maps.marker.AdvancedMarkerElement[] = []
  let markersGreen: google.maps.marker.AdvancedMarkerElement[] = []
 
  const algorithmOptions = {
    gridSize: 50, // 聚合半径 50
    maxZoom: markerClusterMaxZoom // 缩放至 15 级 之后时展开
  }
 
  // 国家跳转 经纬度字典
  const countryLatLngMap: any = {
    GB: {
      ori: {
        lat: 51.500974,
        lng: -0.156653
      },
      type: {
        lat: 52.284048,
        lng: -1.854785
      },
      no_type: {
        lat: 54.33167,
        lng: -1.569141
      },
      zoom: countryInitZoom
    },
    US: {
      ori: {
        lat: 40.7396451623328,
        lng: -102.55468301929768
      },
      type: {
        lat: 39.831881,
        lng: -97.533593
      },
      no_type: {
        lat: 39.153634,
        lng: -107.553124
      },
      zoom: countryAmericInitZoom
    },
    DE: {
      ori: {
        lat: 51.165691,
        lng: 10.451526
      },
      type: {
        lat: 49.531369,
        lng: 10.137536
      },
      no_type: {
        lat: 52.273966,
        lng: 9.346521
      },
      zoom: countryInitZoom
    }
  }


  // ************************** 地图处理 ******************************
  // 初始化地图
  const initMap = async () => {
    try {
      const loader = new Loader({
        apiKey: apiKey,
        version: 'weekly',
        libraries: ['places']
      })
      await loader.load()
      const { Map } = await google.maps.importLibrary('maps')
      const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary('marker')

      // 默认英国
      let initLat = countryLatLngMap.GB.ori.lat
      let initLng = countryLatLngMap.GB.ori.lng
      let initZoom = mapInitZoom
      const initCoordinates: MapInit = countryLatLngMap['GB']
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
        mapTypeControl: false,
        gestureHandling: 'greedy',
        streetViewControl: false
      })
      // 添加地图拖动和缩放事件监听器
      map.addListener('idle', async () => {
        if (isFristLoad.value) {
          isFristLoad.value = false
          resetData()
          return
        }
      }) 
  
      map.addListener('dragend', () => {
        resetData()
      })

      map.addListener('zoom_changed', () => { 
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

  const createMarkerDivContent = (id: string, type: number, type1: 'base' | 'show') => {
    let url = ''
    let width = 22
    const maptype: any = {
      1: () => {
        url = '/dashboard/local1.png'
      },
      0: () => {
        url = '/dashboard/local2.png'
      }
    }
    maptype[type] && maptype[type]()
    const mapType: any = {
      base: () => {
        width = 22
      },
      show: () => {
        width = 40
      }
    }

    mapType[type1] && mapType[type1]()

    const customContent = document.createElement('div')
    customContent.innerHTML = `
        <img class="marker-hg-img" style="width:${width}px" data-id="${id}" data-type="${type}"  data-type="${type1}" src="${url}" alt="Marker Icon" >
    `
    return customContent
  }
  const initMarkers = (list: MapLatLng[], existMarker: any | null = null) => {
    const tempStoreId = getStoreIdByMarker(existMarker)
    markers = list.map((store) => {
      if (store.id === tempStoreId) {
        return existMarker
      }
      return createNewMarker(store.id, store)
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
            content: createClusterIcon(count, 'red')
          })
        }
      }
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
            content: createClusterIcon(count, 'green')
          })
        }
      }
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
    return dataSet ? dataSet.id : null
  }



  const createNewMarker = (id: string, store: MapLatLng) => {
    const markerDiv = createMarkerDivContent(id, store.type, 'base')
    const marker = new google.maps.marker.AdvancedMarkerElement({
      position: { lat: store.lat, lng: store.lng },
      map: map,
      // title: `${store.type}`,
      content: markerDiv
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
  }
  
 

  const getBoundObj: any = (bounds: google.maps.LatLngBounds) => {
    const boundObj = {
      southWest: {
        lat: bounds.getSouthWest().lat(),
        lng: bounds.getSouthWest().lng()
      },
      northEast: {
        lat: bounds.getNorthEast().lat(),
        lng: bounds.getNorthEast().lng()
      }
    }
    return boundObj
  }

  function getZoomLevelType(zoom: number) {
    // 定义经验范围（可根据实际情况调整）
    if (zoom! <= countryInitZoom) {
      return 'country'
    } else if (zoom! > countryInitZoom && zoom! <= provinceZoom) {
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
        if (obj.type === 1) {
          initLatLng = countryLatLngMap[obj.name].type
        } else {
          initLatLng = countryLatLngMap[obj.name].no_type
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
        content: createClusterIcon(obj.total, obj.type === 1 ? 'green' : 'red', size)
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
          east: 45.0
        }
      },
      {
        name: 'Americas',
        bounds: {
          north: 83.0,
          south: -56.0,
          west: -170.0,
          east: -30.0
        }
      }
      // 你可以继续添加其他大洲，比如 Asia, Africa 等
    ]

    return continents
      .filter((c) => {
        const b = c.bounds
        return ne.lat() >= b.south && sw.lat() <= b.north && ne.lng() >= b.west && sw.lng() <= b.east
      })
      .map((c) => c.name)
  } 

  // ************************** 数据处理 ******************************
  const resetData = debounce(async () => {
    if (!map || !map.getBounds()) {
      return
    }
    const zoom = map.getZoom()!
    if (zoom <= 1) {
      cleanAllMarkers()
      return
    }

    let isLoadGoogleClusters = false
    if (zoom >= cityZoom) {
      // 城市维度的时候，
      //先获取当前总数，如果总数大于100000，就不显示聚合
      const resCnt = await getStoreCount(getNowMapBounds())
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
 
    console.log('resetData zoom', map.getZoom())
    //汇总加载

    if (isLoadGoogleClusters) {
      reloadRightGoogList()
    } else {
      let res = await getLatLngStatistics(requestBound, getZoomLevelType(zoom!)) // 后台汇总
      cleanAllMarkers()
      createCountrySummy(res.data, level)
    }
  }, 1000)

 

  const reloadRightGoogList = () => {
    rightMapLoading.value = true
    getLatLngList(getNowMapBounds())
      .then((res: any) => {
        cleanAllMarkers()
        initMarkers(res.data)
        initClusters(res.data)
      })
      .finally(() => {
        rightMapLoading.value = false
      })
  }  

  // ************************** vue处理 ******************************
  onMounted(async () => {
    loading.value = true
    try {
      await initMap() 
      loading.value = false
    } catch (error) {
      console.error('Error onMounted:', error)
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
