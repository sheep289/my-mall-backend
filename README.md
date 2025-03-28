<!-- ## 说明
    1.项目的请求路径为：
    2.以 '/api' 开头的请求路径，不需要访问权限
    3.以 '/my' 开头的请求路径，需要再请求头中携带 Authorization 身份认证字段，才能正常访问成功
## 1.注册
### 接口： post /api/register
### 请求参数：
```
Body参数 json
    username: String      必传
    password: String      必传
    nickname: String      可选
```

## 2.登录
### 接口： post /api/login
### 请求参数：
```
Body参数 json
    username: String      必传
    password: String      必传
``` -->


# 项目API文档 

---

# 接口文档 - 通用上传图片

---

## 接口地址  
`POST /api/upload`  

---

## 请求参数

### 1. 请求头  
```http
Content-Type: multipart/form-data
```

###  2.表单参数

参数名	类型	必填	说明
image	File	是	上传的图片文件（支持格式：JPG, PNG）。
folder	String	否	​可选 指定存储的子文件夹名称（如 cart_img、home_img），默认值：public。

---

## 响应格式

```json
{
  "code": 200,        // 状态码（200=成功，400=参数错误，500=服务器错误）
  "msg": "上传成功",   // 提示信息
  "data": {           // 返回数据
  "url": "http://127.0.0.1/pageHome_img/1623456789-123456789.jpg" // 图片访问URL
  }
}
```

---

## 请求示例
无

---


## 错误示例

### 1.文件格式不支持
```json
{
  "code": 400,
  "msg": "仅允许上传 JPG/PNG 格式文件"
}

```

### 2.文件大小超限
```json
{
  "code": 400,
  "msg": "文件大小不能超过 5MB"
}

```


---



