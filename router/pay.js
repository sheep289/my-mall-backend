// 订单结算模块
const express = require('express')
// 创建路由实例对象
const router = express.Router()

// 付款订单接口（响应给用户选哟付款的商品数据）
const { checkoutOrderhandle,handelPayMode,handleSubmit } = require('../router_handle/pay')
router.get('/checkout/order',checkoutOrderhandle)

// 支付方式
router.get('/pay/mode',handelPayMode)

// 提交订单
router.post('/checkout/submit',handleSubmit)

module.exports = router