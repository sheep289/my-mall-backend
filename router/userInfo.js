const express = require('express')
const router = express.Router()
const { handleUserInfo,handleOrderList,handleCancelOrder,handleOrderDelete } = require('../router_handle/userInfo')

// 获取用户界面信息
router.get('/user/info', handleUserInfo)

// 我的订单
router.get('/order/list', handleOrderList)

// 取消订单
router.post('/order/cancel',handleCancelOrder)

// 删除订单
router.post('/order/delete',handleOrderDelete)

module.exports = router