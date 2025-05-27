const db2 = require("../db/mysql2")
const TIME = require("../utils/dateFormat")
const desensitization = require("../utils/desensitize")
require("dotenv").config()

exports.goodsDetailPageHandle = async (req, res) => {
  try {
    const goodsId = parseInt(req.query.goodsId) || parseInt(req.body.goodsId)
    if (!goodsId)
      return res.status(400).json({ status: 1, message: "未传goodsId" })

    // 1. 获取商品基础信息
    const [goods] = await db2.query(
      `
      SELECT id, title, price_min, price_max, 
             description, sales, stock, main_image
      FROM goods WHERE id = ?`,
      [goodsId]
    )

    if (!goods.length) {
      return res
        .status(404)
        .json({ status: 1, message: "商品不存在", data: null })
    }

    // 2. 获取图片
    const [images] = await db2.query(
      `
      SELECT url, type FROM goods_images 
      WHERE goods_id = ? ORDER BY type, index_num`,
      [goodsId]
    )

    // 3. 获取规格数据（
    const [specs] = await db2.query(
      `
      SELECT 
        s.id AS spec_id, s.name, s.type,
        gs.id, gs.value, gs.stock, gs.price, gs.image_url
      FROM goods_specs gs
      JOIN specs s ON gs.spec_id = s.id
      WHERE gs.goods_id = ?
      ORDER BY s.id, gs.id`,
      [goodsId]
    )

    const [combinedImages] = await db2.query(
      `
    SELECT 
      GROUP_CONCAT(url ORDER BY index_num SEPARATOR '||') AS combined_detail
    FROM goods_images
    WHERE goods_id = ? AND type = 'detail_page'
    GROUP BY type`,
      [goodsId]
    )

    // 4. 处理数据
    const processUrl = (url) => (url ? `${process.env.baseUrl}/${url}` : "")

    const response = {
      ...goods[0],
      main_image: processUrl(goods[0].main_image),
      detail_images: images
        .filter((i) => i.type === "detail")
        .map((i) => processUrl(i.url)),
      detail_page_images: images
        .filter((i) => i.type === "detail_page")
        .map((i) => processUrl(i.url)),
      specs: [],
      detail_page_combined: combinedImages[0]?.combined_detail
        ? `${process.env.baseUrl}/${combinedImages[0].combined_detail.replace(
            /\|\|/g,
            `||${process.env.baseUrl}/`
          )}`
        : "",
    }

    const specGroups = {}
    specs.forEach((item) => {
      if (!specGroups[item.spec_id]) {
        specGroups[item.spec_id] = {
          name: item.name,
          type: "text",
          specs_id: item.spec_id,
          values: [],
          color_image_url: [],
        }
      }

      const specValue = {
        id: item.id,
        value: item.value,
        stock: item.stock || 0,
        price: item.price || 0,
        image_url: item.image_url
          ? `${process.env.baseUrl}/${item.image_url}`
          : "",
      }

      specGroups[item.spec_id].values.push(specValue)
      if (item.image_url) {
        specGroups[item.spec_id].color_image_url.push(
          `${process.env.baseUrl}/${item.image_url}`
        )
      }
    })

    // 确保规格顺序固定：内存->颜色
    response.specs = Object.values(specGroups).sort((a, b) =>
      a.name === "内存" ? -1 : b.name === "内存" ? 1 : 0
    )

    res.json({
      status: 0,
      message: "success",
      data: response,
    })
  } catch (err) {
    console.error("数据库错误:", err)
    res.status(500).json({
      status: 1,
      message: "服务器内部错误",
      data: null,
    })
  }
}
// 商品评论接口
exports.goodsCommentHandle = async (req, res) => {
  try {
    const goodsId = parseInt(req.query.goodsId) || parseInt(req.body.goodsId)
    const limit = parseInt(req.query.limit) || 4

    if (!goodsId)
      return res.status(400).json({ status: 1, message: "未传goodsId" })

    const [comments] = await db2.query(
      `
      SELECT
        u.username, u.nickname AS nick_name,
        u.avatar AS head_portrait,
        u.default_avatar AS default_head_portrait,
        ugc.goods_id AS goodsID,
        ugc.goods_comment,
        ugc.comment_images,
        ugc.rating AS goods_rating,
        ugc.created_at AS comment_timer
      FROM users u
      JOIN users_goods_comment ugc ON u.id = ugc.user_id
      WHERE ugc.goods_id = ?
      ORDER BY ugc.rating DESC, ugc.created_at DESC
      LIMIT ?`,
      [goodsId, limit]
    )

    const result = comments.map((item) => {
      // 处理评论图片 (兼容字符串和数组)
      let images = []
      try {
        images =
          typeof item.comment_images === "string"
            ? JSON.parse(item.comment_images)
            : item.comment_images || []
      } catch (e) {
        images = []
      }

      return {
        ...item,
        comment_timer: TIME.dateFormat(item.comment_timer),
        username: desensitization.desensitizePhone(item.username),
        default_head_portrait: `${process.env.baseUrl}${item.default_head_portrait}`,
        head_portrait: item.head_portrait
          ? `${process.env.baseUrl}${item.head_portrait}`
          : null,
        comment_images: images
          .filter((img) => img && typeof img === "string")
          .map((img) =>
            img.startsWith("http") ? img : `${process.env.baseUrl}${img}`
          ),
      }
    })

    res.json({
      status: 0,
      message: "success",
      data: result,
    })
  } catch (err) {
    console.error("数据库错误:", err)
    res.status(500).json({ status: 1, message: "服务器内部错误" })
  }
}
