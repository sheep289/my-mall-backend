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

## 用户下单  
### 1.用户订单结算页面  get /my/checkout/order
1. 用户订单结算页面 （无需对MySQL进行其它操作，只需要查询携带参数对应的商品数据响应回去）
    手机信息，共计多少钱，有无优惠券，配送费用 支付方式
2.  根据用户携带的mode进行相对应处理
        buyNow: 如果是立即购买类型那就直接根据用户携带参数响应对应商品数据  购物车id,商品数量，商品规格（为对象），用户id（token权证解析可获取）
        cart： 用户需要携带购 物车id（为数组），用户id 
            如果是购物车结算，根据用户携带的购物车id 响应对应的商品数据

### 提供地区级联选择数据（添加地址地区级联选择数据）
1. 由于数据太大，不建议一次响应 而是创建对应的省市区api
    接口1（省）：响应全部的省份给客户端
    接口2（市）：前端将region_id通过动态传参传递，在回调函数中调用req.params方法可以拿到动态的region_id 查询数据 返回对应的市数据
    接口3（区）：同样的道理，动态传递region_id,通过req.params获取， 在根据市的region_id 查询数据 响应给客户端

2. 接口4（添加地址api）post /my/add/address
3. 接口5（修改地址api） 主要跟据客户端携带的address_id以及需要更新的form对象中的new内容
4. 接口6 （设置默认地址） 根据客户端携带的addressId进行操作，例如：用户将addressId为9的地址设为默认，则dql语法：update user_address_info  set is_default = case when id = ? then 1 else 0 end where user_id = ? ;

如果id 相等的 is_default值为1,不想等赋值为0（一个用户所有地址只允许一个默认地址，所以更新一个为1，则其它都为0）


### 3. 用户点击结算
1. 创建接口  
2. 支付方式
3. 思路： 用户调用该api，将对应的数据新增/更新到MySQL中，
 /* 
            数据库：order表，order_items表（一个订单下有多个商品）
           注意：判断 客户端选择的支付方式不等1（余额支付），则结束程序（因为其它支付方式暂未开通，只支持余额支付）
            cart:如果是购物车提交的结算
                需要接收的参数为:cartIds,新的数量，优惠券，以及留言
                1.更具quantitys更新购物车数量（dql  如果客户端购买商品时更改了商品数量，则后端也需要更新，后续才能实时计算价格）                    
                     提取所有 id 和生成 CASE WHEN 条件 →  动态生成 SQL → 批量更新（更新商品数量 以及 status状态为 1）
                1.1 dql1查询对应的购物车数据
                2.将购车提交的订单 所有的价格进行累加 
                3.dql2 将订单信息记录到数据库order表中 
                    3.1 拿到新建一行的订单信息id(orderId) 一个订单对应多个商品 orderId
                    3.2 dql2 将数据新增到order 订单项表中 并且通过const orderId = newRows.insertId可以拿到新增一行的id
                    3.3 dql3 order_items表，新增数据，新增的数据根据查询出来的购物车数据进行增加  语法如下：
                        const newArr = [results1.map(item => [4,item.goods_id,item.price,mode,item.cart_id])]
                        动态的填写数据，动态的生成MySQL insert语句
                4. 支付（余额减除商品价格）
                    4.1 dql4 获取用户余额
                    4.2确认客户端选择的是余额支付 然后判断支付的价格是否 小于 余额
                    4.3 将总金额与商品总价进行计算（扣减用户余额）
                    4.4 dql5 如果支付成功（
                    后续在添加支付密码） 则将orders表中的status状态改为paid(支付完成) 
            buyNow: 如果时立即购买提交的结算
                    需要接手的参数为：goodsId,购买数量，优惠券，以及留言

                1. 将用户提交的商品信息新增到buynow表中
                    1.2 拿到新建一行的buynowId
                    1.3  通过联合查询，查询出buynow表与goods表的商品价格信息
                    1.4 将查询出来的resulet1里的全部价格用一个变量存储起来（后期有其它优惠券计算啥的，直接跟该变量进行计算）
                2. 将订单信息新增到orders表中，记录用户下单
                    2.1 order_items表：新增用户下单的商品信息
                3. 支付（余额减去商品总价格）
                    直接跟cart支付场景一样（都是余额支付）
                    最后支付成功，将orders表中的订单status的状态改为paid（支付完成）
                    注意：buyNow不要跟新数量，因为一开始用户携带的下单信息是直接新增到buynow表中的

        */


## 用户信息与用户下单信息
### 返回对应的用户信息
    1. 创建api  响应客户端用户的基本信息
        脱敏手机号
        昵称
        账户余额
### 响应订单信息
    思路：根据携带的不同参数类型响应不同的商品数据
    参数有： 全部：all  待付款：payment  代发货：delivery  待收货：received  退待评价  退款/售后：refund   待评价：evaluated
    全部：all  待付款：pending  待发货 paid  待收货： shipped   退款： completed    评价：暂无
     2. 根据客户端携带过来的type类型 获取对应订单信息 响应给客户端
       思路：判断type类型是否为all 如果为all 将所有的type类型以数组的形式赋值给type  如果不是，则无需重新赋值：
            1.先将所有的订单查询出来（为数组）
            2.通过订单表id查询order_items商品(通过订单id查询对应的订单商品订单商品)
               2.1 分别获取buyNow与carts的id -----由于查询出来的数据的是所有的商品，需要进行抽离，将buynow与cart的商品进行抽离，分别放在不同的数组中(buyNowIds与cartIds)
               2.2再通过对应的id查询表中的商品数据（buyNowData与cartsData）
               2.3 最后将查询出来的商品数据进行合并（mergeArray）
            3. 将result1(订单下的商品（oreder_items表）)与mergeArray与 result(order订单表)  进行合并
            4.最后通过：
                const handleData = results.map(order => {
                return mergedData.filter(item => item.order_id === order.id)
            })
            该handleData 常量接收 处理好数据结构（最后要响应给客户端的数据）
        
    3. 根据不同的type（除all）响应不同的数据
