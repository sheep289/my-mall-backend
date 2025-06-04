const db = require("../db/mysql2")
const { array } = require("joi")
require("dotenv").config() //加载配置环境
// 1.响应订单商品
exports.checkoutOrderhandle = async (req, res) => {
  try {
    // 从token中拿到用户id
    const userId = req.auth.id

    const mode = req.query.mode || req.body.mode
    /* 客户端需要携带 购物车id/商品id(取决于mode类型是buyNow,cart) 
            buyNow: 需要携带参数: userId goodsId 商品规格，商品数量
            cart: 需要携带参数 ： userid cartId  
        */

    if (mode === "buyNow") {
      const goodsId = parseInt(req.query.goodsId) || parseInt(req.body.goodsId)
      const specValueIds = req.query.specValueIds || req.body.specValueIds
      const quantity =
        parseInt(req.query.quantity) || parseInt(req.body.quantity)

      //用户端携带立即购买相应的商品参数响应对应的商品信息 （mode,goodsId,规格，数量）
      if (!specValueIds) return res.cc("请选择规格")

        
        // 将specValueIds里面的每个元素转换为整数
      //   const specIds = specValueIds.map((item) => {
      //     const num = parseInt(item)
      //     if (isNaN(num)) throw new Error("规格ID必须是数字")
      //     return num
      //   })
      const specIds = specValueIds.map(Number)
      if (!goodsId || !Array.isArray(specIds) || specIds.length === 0)
        return res.cc("参数错误")

      // 查询商品基本信息
      const [goodsRows] = await db.query(
        "SELECT id, title, main_image FROM goods WHERE id = ?",
        [goodsId]
      )
      if (!goodsRows.length) return res.cc("商品不存在")
      const goods = goodsRows[0]

      // 查询规格信息
      const placeholders = specIds.map(() => "?").join(",")
      const [specRows] = await db.query(
        `SELECT gs.id, gs.spec_id, gs.value, gs.price, gs.image_url, s.name
       FROM goods_specs gs
       LEFT JOIN specs s ON gs.spec_id = s.id
       WHERE gs.id IN (${placeholders}) AND gs.goods_id = ?`,
        [...specIds, goodsId]
      )
      if (!specRows.length) return res.cc("规格不存在")

      // 取价格
      const price = parseFloat(specRows[specRows.length - 1].price)
      const total_price = price * quantity

      // 取颜色图片
      const colorSpec = specRows.find((item) => item.spec_id === 1)
      const color_image = colorSpec ? colorSpec.image_url : null

      //  组装规格名称与值
      const names = specRows.map((item) => item.name)
      const values = specRows.map((item) => item.value)

      const handleData = {
        goods_id: goods.id,
        goods_title: goods.title,
        goods_coverImg: process.env.baseUrl + goods.main_image,

        color_image: color_image ? process.env.baseUrl + color_image : null,
        name: names,
        value: values,
        price,
        total_price,
        quantity,
      }

      res.send({
        status: 0,
        mode: "buyNow",
        data: [handleData],
      })
    } else if (mode === "cart") {
      // 如果是通过购物车结算,这订单信息内容直接从carts表中获取并响应
      // 1.获取携带的参数
      const cartIds = req.body.cartIds || req.query.cartIds
      // 1.1占位符数量 (根据数组长度也就是需查看cartId的个数生成对应的占位符)
      if (!Array.isArray(cartIds)) return res.cc("获取失败，请重试")
      const placeholders = cartIds.map(() => "?").join(",")

      // 查询购物车商品基本信息
      const getCarDatatDql = `
        select
            c.id AS cart_id,
            c.goods_id,
            g.title AS goods_title,
            c.quantity,
            g.main_image goods_coverImg,
            c.specs
        from carts c
            left join goods g on c.goods_id = g.id
        WHERE c.user_id = ? AND c.id in (${placeholders})
            ORDER BY c.id DESC
        `
      const [cartRows] = await db.query(getCarDatatDql, [userId, ...cartIds])

      // 组装每个商品的规格信息
      const results = []
      for (const cart of cartRows) {
        // 解析规格ID数组
        let specValueIds = []
        try {
          // specs字段存储为JSON对象，如：{"color": 1, "memory": 2}
          const specs =
            typeof cart.specs === "string" ? JSON.parse(cart.specs) : cart.specs
          specValueIds = Object.values(specs).map(Number)
        } catch (e) {
          return res.cc("购物车商品规格格式错误")
        }
        if (!Array.isArray(specValueIds) || specValueIds.length === 0) {
          return res.cc("购物车商品规格缺失")
        }

        // 查询规格详情
        const placeholders2 = specValueIds.map(() => "?").join(",")
        const [specRows] = await db.query(
          `SELECT gs.id, gs.spec_id, gs.value, gs.price, gs.image_url, s.name
         FROM goods_specs gs
         LEFT JOIN specs s ON gs.spec_id = s.id
         WHERE gs.id IN (${placeholders2}) AND gs.goods_id = ?`,
          [...specValueIds, cart.goods_id]
        )
        if (!specRows.length) return res.cc("购物车商品规格不存在")

        // 取价格
        const price = specRows[specRows.length - 1].price
        const total_price = price * cart.quantity

        // 取颜色图片
        const colorSpec = specRows.find((item) => item.spec_id === 1)
        const color_image = colorSpec ? colorSpec.image_url : null

        // 组装规格名称与值
        const names = specRows.map((item) => item.name)
        const values = specRows.map((item) => item.value)

        results.push({
          cart_id: cart.cart_id,
          goods_id: cart.goods_id,
          goods_title: cart.goods_title,
          goods_coverImg: process.env.baseUrl + cart.goods_coverImg,
          color_image: color_image ? process.env.baseUrl + color_image : null,
          name: names,
          value: values,
          price,
          total_price,
          quantity: cart.quantity,
        })
      }
      res.send({
        status: 0,
        mode: "cart",
        data: results,
      })
    } else {
      return res.cc("请选择商品")
    }
  } catch (error) {
    console.error("数据库错误详情:", error)
    res.cc("获取失败，请重试")
  }
}
exports.handelPayMode = async (req, res) => {
  try {
    const userId = req.auth.id

    // 1.查询支付类型
    const getPayModeDql = ` SELECT * FROM pay_mode;`
    const [results1] = await db.query(getPayModeDql)

    // 2.查询用户余额
    const balanceDql = `
            SELECT
                ub.user_id,
                pm.id as 'pay_mode_id',
                ub.balance AS 'balance'
            FROM
                user_balances ub
                JOIN users u ON ub.user_id = u.id
                JOIN pay_mode pm ON ub.pay_mode_id = pm.id
            WHERE
                ub.user_id = ?;
            `

    const [results2] = await db.query(balanceDql, userId)

    // 3.1将数组装换为对象
    const obj = results2.find((item) => item.user_id === userId)
    // 3.2获取支付方式的索引（将查询出来的用户余额里的pay_mode_id与支付方式里的id进行比较）
    const index = results1.findIndex((item) => item.id === obj.pay_mode_id)

    // 3.3将余额赋值到对应的支付方式低下
    results1[index].balance = obj.balance

    results1.forEach(
      (item) => (item.type_image = process.env.baseUrl + item.type_image)
    )

    res.send({
      status: 0,
      data: results1,
    })
  } catch (error) {
    console.error("数据库错误详情:", error)
  }
}

