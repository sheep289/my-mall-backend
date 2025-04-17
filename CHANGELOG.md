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


## 2.首页接口业务逻辑
    - 上传图片接口（管理员） 导航栏接口 
    1.创建public/home_img文件夹  存放客户端请求传过来的图片路径，在存到本地文件 ，将上传模块抽离到单独模块（创建config/uplooad.js）
    流程如下：前端上传 → 2. ​Multer 存文件 → 3. ​路径存数据库 → 4. ​返回 URL → 5. ​前端用 URL 渲染图片
    2.安装 npm install --save multer 中间件
        为什么用 multer？
        因为前端通过 FormData 发送文件时，数据格式是 multipart/form-data，普通的 express.json() 解析不了，必须用 multer 
        这个中间件专门处理
    3.配置上传模块（复用工厂函数）​config/upload
    4.router/page_home导入upload 并使用
    
    5.接口有：上传轮播图，上传导航栏，获取轮播图，获取导航栏接口
        page/upload/banners
        page/upload/nav
        page/home/banners
        page/home/nav
    6.获取商品列表接口  page/home/goodsList
        创建goods数据库时候
        goods为父表 对应的子表有（goods_id）→goods_image → goods_specs(该表又绑定了 specs父表)
        

### 导入示例：
```js
    const createUploader = require('../config/upload')
    // 配置主页图片上传器
    const uploadHome = createUploader({
    subfolder: 'pageHome_img', // 存到 public/home_img
    prefix: 'home_', // 文件名前缀，如 home_1623456789-xxx.jpg
    })

    router.post('/upload/banners',uploadHome.single('image'), uploadBanners)

```

## 3.详情页接口  get api/goods/detail
    -1.接受客户端传送过来的goodsId 用来匹配相对应的商品数据
    -2 利用聚合函数查询 将详情页的组图，商品，详情图等数据响应给客户端
    -3.查询规格参数，利用自连接 + 聚合函数 + 条件为goods_spece.goods_id = 客户端的goodsId,将查询的数据在后端进行处理与合并
    -4.注意点，sql查询将多张图片合并成一个json字符串，需在后端进行JSON.parse转换

## 4.获取商品评论 get api/goods/comment
    -1. 接受客户端携带过来的goodsId 与limit（不是必传送，默认为4）参数 
    -2. 校验客户端携带的参数是否有效
    -3. mysql创建users_goods_comment 表，用来存储用户评论数据，需要绑定商品(goods)与用户(user)主键
    -4 通过多表查询中的内连接 查询对应商品对应用户低下的评价
    -5 查询到后 处理数据 在响应给客户端，时间与脱敏电话用要处理


## 5.将商品添加到购物车 post my/cart/add
    -1.创建接口  需在请求头携带token权证
    -2 该接口请求时需要token权证 ，通过jwt 会见解析好的数据挂载到req.auto身上，可以通过req.auto.id拿到用户id
    -3 客户端需要传goodsId,specValueIds:[颜色，内存],quantity  分别对应商品ID 商品规格值，商品数量
    -4 分别定义dql语句：
        4.1写入购物车语句（cart）:记录哪个用户添加了购物车
        4.2写入购物车关联表语句（cart_specs） :记录用户选择哪个规格，方便后续查询将购物车数据响应给客户端，
            参数1：carts表中的id字段，
            参数2: 客户端携带过来的specValueIds值，利用map方法，分别增加两条数据
            dql语句：insert into cart_specs (cart_id, spec_value_id) 
            values ?
            循环逻辑：[specValueIds.map(specId => [results.insertId, specId])]   
            数据库表中将会插入2条数据：cards.id , 颜色规格值，card.id,内存规格值。 
            注意：cards的值通过第一个写入购物车语句resuls返回的对象中inserId属性
    -5 如果用户多次将同一个商品添加到购物车，则无需创建新的含，而是给该商品的quantity + 1 
        insert into carts (user_id, goods_id, quantity)
        values (?, ?, ?)
        on DUPLICATE KEY UPDATE quantity = quantity + 1;


## 6.将客户的购物车商品信息响应给客户端接口 get my/cart/list
    -1.创建接口， 需在请求携带token权证
    -2.该接口请求时需要token权证 ，通过jwt 会见解析好的数据挂载到req.auto身上，可以通过req.auto.id拿到用户id
    -3 返回对象形式是数组包裹着对象，对象中是一个商品的信息shuju

## 7. 创建修改购车商品数量接口
    -1.创建接口，接受客户端携带过来的cartId ，修改quantity数量
    -2. 使用ddl 更新语句，根据用户id以及商品id对quantity进行更新

## 6.删除购物车商品
    -1给数据库中的carts表新加了2个字段：states(逻辑管理商品删除，如果用户在购物车中删除该商品，则status为1) delete_at删除时间
    -2 由于后续添加的status字段，所以前面一些关于购物车的接口中dql语句需要做个小修改，例如返回购物车列表数据需要添加一个判断条件：and carts.status = 0
    -3 添加购物车接口dql语句调整
```JavaScript
        // 原先的
        const addDql = `
            insert into carts (user_id, goods_id, specs, quantity)
            values (?, ?, ?,?)
            on DUPLICATE KEY UPDATE quantity = quantity + ?;
        `
        // 表中添加status字段后的 
        INSERT INTO carts (user_id, goods_id, specs, quantity)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        quantity = CASE WHEN status = 1 THEN VALUES(quantity) ELSE quantity + VALUES(quantity) END,
        status = 0,
        deleted_at = NULL; 
```

    - 4 删除的业务逻辑：
        前端携带需要删除的carts是一个数组，每一项代表着要删除的商品
        思路：这里不使用物理删除语句delete, 而是使用逻辑删除的方法，给要删除的商品状态status标记为1，所以这里用update 语句 更新status状态
        由于穿过来的是个数组，这里利用到 in  例如：where user = 5 and id in (这里是占位符数量取决去数组长度)
            MySQL 可能不支持直接传数组，需要手动拼接 ? （使用join方法）
代码：
```JavaScript
        const placeholders  = cartIds.map(() => '?').join(',')
        // 这里不使用物理删除（直接删除） 而是逻辑删除（通过status标记）
        const dql = `update carts set status = 1,deleted_at = NOW()
                    where user_id = ? and id in (${placeholders}) `

```


