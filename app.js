const express = require('express')
const app = express()
const joi = require('joi')
require('dotenv').config() //加载配置环境
// 配置cors中间件 ，解决跨域问题
const cors = require('cors')
app.use(cors({ methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }))

// 注册全局解析表单数据中间件
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(express.static('public')) //将public 提供为静态资源


// 为res挂载 res.cc() 函数
app.use((req, res, next) => {
    // status = 0为成功 1则为失败 ，默认设为 0
    res.cc = (err, status = 1) => {
        res.send({
            status,
            // 状态描述，判断 err是 错误对象 还是 字符串
            message: err instanceof Error ? err.message : err
        })
    }
    next()
})

// 导入express-jwt中间件 用来解析token字符串
const { expressjwt: jwt } = require('express-jwt')
app.use('/my',
    jwt({
        secret: process.env.JWT_PRIVATEKEY,
        algorithms: ["HS256"],
    })
)
// app.use(
//     jwt({
//         secret: process.env.JWT_PRIVATEKEY,
//         algorithms: ["HS256"],
//     }).unless({ path: [{ url: /^\/api/ },{ url: /^\/page/ }]})
// )

// 导入用户路由模块
const userRouter = require('./router/user')
app.use('/api', userRouter)

// 导入首页路由模块
const homeRouter = require('./router/page_home')
app.use('/page', homeRouter)

// 导入商品详情页路由模块
const detailRouter = require('./router/detail_page')
app.use('/api', detailRouter)

// 导入购物车路由模块
const cartRouter = require('./router/cart')
app.use('/my',cartRouter)

// 导入订单结算路由模块
const payRouter = require('./router/pay')
app.use('/my',payRouter)

// 导入地区数据模块(地址)
const addressRouter = require('./router/address')
app.use('/my',addressRouter)

// 导入用户信息路由模块
const userInfoRouter = require('./router/userInfo')
app.use('/my',userInfoRouter)

// 搜索模块
const searchRouter = require('./router/search')
app.use('/api',searchRouter)

// 添加商品
const goodsRouter = require('./router/goods')
app.use('/my',goodsRouter)

// 错误处理中间件（捕获验证错误信息，并响应给客户端）
app.use((err, req, res, next) => {
    if (err instanceof joi.ValidationError) return res.cc(err)
    // token验证失败的错误
    if (err.name === 'UnauthorizedError') return res.cc('登录信息过期', 401)
    //未知错误信息
    res.cc('未知错误')
})


app.listen(80, () => {
    console.log('已启动服务器：http://127.0.0.1')
})