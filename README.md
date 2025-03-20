## 说明
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
```