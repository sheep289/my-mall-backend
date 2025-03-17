// 用户路由模块
const express = require('express')
// 导入用户路由处理函数对应模块
const router = express.Router()
const login_handle = require('../router_handler/user')

// 用户注册
router.post('/register', login_handle.register)

// 用户登录
router.post('/login',login_handle.login)

// 导出
module.exports = router