// 订单结算模块
const express = require('express')
// 创建路由实例对象
const router = express.Router()

// 付款订单接口（响应给用户选哟付款的商品数据）
const { checkoutOrderhandle } = require('../router_handle/pay')
router.get('/checkout/order',checkoutOrderhandle)

module.exports = router