const express = require('express')
const cors = require('cors')
const app = express()

// 配置cors中间件 ，解决跨域问题
app.use(cors({methods:['GET','POST','PUT','DELETE','OPTIONS']}))

// 注册全局解析表单数据中间件
app.use(express.json())
app.use(express.urlencoded({extended:false}))

// 导入用户路由模块
const userRouter = require('./router/user')
app.use('/api',userRouter)

app.listen(80,() => [
    console.log('已启动服务器：http://127.0.0.1')
])