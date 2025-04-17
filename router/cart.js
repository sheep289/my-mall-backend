const express = require('express')
const router = express.Router()
const { cartHandle, cartListHandle,cartUpdateHandle,cartClearHandle } = require('../router_handle/cart')
// 添加购物车接口
router.post('/cart/add',cartHandle)
// 获取购物车列表接口
router.get('/cart/list',cartListHandle)
// 跟新购物车商品数量
router.post('/cart/update',cartUpdateHandle)
// 删除购物车对应的商品
router.post('/cart/clear',cartClearHandle)

module.exports = router