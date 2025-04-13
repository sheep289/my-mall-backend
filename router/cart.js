const express = require('express')
const router = express.Router()
const { cartHandle, cartListHandle } = require('../router_handle/cart')
// 添加购物车接口
router.post('/cart/add',cartHandle)
// 获取购物车列表接口
router.get('/cart/list',cartListHandle)

module.exports = router