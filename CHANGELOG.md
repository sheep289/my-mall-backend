<!-- 为更新日志 -->
## 2025-03-16 初始化项目
```
    1.将项目基本结构已经所需要的第三方包配置好 
        express cors dotenv(环境变量)
    2.初始化路由文件夹，新建route文件夹 用来存放所有的路由模块
    3.新建router_handler 文件夹，用来存放所有的 路由处理函数模块 抽离路由模块中的处理函数 
```

## 2025-03-17 实现注册业务逻辑
    1.在app.js中，所有路由之前封装声明一个全局中间件，为res挂载 res.cc() 函数    *
    2.数据库中创建users用户表，存储用信息     *
    3.安装并配置MySql模块 
    4.注册实现步骤
        - 1. 检测表单数据是否合法 新建一个schema目录/user.js
               * 1.1 利用第三方包 分别是 joi 为表单中携带的每个数据项目，定义验证规则 与 @escook/express-joi中间件来实现自动对表单数据进行验证功能
               - 1.2定义用户名和密码的验证规则   *
               - 1.3定义验证注册和登录表单数据的规格对象
               - 1.4 导入验证表单数据中间件（局部中间件 ）   导入需要的验证规则对象
               - 1.4定义全局错误级别中间件 捕获验证失败的错误，并把错误信息响应给客户端
        - 2. 检测用户名是否被占用
            查询参数的results返回是一个数组，可以更具results的length >0 来判断用户名有没有重名
        - 3. 对密码进行加密处理
            安装第三方包 npm i bcryptjs@2.4.3  调用 bcrypt.hashSync(明文密码, 随机盐的
长度) 方法，对用户的密码进行加密处理    *
        - 4. 插入新用户

## 2025-03-18 实现登录业务逻辑
    1. 检测表单数据是否合法，
        - 利用joi定义用户登录验证规则
        - 利用express-joi 中间 判断用户的表单数据是否合法
    2. 根据用户名查询用户的数据
        - 执行SQL语句， 判断数据库中是否有表单数据中username
    3. 判断用户输入的密码是否正确
        - 使用bcrypt.compareSync（明文密码，数据库中的密码 ） 返回值是布尔值
    4. 生成 JWT 的 Token 字符串
        - 4.1安装第三方包 jsonwebtoken 与 express-jwt
           1. jsonwebtoken:用于生成Token字符串
                通过 ES6 的高级语法，快速剔除 除了 用户唯一标识与 用户角色 的其他值,然后将不敏感的信息生成token字符串响应给客户端
           2. 将用户的手机号进行脱敏 例如 18578952163 响应给客户端的是  185****2163
                新建一个工具类目录/desensitize.js脱敏函数模块（后续还会用到脱敏 ，直接封装）
                例如：const dszUsername = desensitizePhone(results[0].username)

           3. express-jwt中间件: 用于解析Token字符串
                const expressJwt = require('express-jwt')
                expressJwt({秘钥}).unless({path: 指定哪些接口不需要进行 Token 的身份认证 })
                const { expressjwt: jwt } = require('express-jwt')
                app.use(jwt({secret: process.env.JWT_PRIVATEKEY,algorithms: ["HS256"],}).unless({ path: [/^\/api\//] }))

