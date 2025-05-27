const express = require('express')
const router = express.Router() 
const {handleAddGoods} = require('../router_handle/goods')

const createUploader = require('../config/upload')
// 配置主页图片上传器
const uploadHome = createUploader({
    subfolder: 'goods_img', // 存到 public/home_img
    prefix: 'goodsimg_', // 文件名前缀，如 home_1623456789-xxx.jpg
})
// 添加商品接口
router.post('/add/goods',uploadHome.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'detailImages', maxCount: 10 },
    { name: 'pageImages', maxCount: 10 }
  ]),
  handleAddGoods)

module.exports = router