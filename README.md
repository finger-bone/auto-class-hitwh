# HITWH抢课

## 项目介绍

更快更好更方便的抢课脚本~~大概吧~~。  
用户界面及其简陋，欢迎贡献一个更好的GUI。  
本项目是一个用于抢课的脚本。GUI为用flask写的网页~~因为不会python的GUI库~~。
automator.py文件提供了封装好的Automator对象，可以单独调用，用于封装。  
Automator对象的主要方法为:

```python {"id":"01HPHJ1Z6C57EV8MBMC16KK61K"}
# 创建
auto = Automator(<是否使用vpn>)
# 登录
auto.login(<学号>, <统一身份认证密码>)
# 学期是一个字符串，格式如 <开始年份>-<结束年份><学期类型>
# <学期类型>为 1 秋季学期，2 春季学期，3夏季学期
# 如 2022-20232为2022年到2023年学年的春季学期
auto.fetch_all(<学期>)
# 获取的课程数据
auto.data
# data为Course对象的列表，Course对象定义如下
@dataclass(frozen=True)
class Course:
    # 代号
    code: str
    # 名称
    name: str
    # 详细信息，包括老师，要求，时间等
    detail: str
    # 课程id
    id: str
    # 学期
    semester: str
    # 类型
    kind: str
# 提交选课请求
auto.submit(<课程ID>, <课程类型>, <学期>)
```

## Docker部署

现已经支持docker部署。以下操作也可用docker desktop完成，或者使用github code space等远程部署，或其它方式，~~如果不想用cli，Docker相关知识请自学~~。

需要安装docker https://www.docker.com

首先，build a docker image.

```sh {"id":"01HPHJFDGXMH9CMH786TNH6MVH"}
git clone https://github.com/proximal-phalanx/auto-class-hitwh
cd auto-class-hitwh
docker build . -t autoclass
```

然后运行container，

```sh {"id":"01HPHK72ZCF5SEWRXWAXKX8W7A"}
docker run -p 5555:5000 autoclass
```

打开浏览器，输入 http://localhost:5555 即可。

## 本机部署

### 1. 安装依赖

安装nodejs与python，配置并配置好环境变量。
使用以下命令安装库

```shell {"id":"01HPHJ1Z6C57EV8MBMC4QA7FEV"}
pip install -r requirements.txt
```

### 2. 运行

在当项目目录下执行

```shell {"id":"01HPHJ1Z6C57EV8MBMC7P0BBA0"}
python app.py
```

### 3. 使用

启动服务器后，使用浏览器打开`localhost:5000`或`127.0.0.1:5000`，按照指示使用即可

## 评教shortcut

By the way, 只要进入评教页面，在有几个进度条的一页，通过dev tools，执行这段js代码，

```js {"id":"01HPHJ1Z6C57EV8MBMCANYWB1E"}
document.queryform.action = "/xspjgd/TjAllpj";
$("#queryform").ajaxSubmit(function(result){
if(result=="0"){
    alert("操作成功!");
    reset();
}else{
    alert("操作失败!");
}
});
```

即可直接提交评教，不需要选任何东西。~~很明显，平台只做了前端的验证却没在后端验证。~~
