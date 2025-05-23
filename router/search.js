// 搜索
const express = require('express')
const router = express.Router()
const {handleSearchSelect,handleCategory,handleCategoryProducts } = require('../router_handle/search')

router.get('/search',handleSearchSelect)

// 分类项目
router.get('/category',handleCategory)
// 获取热销商品
router.get('/category/products',handleCategoryProducts)
module.exports = router