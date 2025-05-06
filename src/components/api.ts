
import type { MapBound } from './type.ts'
import countryData from './country.json'
import provinceData from './province.json'
import cityData from './city.json'
import detailData from './detail.json'
import countData from './count.json'

const getLatLngStatistics = ( requestBound: MapBound, level: string) => {
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
const getStoreCount = ( requestBound: MapBound) => {
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

const getLatLngList = ( requestBound: MapBound) => {
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
 
 
export { getLatLngStatistics, getStoreCount, getLatLngList}
