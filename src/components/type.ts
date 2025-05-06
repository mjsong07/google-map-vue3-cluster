
export type MapLatLng = {
  gno: string
  own: number
} & BaseLatLng

export interface MapStoreImg {
  storeName: string
  googleImgList: string[]
  posmImgList: string[]
  storeImgList: string[]
  own: number
}
export interface MapBound {
  southWest: BaseLatLng
  northEast: BaseLatLng
}

export type BaseLatLng = {
  lat: number
  lng: number
}

export type MapInit = {
  zoom: number
  ori: BaseLatLng
  own: BaseLatLng
  no_own: BaseLatLng
}
