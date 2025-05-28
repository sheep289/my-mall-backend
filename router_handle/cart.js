const db = require("../db/mysql2")
require("dotenv").config() //加载配置环境
// 将商品添加到购物车接口
exports.cartHandle = async (req, res) => {
  try {
    const goodsId = parseInt(req.body.goodsId)
    const specValueIds = JSON.stringify(req.body.specValueIds)
    const quantity = parseInt(req.body.quantity)

    // 从token权证中拿到用户id
    const userId = req.auth.id

    // 3.1 对数据进行校验
    if (!goodsId || isNaN(goodsId))
      return res.cc("NaN或者NULL，请输入正确的goodsId")
    if (!specValueIds) return res.cc("请选择规格")
    if (isNaN(quantity)) return res.cc("NaN,该数据类型需为Number")

    // 当用户点击添加购物车时，需在数据库中记录该用户的添加的商品
    // 1.写入购物车表(cart) dql语句 （跟carts里的status状态关联）
    await db.query(
      `
            INSERT INTO carts (user_id, goods_id, specs, quantity)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            quantity = CASE WHEN status = 1 THEN VALUES(quantity) ELSE quantity + VALUES(quantity) END,
            status = 0,
            deleted_at = NULL
        `,
      [userId, goodsId, specValueIds, quantity]
    )

    // 2.查询用户的购物车所有商品数量
    const [godosNumRows] = await db.query(
      `
            select
            sum(c.quantity) as 'cart_total'
            from carts c
            join users u on c.user_id = u.id
            where u.id = ? and c.status = 0
            `,
      userId
    )

    const handleData = {
      ...godosNumRows[0],
    }

    res.send({
      status: 0,
      message: "添加成功",
      data: handleData,
    })
  } catch (err) {
    console.error("数据库错误详情:", err)
    res.cc("服务器内部错误")
  }
}
// 获取用户的购物车商品列表接口
exports.cartListHandle = async (req, res) => {
  try {
    const userId = req.auth.id

    // 1. 查询购物车商品基本信息
    const cartSql = `
      SELECT
        c.id AS cart_id,
        c.goods_id,
        g.title AS goods_title,
        c.quantity,
        g.main_image as goods_coverImg,
        c.specs
      FROM carts c
      LEFT JOIN goods g ON c.goods_id = g.id
      WHERE c.user_id = ? AND c.status = 0
      ORDER BY c.id DESC
    `
    const [cartRows] = await db.query(cartSql, [userId])

    // 2. 收集所有specs中的specValueIds
    let specIds = []
    cartRows.forEach((row) => {
      try {
        const specs =
          typeof row.specs === "string" ? JSON.parse(row.specs) : row.specs
        Object.values(specs).forEach((id) => {
          if (id && !specIds.includes(Number(id))) specIds.push(Number(id))
        })
      } catch (error) {}
    })

    let specRows = []
    if (specIds.length > 0) {
      const placeholders = specIds.map(() => "?").join(",")
      const specSql = `
        SELECT gs.id, gs.spec_id, gs.value, gs.price, gs.image_url, s.name
        FROM goods_specs gs
        LEFT JOIN specs s ON gs.spec_id = s.id
        WHERE gs.id IN (${placeholders})
      `
      const [rows] = await db.query(specSql, specIds)
      specRows = rows
    }

    // 3. 组装返回数据
    const results = cartRows.map((row) => {
      const specs =
        typeof row.specs === "string" ? JSON.parse(row.specs) : row.specs
      let value = []
      let name = []
      let price = 0
      let color_image = null

      Object.entries(specs).forEach(([specKey, specId]) => {
        const spec = specRows.find((s) => s.id === Number(specId))
        if (spec) {
          value.push(spec.value)
          name.push(spec.name)
          if (spec.price) price = Number(spec.price)
          if (spec.image_url && specKey === "color")
            color_image = spec.image_url
        }
      })

      return {
        cart_id: row.cart_id,
        goods_id: row.goods_id,
        goods_title: row.goods_title,
        quantity: row.quantity,
        goods_coverImg: process.env.baseUrl + row.goods_coverImg,
        value: value,
        name: name,
        total_price: price * row.quantity,
        price,
        color_image: color_image ? process.env.baseUrl + color_image : null,
      }
    })

    res.send({
      status: 0,
      data: results,
    })
  } catch (error) {
    console.error("数据库错误详情:", error)
    res.send({ status: 1, message: "服务器错误" })
  }
}

//更新购物车商品数量
exports.cartUpdateHandle = async (req, res) => {
  try {
    // 获取用户携带过来的购物车id与修改数量
    const cartId = parseInt(req.body.cartId)
    const quantity = parseInt(req.body.quantity)

    // 校验
    if (!cartId || isNaN(cartId)) return res.cc("请传入合法的购物车id")
    if (!quantity || isNaN(quantity)) return res.cc("数据类型错误，需为Number")
    // 用户id
    const userId = req.auth.id

    await db.query(
      `update carts set quantity = ? where id = ? and user_id = ?`,
      [quantity, cartId, userId]
    )
    res.send({
      status: 0,
      message: "succeed",
    })
  } catch (error) {
    console.error("数据库错误详情:", error)
    res.cc("服务器错误")
  }
}

// 删除购物车对应商品
exports.cartClearHandle = async (req, res) => {
  try {
    // 获取需要删除cartid(是一个数组)
    const cartIds = req.body.cartIds
    const userId = req.auth.id
    if (!Array.isArray(cartIds)) return res.cc("操作失败！")

    // 占位符数量
    const placeholders = cartIds.map(() => "?").join(",")
    // 这里不使用物理删除（直接删除） 而是逻辑删除（通过status标记）

    await db.query(
      `
        update carts set status = 1,deleted_at = NOW()
                    where user_id = ? and id in (${placeholders})
        `,
      [userId, ...cartIds]
    )
    res.send({
      status: 0,
      message: "succeed",
    })
  } catch (error) {
    console.error("数据库错误详情", error)
    res.cc("服务器错误")
  }
}
