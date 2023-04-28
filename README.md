# HITWH抢课

## 项目介绍

更快更好更方便的抢课脚本~~大概吧~~。\

用户界面及其简陋，欢迎贡献一个刚好的GUI。\

本项目是一个用于抢课的脚本。GUI为用flask写的网页~~因为不会python的GUI库~~。
automator.py文件提供了封装好的Automator对象，可以单独调用，用于封装。\

Automator对象的主要方法为:

```python
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

## 环境依赖

- python 3.8或以上
- nodejs或其它PyExecJs支持的运行时

使用的库已在requirements.txt中列出

## 使用说明

### 1. 安装依赖

安装nodejs与python，配置并配置好环境变量。
使用以下命令安装库

```shell
pip install -r requirements.txt
```

### 2. 运行

在当项目目录下执行

```shell
flask run
```

或者直接运行`run.cmd`或`run.sh`

### 3. 使用

启动服务器后，使用浏览器打开`localhost:5000`或`127.0.0.1:5000`，按照指示使用即可