exports.handleSubmit = async (req, res) => {
  let connection; // 声明connection变量用于事务处理
  
  try {
    const userId = req.auth.id
    const mode = req.query.mode || req.body.mode
    const payModeId = req.body.pay_mode_id

    // 获取数据库连接并开始事务
    connection = await db.getConnection()
    await connection.beginTransaction()

    // 获取用户余额
    const [user_balance] = await connection.query(`SELECT * FROM user_balances WHERE user_id = ?`, [userId])
    const obj = user_balance.find((item) => item.user_id === userId)

    // 如果客户端选择的支付方式不等1（余额支付），则结束程序（因为其它支付方式暂未开通，只支持余额支付）
    if (payModeId !== obj.pay_mode_id) {
      await connection.rollback()
      return res.cc("暂未开通")
    }

    // 处理不同类型订单支付场景
    if (mode === "cart") {
      const { cartIds, quantitys } = req.body || req.query
      // 数据验证
      if (!Array.isArray(cartIds)) {
        await connection.rollback()
        return res.cc("获取失败，请重试")
      }
      for (const item of quantitys) {
        if (!item.id || item.quantity === undefined || item.quantity < 0) {
          await connection.rollback()
          return res.cc("数据错误")
        }
      }

      const placeholders = cartIds.map(() => "?").join(",")
      // 提取所有 id 和生成 CASE WHEN 条件
      const ids = quantitys.map((item) => item.id)
      const cases = quantitys
        .map((item) => `WHEN ${item.id} THEN ${item.quantity}`)
        .join(" ")

      // 动态生成 SQL
      const sql = `
                UPDATE carts
                SET quantity = CASE id ${cases} END,
                status = 1,deleted_at = NOW()
                WHERE id IN (?) AND user_id = ?
                `
      // 执行批量更新
      await connection.query(sql, [ids, userId])

      // 1 .根据cartId查询基本的 购物车信息
      const [cartRows] = await connection.query(
        `
        select c.id as 'cart_id',
                c.quantity,
                c.specs,
                c.goods_id
            from carts c
            where c.user_id = ? and c.id in (${placeholders})
                `,
        [userId, ...cartIds]
      )
      const result = []
      for (const cart of cartRows) {
        let specValueIds = []
        try {
          const specs =
            typeof cart.specs === "string" ? JSON.parse(cart.specs) : cart.specs
          specValueIds = Object.values(specs).map(Number)
        } catch (e) {
          await connection.rollback()
          return res.cc("购物车商品规格格式错误")
        }
        const placeholders2 = specValueIds.map(() => "?").join(",")
        const [specRows] = await connection.query(
          `SELECT gs.id, gs.spec_id, gs.value, gs.price, gs.image_url, s.name
         FROM goods_specs gs
         LEFT JOIN specs s ON gs.spec_id = s.id
         WHERE gs.id IN (${placeholders2}) AND gs.goods_id = ?`,
          [...specValueIds, cart.goods_id]
        )
        if (!specRows.length) {
          await connection.rollback()
          return res.cc("购物车商品规格不存在")
        }

        // 销量增加
        await connection.query(
          `UPDATE goods 
       SET sales = sales + ? 
       WHERE id = ?`,
          [cart.quantity, cart.goods_id]
        )

        // 库存减少
        await connection.query(
          `UPDATE goods_specs 
       SET stock = stock - ? 
       WHERE id IN (${placeholders2}) AND stock >= ?`,
          [cart.quantity, ...specValueIds, cart.goods_id, cart.quantity]
        )
        // 取价格
        const price = parseFloat(specRows[specRows.length - 1].price)
        const total_price = price * cart.quantity

        result.push({
          cart_id: cart.cart_id,
          goods_id: cart.goods_id,
          price,
          total_price,
          quantity: cart.quantity,
        })
      }

      const totalAmount = result.reduce(
        (sum, item) => sum + parseFloat(item.total_price),
        0
      )

      // 后续如果添加优惠券等金额，直接拿toatalAmount 进行计算
      // 3记录用户下单信息 (用户id 全部金额)
      const [newRows] = await connection.query(
        `insert into orders (user_id, total_amount, status) values (?,?,?)`,
        [userId, totalAmount, 'pending']
      )
      const orderId = newRows.insertId

      // 生成订单号 (ORD + 年份后两位 + 8位自增ID)
      const now = new Date()
      const year = now.getFullYear().toString().substr(2)
      const sequence = orderId.toString().padStart(8, '0')
      const orderNo = `ORD${year}${sequence}`

      // 更新订单号
      await connection.query(
        `update orders set order_no = ? where id = ?`,
        [orderNo, orderId]
      )

      const dql3 = `insert into order_items (order_id, goods_id, pay_price, mode, mode_id) values ? `
      await connection.query(dql3, [
        result.map((item) => [
          orderId,
          item.goods_id,
          item.price,
          mode,
          item.cart_id,
        ]),
      ])

      // 4.结算操作（后续添加密码功能）
      if (payModeId === obj.pay_mode_id) {
        if (obj.balance < totalAmount) {
          await connection.rollback()
          return res.cc("余额不足")
        }
        // 4.3
        await connection.query(
          "UPDATE user_balances SET balance = balance - ? WHERE user_id = ?",
          [totalAmount, userId]
        )

        // 4.4
        const dql5 = `update orders set status = 'paid' where id = ?`
        await connection.query(dql5, [orderId])

        // 提交事务
        await connection.commit()

        res.send({
          status: 0,
          message: "扣款成功",
          data: {
            orderId,
            orderNo,
            totalAmount
          }
        })
      }
    } else if (mode === "buyNow") {
      // 获取客户端携带的表单信息
      const goodsId = parseInt(req.body.goodsId)
      const specValueIds = JSON.stringify(req.body.specValueIds)
      const quantity = parseInt(req.body.quantity)
      // 校验
      if (!specValueIds) {
        await connection.rollback()
        return res.cc("请选择规格")
      }

      // 新增
      const [newRows] = await connection.query(
        `insert into buynow (goods_id, user_id, quantity, specs) values (?,?,?,?)`,
        [goodsId, userId, quantity, specValueIds]
      )
      const buyNowId = newRows.insertId

      const [buynowRows] = await connection.query(
        `
            select *
                from buynow b
                where b.id = ?
            `,
        [buyNowId]
      )

      const placeholders = buynowRows[0].specs.map(() => "?").join(",")

      const [specRows] = await connection.query(
        `
            SELECT gs.id, gs.spec_id, gs.value, gs.price, gs.image_url, s.name
            FROM goods_specs gs
            LEFT JOIN specs s ON gs.spec_id = s.id
            WHERE gs.id IN (${placeholders}) AND gs.goods_id = ?
            `,
        [...buynowRows[0].specs, goodsId]
      )

      if (!specRows.length) {
        await connection.rollback()
        return res.cc("规格不存在")
      }
      const price = parseFloat(specRows[specRows.length - 1].price)
      const total_amount = price * quantity

      // 记录用户下单信息
      const [newRows2] = await connection.query(
        `insert into orders (user_id, total_amount, status) values (?,?,?)`,
        [userId, total_amount, 'pending']
      )
      const orderId = newRows2.insertId

      // 生成订单号
      const now = new Date()
      const year = now.getFullYear().toString().substr(2)
      const sequence = orderId.toString().padStart(8, '0')
      const orderNo = `ORD${year}${sequence}`

      // 更新订单号
      await connection.query(
        `update orders set order_no = ? where id = ?`,
        [orderNo, orderId]
      )

      // 记录订单表下的商品信息
      await connection.query(
        `insert into order_items (order_id, goods_id, pay_price, mode, mode_id) values (?,?,?,?,?)`,
        [orderId, goodsId, price, mode, buyNowId]
      )

      // 3.支付操作（处理余额支付场景）
      if (payModeId === obj.pay_mode_id) {
        if (obj.balance < total_amount) {
          await connection.rollback()
          return res.cc("余额不足")
        }
        await connection.query(
          "UPDATE user_balances SET balance = balance - ? WHERE user_id = ?",
          [total_amount, userId]
        )

        await connection.query(`update orders set status = 'paid' where id = ?`, [
          orderId,
        ])

        // 销量增加
        await connection.query(
          `UPDATE goods 
       SET sales = sales + ? 
       WHERE id = ?`,
          [quantity, goodsId]
        )
        // 库存减少
        await connection.query(
          `UPDATE goods_specs 
       SET stock = stock - ? 
       WHERE id IN (${placeholders}) AND stock >= ?`,
          [quantity, ...buynowRows[0].specs, quantity]
        )

        // 提交事务
        await connection.commit()

        res.send({
          status: 0,
          message: "扣款成功",
          data: {
            orderId,
            orderNo,
            totalAmount: total_amount
          }
        })
      }
    } else {
      await connection.rollback()
      return res.cc("请选择商品")
    }
  } catch (error) {
    console.error("数据库错误详情:", error)
    if (connection) await connection.rollback()
    res.cc("订单创建失败，请重试")
  } finally {
    if (connection) connection.release()
  }
}
