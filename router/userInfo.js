const express = require('express')
const router = express.Router()
const { handleUserInfo,handleOrderList } = require('../router_handle/userInfo')

// 获取用户界面信息
router.get('/user/info', handleUserInfo)

// 我的订单
router.get('/order/list', handleOrderList)

module.exports = router