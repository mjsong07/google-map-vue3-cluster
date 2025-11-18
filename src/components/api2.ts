
import type { MapBound } from './type.ts'
import countryData from './country.json'
import provinceData from './province.json'
import cityData from './city.json'
import detailData from './detail.json'
import countData from './count.json'
import getStoreListData from './getStoreList.json'
import getStoreInfoData from './getStoreInfo.json'
import getStoreImgData from './getStoreImg.json'
import getDropdownData from './getDropdown.json'

const getLatLngStatistics = (queryForm: MapQueryForm, requestBound: MapBound, level: string) => {
  let data: any = {}
  if (requestBound) {
    data.southWest = requestBound.southWest
    data.northEast = requestBound.northEast
  }
  data.level = level
  return new Promise((resolve, reject) => {
    setTimeout(() => {
        if(level === 'country') resolve(countryData)
        if(level === 'province') resolve(provinceData)
        if(level === 'city') resolve(cityData)
    }, 1000);
  })
}
const getStoreCount = (queryForm: MapQueryForm, requestBound: MapBound) => {
  let data: any = {}
  if (requestBound) {
    data.southWest = requestBound.southWest
    data.northEast = requestBound.northEast
  }
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(countData)
    }, 1000);
  })
}

const getLatLngList = (queryForm: MapQueryForm, requestBound: MapBound) => {
  let data: any = {}
  if (requestBound) {
    data.southWest = requestBound.southWest
    data.northEast = requestBound.northEast
  }
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(detailData)
    }, 1000);
  })
}


const getStoreList = (page: number, limit: number, queryForm: MapQueryForm, requestBound: MapBound, isSearchKey: boolean = false) => {
  let data: any = {
    page: page,
    limit: limit,
  }
  if (requestBound) {
    data.southWest = requestBound.southWest
    data.northEast = requestBound.northEast
  }
  if (queryForm) {
    data = { ...data, ...queryForm }
    if (!isSearchKey) {
      delete data.quickSearch
    }
  }
     return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(getStoreListData)
    }, 1000);
  })
}


const getStoreInfo = (id: string) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(getStoreInfoData)
    }, 1000);
  })
}

const getStoreImg = (id: string) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(getStoreImgData)
    }, 1000);
  })
}

const getDropdown = () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(getDropdownData)
    }, 1000);
  })
}
 
 
export { getLatLngStatistics, getStoreCount, getLatLngList, getStoreList, getStoreInfo, getStoreImg, getDropdown }
