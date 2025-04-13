// 详情页模块
const { goodsDetailPageHandle,goodsCommentHandle } = require('../router_handle/detail_page')
const express = require('express')
const router = express.Router()

router.get('/goods/detail', goodsDetailPageHandle)
// 获取商品评论
router.get('/goods/comment',goodsCommentHandle)

module.exports = router

