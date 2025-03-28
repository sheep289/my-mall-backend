// 这是获取首页信息接口
const { pageHomeBannerHandle,uploadBanners,uploadNav,pageHomeNavHandle } = require('../router_handler/page_home')
const express = require('express')
const router = express.Router()

const createUploader = require('../config/upload')
// 配置主页图片上传器
const uploadHome = createUploader({
    subfolder: 'pageHome_img', // 存到 public/home_img
    prefix: 'home_', // 文件名前缀，如 home_1623456789-xxx.jpg
})

// 上传首页轮播图接口
router.post('/upload/banners',uploadHome.single('image'), uploadBanners)

// 上传首页导航栏接口
router.post('/upload/nav',uploadHome.single('image'),uploadNav)

// 获取首页接口
router.get('/home/banners',pageHomeBannerHandle)
router.get('/home/nav',pageHomeNavHandle)
module.exports = router