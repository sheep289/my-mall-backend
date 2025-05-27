const db = require("../db/mysql2")

exports.handleAddGoods = async (req, res) => {
  try {
    // 1. 验证必需字段
    if (!req.body.title || !req.files?.mainImage) {
      return res.status(400).json({
        code: 400,
        message: "商品标题和主图不能为空",
      })
    }

    // 2. 处理文件路径
    const filePaths = {
      mainImage: "goods_img/" + req.files.mainImage[0].filename,
      detailImages:
        req.files.detailImages?.map((file) => "goods_img/" + file.filename) ||
        [],
      pageImages:
        req.files.pageImages?.map((file) => "goods_img/" + file.filename) || [],
    }

    // 3. 准备商品数据
    const goodsData = {
      title: req.body.title,
      price: parseFloat(req.body.price),
      price_max: parseFloat(req.body.price_max) || parseFloat(req.body.price),
      description: req.body.description || "",
      category_id: parseInt(req.body.categoryId) || 0,
      specs: req.body.specs ? JSON.parse(req.body.specs) : [],
      stock: '',
    }

    // 4. 插入商品基本信息  specs数组里面的stock总合是goods表的stock
    const stock = goodsData.specs.reduce(
      (total, spec) => total + (parseInt(spec.stock) || 0),
      0
    )
    goodsData.stock = stock > 0 ? stock : 1000 // 如果没有规格，默认库存1000
    const insertGoodsSql = `
      INSERT INTO goods (title, price_min, price_max, description, main_image, stock)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    const [goodsResult] = await db.query(insertGoodsSql, [
      goodsData.title,
      goodsData.price,
      goodsData.price_max,
      goodsData.description,
      filePaths.mainImage,
      goodsData.stock,
    ])
    const goodsId = goodsResult.insertId

    // 5. 批量插入图片（修正后的关键部分）
    const insertImagesSql = `
      INSERT INTO goods_images (goods_id, url, type, index_num)
      VALUES ?
    `

    // 处理详情图
    if (filePaths.detailImages.length > 0) {
      const detailImagesBatch = filePaths.detailImages.map((url, index) => [
        goodsId,
        url,
        "detail",
        index + 1,
      ])
      await db.query(insertImagesSql, [detailImagesBatch])
    }

    // 处理详情页图
    if (filePaths.pageImages.length > 0) {
      const pageImagesBatch = filePaths.pageImages.map((url, index) => [
        goodsId,
        url,
        "detail_page",
        index + 1,
      ])
      await db.query(insertImagesSql, [pageImagesBatch])
    }

    // 6. 处理商品分类关联
    const insertCategorySql = `
      INSERT INTO goods_categories (goods_id, category_id)
      VALUES (?, ?)
    `
    await db.query(insertCategorySql, [goodsId, goodsData.category_id])

    // 7. 处理规格数据
    if (goodsData.specs.length > 0) {
      // 获取唯一规格名称
      const uniqueSpecNames = [
        ...new Set(goodsData.specs.map((spec) => spec.name)),
      ]

      // 插入或获取规格ID
      const specMap = new Map()
      const insertSpecSql = `
        INSERT INTO specs (name)
        VALUES (?)
        ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)
      `

      for (const name of uniqueSpecNames) {
        const [specResult] = await db.query(insertSpecSql, [name])
        const [rows] = await db.query("SELECT LAST_INSERT_ID() as id")
        specMap.set(name, rows[0].id)
      }

      // 插入商品规格
      const insertGoodsSpecsSql = `
        INSERT INTO goods_specs 
        (goods_id, spec_id, value, image_url, price, stock)
        VALUES (?, ?, ?, ?, ?, ?)
      `

      for (const spec of goodsData.specs) {
        await db.query(insertGoodsSpecsSql, [
          goodsId,
          specMap.get(spec.name),
          spec.value,
          spec.image_url || "",
          parseInt(spec.price) || 0,
          parseInt(spec.stock) || 1000,
        ])
      }
    }


    // 8. 返回成功响应
    res.send({
      status: 0,
      message: "商品添加成功",
      data: {
        id: goodsId,
        title: goodsData.title,
        imageUrls: filePaths,
      },
    })
  } catch (err) {
    console.error("添加商品失败:", err)
    res.send({
      status: 1,
      message:
        process.env.NODE_ENV === "development" ? err.message : "服务器内部错误",
    })
  }
}
