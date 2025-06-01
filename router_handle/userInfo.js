const db = require("../db/mysql2")
const { desensitizePhone } = require("../utils/desensitize")
require("dotenv").config() //加载配置环境
const time = require("../utils/dateFormat")
// 获取用户界面信息
exports.handleUserInfo = async (req, res) => {
  try {
    const userId = req.auth.id
    const dlq = `
        select u.id as 'user_id',
           ub.balance,
           u.username as 'mobile',
           u.nickname,
           u.role,
           u.avatar,
           u.default_avatar
        from users u
        join user_balances ub on u.id = ub.user_id
        where id = ?;
            `
    const [results] = await db.query(dlq, [userId])    
    // 将订单状态响应给回去
    const handleUserInfo = {
      ...results[0],
      mobile: desensitizePhone(results[0].mobile),
      default_avatar: process.env.baseUrl + results[0].default_avatar,
      avatar: results[0].avatar ? process.env.baseUrl + results[0].avatar : "",
    }

    res.send({
      status: 0,
      data: handleUserInfo,
    })
  } catch (error) {
    console.error("数据库错误详情:", error)
  }
}

// 用户订单信息
exports.handleOrderList = async (req, res) => {
  const userId = req.auth.id
  // 判断type类型是否为all 如果为all 将所有的type类型以数组的形式赋值给type  如果不是，则无需重新赋值
  const [rows] = await db.query(
    `select JSON_ARRAYAGG(type) as 'type' from  order_status`
  )
  const type = req.query.type || req.body.type
  // ["pending", "paid", "shipped", "completed", "canceled"]
  rows[0].type.push("cancelled")
  const newType = type === "all" ? rows[0].type : [type]

  const placeholders9 = newType.map(() => "?").join(",")

  try {
    // 1.查询所有订单
    const dql1 = `
                select
                    *
                from orders
                where user_id = ? and order_state = 0 and status in (${placeholders9}) 
                order by created_at desc
                limit 30
            `

    const [results] = await db.query(dql1, [userId, ...newType])

    // ————————————————————————————————————————上面正常
    
    if (results.length <= 0) {
      return res.send({
        status: 0,
        data: [],
      })
    }

    // 1.2 将时间格式化与order订单状态转换
    results.forEach((item) => {
      item.created_at = time.dateFormat(item.created_at)
      if (item.status === "pending") {
        item.status_text = "待支付"
      } else if (item.status === "paid") {
        item.status_text = "待发货"
      } else if (item.status === "shipped") {
        item.status_text = "已发货"
      } else if (item.status === "completed") {
        item.status_text = "已完成"
      } else if (item.status === "cancelled") {
        item.status_text = "取消了"
      } else if (item.status === "refund") {
        item.status_text = "退款/售后"
      } else {
        item.status_text = "暂无"
      }
    })

    // 2.获取订单表的id
    const handleRst = results.map((item) => item.id)
    
    const placeholders = handleRst.map(() => "?").join(",")
    // 3.通过订单表id查询order_items商品(通过订单id查询对应的订单商品订单商品)
    const dql2 = `SELECT * FROM order_items WHERE order_id IN (${placeholders})`

    const [results1] = await db.query(dql2, [...handleRst])

    /*  4.将order_items查询出来的数据进行帅选 (拿到每个类型的Ids)
                     dql4
                   4.2再通过buyNowIds 去查找对应的buynow表（获取对应的商品信息）

                5.通过cartIds 查询出购物车的商品数据 
                     dql5
             */

    const buyNowIds = results1
      .filter((item) => item.mode === "buyNow")
      .map((modeId) => modeId.mode_id)
    const placeholders2 = buyNowIds.map(() => "?").join(",")

    let buyNowData = []

    if (buyNowIds.length > 0) {
      // 查询立即购买商品信息
      const dql4 = `
        SELECT
          g.id AS goods_id,
          b.id AS buyNow_id,
          b.quantity,
          b.specs,
          g.title AS goods_title,
          g.main_image AS goods_coverImg
        FROM goods g
        LEFT JOIN buynow b ON g.id = b.goods_id
        WHERE b.id IN (${placeholders2})
        GROUP BY b.id
      `
      const [buyNowRows] = await db.query(dql4, [...buyNowIds])

      // 解析每个立即购买商品的规格信息
      for (const item of buyNowRows) {
        let specIds = []
        try {
          // specs 可能是JSON字符串或对象
          const specsObj = typeof item.specs === "string" ? JSON.parse(item.specs) : item.specs
          specIds = Object.values(specsObj).map(Number).filter(Boolean)
        } catch (e) {
          specIds = []
        }
        if (specIds.length > 0) {
          const placeholders = specIds.map(() => "?").join(",")
          const [specRows] = await db.query(
        `SELECT gs.id, gs.spec_id, gs.value, gs.price, gs.image_url, s.name
         FROM goods_specs gs
         LEFT JOIN specs s ON gs.spec_id = s.id
         WHERE gs.id IN (${placeholders}) AND gs.goods_id = ?`,
        [...specIds, item.goods_id]
          )
          // 取价格
          const price = specRows.length ? parseFloat(specRows[specRows.length - 1].price) : 0
          const total_price = price * item.quantity
          // 取颜色图片
          const colorSpec = specRows.find((row) => row.spec_id === 1)
          const color_image = colorSpec ? colorSpec.image_url : null
          // 组装规格名称与值
          const names = specRows.map((row) => row.name)
          const values = specRows.map((row) => row.value)
          // 合并规格信息到item
          item.price = price
          item.total_price = total_price
          item.color_image = color_image ? process.env.baseUrl + color_image : null
          item.name = names
          item.value = values

        } else {
          item.price = 0
          item.total_price = 0
          item.color_image = null
          item.name = []
          item.value = []
        }
        item.goods_coverImg = process.env.baseUrl + item.goods_coverImg
      }
      buyNowData = buyNowRows
    }    
    

    const cartIds = results1
      .filter((item) => item.mode === "cart")
      .map((modeId) => modeId.mode_id)
    const placeholders3 = cartIds.map(() => "?").join(",")
    let cartsData = []
    if (cartIds.length > 0) {
      // 查询购物车商品信息
      const dql5 = `
      SELECT
        g.id AS goods_id,
        c.id AS cart_id,
        c.quantity,
        c.specs,
        g.title AS goods_title,
        g.main_image AS goods_coverImg
      FROM goods g
      LEFT JOIN carts c ON g.id = c.goods_id
      WHERE c.id IN (${placeholders3})
      GROUP BY c.id
      `
      const [cartRows] = await db.query(dql5, [...cartIds])

      // 解析每个购物车商品的规格信息
      for (const item of cartRows) {
      let specIds = []
      try {
        // specs 可能是JSON字符串或对象
        const specsObj = typeof item.specs === "string" ? JSON.parse(item.specs) : item.specs
        specIds = Object.values(specsObj).map(Number).filter(Boolean)
      } catch (e) {
        specIds = []
      }
      if (specIds.length > 0) {
        const placeholders = specIds.map(() => "?").join(",")
        const [specRows] = await db.query(
        `SELECT gs.id, gs.spec_id, gs.value, gs.price, gs.image_url, s.name
         FROM goods_specs gs
         LEFT JOIN specs s ON gs.spec_id = s.id
         WHERE gs.id IN (${placeholders}) AND gs.goods_id = ?`,
        [...specIds, item.goods_id]
        )
        // 取价格
        const price = specRows.length ? parseFloat(specRows[specRows.length - 1].price) : 0
        const total_price = price * item.quantity
        // 取颜色图片
        const colorSpec = specRows.find((row) => row.spec_id === 1)
        const color_image = colorSpec ? colorSpec.image_url : null
        // 组装规格名称与值
        const names = specRows.map((row) => row.name)
        const values = specRows.map((row) => row.value)
        // 合并规格信息到item
        item.price = price
        item.total_price = total_price
        item.color_image = color_image ? process.env.baseUrl + color_image : null
        item.name = names
        item.value = values
      } else {
        item.price = 0
        item.total_price = 0
        item.color_image = null
        item.name = []
        item.value = []
      }
      item.goods_coverImg = process.env.baseUrl + item.goods_coverImg
      }
      cartsData = cartRows
    }

    // 6.合并buyNowData与cartsData (合并2个数组)
    const mergeArray = [...buyNowData, ...cartsData]

    // 7.数据合并逻辑
    const mergedData = results1.map((item) => {
      // 根据 mode 类型确定匹配字段
      const idField = item.mode === "cart" ? "cart_id" : "buyNow_id"

      // 模式类型 + ID 值
      const matchedDetail = mergeArray.find(
        (detail) => detail[idField] === item.mode_id
      )

      // 将订单表（order）与result1（order_items）表进行 匹配
      const arr = results.find((orderId) => orderId.id === item.order_id)


      return {
        ...item,
        ...arr,
        goods_title: matchedDetail?.goods_title,
        goods_coverImg: matchedDetail?.goods_coverImg,
        color_image: matchedDetail?.color_image,
        quantity: matchedDetail?.quantity,
        name: matchedDetail?.name,
        value:matchedDetail?.value,
        specValueIds: matchedDetail?.specs,
        cart_id: matchedDetail?.cart_id,
        specValueIds:matchedDetail?.specs
      }
    })

    // 8. handleData 里是已经处理好的数据结构 只需要将里面的数据替换为购物车或者立即购买的数据
    const handleData = results.map((order) => {
      return mergedData.filter((item) => item.order_id === order.id)
    })
    res.send({
      status: 0,
      data: handleData,
    })
  } catch (error) {
    console.error("数据库错误详情:", error)
  }
}

// 用户取消订单接口
exports.handleCancelOrder = async (req, res) => {
  const userId = req.auth.id
  const { orderId } = req.body
  try {
    await db.query(
      `update orders set status = 'cancelled' ,created_at = now() where user_id = ? and id = ?`,
      [userId, orderId]
    )
    // 获取购买时的价格
    const [buyPrice] = await db.query(
      `select total_amount from orders where  user_id = ? and id = ?`,
      [userId, orderId]
    )
    // 用户的余额加上价格（退款）
    await db.query(
      `update user_balances set balance = balance + ? where user_id = ?`,
      [parseFloat(buyPrice[0].total_amount), userId]
    )

    res.send({
      status: 0,
      message: "success",
    })
  } catch (error) {
    console.error("数据库错误详情:", error)
  }
}

// 逻辑删除订单
exports.handleOrderDelete = async (req, res) => {
  try {
    const userId = req.auth.id
    // 要删除的订单id
    const { orderId } = req.body

    db.query(`update orders set order_state = 1 where user_id = ? and id = ?`, [
      userId,
      orderId,
    ])
    res.send({
      status:0,
      message:'删除成功'
    })
  } catch (error) {
    console.error("数据库错误详情:", error)
  }
}
