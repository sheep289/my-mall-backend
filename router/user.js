// 用户路由模块
const express = require('express')
// 导入用户路由处理函数对应模块
const router = express.Router()
const login_handle = require('../router_handler/user')

// 导入验证表单数据中间件
const expressJoi = require('@escook/express-joi')
// 导入需要的验证规则对象
const { user_schema } = require('../schema/user')

// 用户注册
router.post('/register', expressJoi(user_schema), login_handle.register)

// 用户登录
router.post('/login', expressJoi(user_schema), login_handle.login)


// 导出
module.exports = router