// 搜索
const express = require('express')
const router = express.Router()
const {handleSearchSelect } = require('../router_handle/search')

router.get('/search',handleSearchSelect)

module.exports = router