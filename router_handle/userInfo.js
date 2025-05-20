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
                where user_id = ? and status in (${placeholders9}) 
                and order_state = 0
                order by created_at desc
                limit 10
            `

    const [results] = await db.query(dql1, [userId, ...newType])
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
      const dql4 = `
                select
                       g.id as 'goods_id',
                       b.id as 'buyNow_id',
                       b.quantity,
                       b.specs,
                       g.title as 'goods_title',
                       gi.url as 'goods_coverImg',
                       gs.image_url 'color_image',
                   (SELECT value FROM goods_specs
                       WHERE goods_id = g.id
                           AND spec_id = 1
                           AND id = JSON_UNQUOTE(JSON_EXTRACT(b.specs, '$.color'))) AS color_name,
                   (SELECT value FROM goods_specs
                       WHERE goods_id = g.id
                           AND spec_id = 2
                           AND id = JSON_UNQUOTE(JSON_EXTRACT(b.specs, '$.memory'))) AS memory_name
                       from
                       goods g
                   left join goods_images gi on g.id = gi.goods_id
                   left join goods_specs gs on g.id = gs.goods_id
                   left join  buynow b on g.id = b.goods_id
                   where gi.type = 'cover' and b.id in (${placeholders2})
                   group by b.id;
                   `

      const [results] = await db.query(dql4, [...buyNowIds])
      buyNowData = results
    }

    const cartIds = results1
      .filter((item) => item.mode === "cart")
      .map((modeId) => modeId.mode_id)
    const placeholders3 = cartIds.map(() => "?").join(",")

    let cartsData = []
    if (cartIds.length > 0) {
      const dql5 = `
                SELECT
                c.id AS cart_id,
                c.goods_id,
                g.title AS goods_title,
                c.quantity,
                gi.url goods_coverImg,
                color_gs.image_url AS color_image,
                color_gs.value AS color_name,
                memory_gs.value AS memory_name
                FROM carts c
                JOIN goods g ON c.goods_id = g.id
                LEFT JOIN goods_specs color_gs
                ON color_gs.id = JSON_UNQUOTE(JSON_EXTRACT(c.specs, '$.color'))
                AND color_gs.goods_id = c.goods_id
                AND color_gs.spec_id = 1
                LEFT JOIN goods_specs memory_gs
                ON memory_gs.id = JSON_UNQUOTE(JSON_EXTRACT(c.specs, '$.memory'))
                AND memory_gs.goods_id = c.goods_id
                AND memory_gs.spec_id = 2
                JOIN goods_images gi ON g.id = gi.goods_id
                AND gi.type = 'cover'
                WHERE c.user_id = ? AND c.id in (${placeholders3})
            `
      const [results] = await db.query(dql5, [userId, ...cartIds])
      cartsData = results
    }

    // 6.合并buyNowData与cartsData (合并2个数组)
    const mergeArray = [...buyNowData, ...cartsData]

    // 7.数据合并逻辑
    const mergedData = results1.map((item) => {
      // 根据 mode 类型确定匹配字段
      const idField = item.mode === "cart" ? "cart_id" : "buyNow_id"

      // 严格匹配：模式类型 + ID 值
      const matchedDetail = mergeArray.find(
        (detail) => detail[idField] === item.mode_id
      )

      // 将订单表（order）与result1（order_items）表进行 匹配
      const arr = results.find((orderId) => orderId.id === item.order_id)

      // 合并核心字段和商品详情（未匹配时保留原始数据）

      return {
        ...item,
        ...arr,
        goods_title: matchedDetail?.goods_title,
        goods_coverImg: matchedDetail?.goods_coverImg,
        color_image: matchedDetail?.color_image,
        quantity: matchedDetail?.quantity,
        color_name: matchedDetail?.color_name,
        memory_name: matchedDetail?.memory_name,
        specValueIds: matchedDetail?.specs,
        cart_id: matchedDetail?.cart_id,
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
