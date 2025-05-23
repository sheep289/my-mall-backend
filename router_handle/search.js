const db = require("../db/mysql2")
require("dotenv").config() //加载配置环境
//搜索查询

exports.handleSearchSelect = async (req, res) => {
  // 默认页码为1
  const limit = parseInt(req.query.limit) || 50
  const keyword = req.query.keyword || ""
  const categoryId = parseInt(req.query.categoryId) || ""
  try {
    if (keyword) {
      // 通过搜索查询

      const dql = `
     select g.id,
        g.title,
        g.price_min,
        g.main_image as 'goods_cover_image',
        g.price_max,
        g.stock,
        g.sales,
        g.id as 'goods_id'
            from goods g
            left join goods_categories gc on g.id = gc.goods_id
            left join categories c on gc.category_id = c.id
            where g.title like ? or c.name like  ?
            group by g.id
            `
      const [results] = await db.query(dql, [`%${keyword}%`, `%${keyword}%`])
      results.forEach(
        (item) =>
          (item.goods_cover_image =
            process.env.baseUrl + item.goods_cover_image)
      )
      res.send({
        status: 0,
        data: results,
      })
    } else {
      const dql2 = `
           select g.id,
            g.title,
            g.price_min,
            g.price_max,
            g.main_image as 'goods_cover_image',
            g.stock,
            g.sales,
            g.id as 'goods_id' 
                FROM goods g
                JOIN goods_categories gc ON g.id = gc.goods_id
                WHERE gc.category_id = ?;
        `
      const [results] = await db.query(dql2, [categoryId])
      results.forEach(
        (item) =>
          (item.goods_cover_image =
            process.env.baseUrl + item.goods_cover_image)
      )
      res.send({
        status: 0,
        data: results,
      })
    }
  } catch (error) {
    console.error("数据库错误详情:", error)
  }
}

// 分类
exports.handleCategory = async (req, res) => {
  try {
    /* 
        1.先查询到所有的一级分类
        2. 查询所有的二级分类
        */
    const [results1] = await db.query(
      `select * from categories where level = 1`
    )
    const [results2] = await db.query(
      `select * from categories where level = 2`
    )

    const handleData = results1.map((item) => ({
      ...item,
      children: results2.filter((child) => item.id === child.parent_id),
    }))

    handleData.forEach((element) => {
      element.children.forEach(
        (item) => (item.image = process.env.baseUrl + item.image)
      )
    })

    res.send({
      status: 0,
      data: handleData,
    })
  } catch (error) {
    console.error("数据库错误详情", error)
  }
}
// 热销
exports.handleCategoryProducts = async (req,res) => {
  const type = req.query.type
  try{
    const [results] = await db.query(`
      SELECT g.title AS goods_title,
        g.id,
        g.main_image as 'goods_cover_image',
        g.price_min
        FROM goods g
        JOIN goods_categories gc ON g.id = gc.goods_id
        JOIN categories c ON gc.category_id = c.id
        where c.name = ?
        order by g.sales desc
        limit 2`,[type])

        results.forEach(item => item.goods_cover_image = process.env.baseUrl + item.goods_cover_image)
        res.send({
          status:0,
          data: results
        })

  }catch(error){
    console.error("数据库错误详情", error)
  }
}