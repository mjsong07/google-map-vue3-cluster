export interface MapQueryForm {
  ownList: number[]
  countryCode: string
  cityNames: string[]
  supervisionNames: string[]
  storeLevelNames: string[]
  channelTypeNames: string[]
  quickSearch: string
}
export type MapStore = {
  id: number
  storeName: string
  storeNo: string
  city: string
  address: string
  countryCode: string
  gno: string
  own: number
  position: any

  countryName?: string
  storeType?: string
  channelType?: string
  storeLevelName?: string
  monthSales?: number
  supervisionName?: string

  mainImgUrl?: string
  img1Url?: string
  img2Url?: string
  img3Url?: string
  img4Url?: string
  img5Url?: string
  googleStoreLink?: string
  postalCode?: string
  province: string
  area: string
  phoneNumber: string
  storeCategory: string
} & BaseLatLng

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
