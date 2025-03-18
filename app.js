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
app.use(
    jwt({
        secret: process.env.JWT_PRIVATEKEY,
        algorithms: ["HS256"],
    }).unless({ path: [/^\/api\//] })
)

// 导入用户路由模块
const userRouter = require('./router/user')
app.use('/api', userRouter)

// 错误处理中间件（捕获验证错误信息，并响应给客户端）
app.use((err, req, res, next) => {
    if (err instanceof joi.ValidationError) return res.cc(err)
    // token验证失败的错误
    if (err.name === 'UnauthorizedError') return res.cc('身份认证失败！',401)
    //未知错误信息
    res.cc('未知错误')
})


app.listen(80, () => {
    console.log('已启动服务器：http://127.0.0.1')
})