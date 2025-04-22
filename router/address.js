const express = require("express")
const router = express.Router()
const { handleProvinceData, handleCityData, handleCountyData, handleAddressList, handleAddAddress, handleClearAddress, handleUpdateAddress, handleDefaultAddress } = require('../router_handle/address')

// 获取省
router.get('/region/province', handleProvinceData)
// 市
router.get('/region/city/:region_id', handleCityData)
// 区
router.get('/region/county/:region_id', handleCountyData)

// 获取收货地址列表api
router.get('/address/list', handleAddressList)

// 添加地址api
router.post('/add/address', handleAddAddress)

// 删除地址
router.post('/clear/address', handleClearAddress)

// 更新/修改收货地址
router.post('/update/address', handleUpdateAddress)

// defaultAddress(默认收货地址)
router.post('/default/address', handleDefaultAddress)
module.exports = router

