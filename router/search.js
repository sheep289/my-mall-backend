// 搜索
const express = require('express')
const router = express.Router()
const {handleSearchSelect,handleCategory } = require('../router_handle/search')

router.get('/search',handleSearchSelect)

// 分类项目
router.get('/category',handleCategory)
module.exports = router