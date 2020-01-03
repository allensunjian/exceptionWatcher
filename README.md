#### 前端异常监控组件exceptionWatcher.js ----------------------- v1.0.0 版本
- 介绍： 使用 exceptionless 核心后台交互接口和方法的 exceptionWatcher 是对exceptionless 进行的针对性的错误监控范围的扩展和重构。抛弃了原有的运行机制，采用新的更高效且被广泛应用的机制， 使错误更加简洁定位准确，且不会浪费过多的资源。保持原有的注册认证机制不变的情况下，对错误的监控扩展了 program(程序错误)， cnls(日志系统抛出错误)， http（请求状态错误。非200或statusText !== 'OK'）。
- 技术支持： Allen.sun

####上线前需要小伙伴做的工作：
1、D:\WorkSpace\trunk\HeadHunter.Web.Office3\OfficeTemplate.Master line: 131行
2、D:\WorkSpace\trunk\HeadHunter.Web.Office3\Views\Shared\_Layout.cshtml line：948行
3、D:\WorkSpace\trunk\HeadHunter.Web.Office3\Views\Shared\_LayoutKnowledge.cshtml line: 66行
4、D:\WorkSpace\trunk\HeadHunter.Web.Office3\Views\Shared\_LayoutWithoutBar.cshtml line: 94行
![](http://192.168.30.10:8888/Public/Uploads/2019-12-27/5e05d879f311c.png)
#####这几行代码 目前还是劳烦上线的伙伴手动的解开这两段HTML代码


#####使用手册：
 - 如何创建exceptionless账号和使用组件
 ######如何创建exceptionless
 地址：http://log.risfond.com
 ![](http://192.168.30.10:8888/Public/Uploads/2019-12-20/5dfc80cbd9a99.png)

![](http://192.168.30.10:8888/Public/Uploads/2019-12-20/5dfc80eaf059f.png)

![](http://192.168.30.10:8888/Public/Uploads/2019-12-20/5dfc80f81c673.png)

![](http://192.168.30.10:8888/Public/Uploads/2019-12-20/5dfc8101accad.png)

![](http://192.168.30.10:8888/Public/Uploads/2019-12-20/5dfc81078e2a1.png)

![](http://192.168.30.10:8888/Public/Uploads/2019-12-20/5dfc8113ba868.png)

 ######如何使用组件
>  注意： 为了使得监测组件覆盖全面，需要在最顶引入该组件 比如在模板页中引入

```html
<!-- 引入exceptionless,并注册 apiKey-->
  <script src="~/js/exceptionWatcher/exceptionless.js?apiKey=6tCY7HT7zZZgj3E1X8REqPsK0hp1E7idP0ZSqCOs"></script>
  <script src="~/js/exceptionWatcher/exceptionWatcher.js"></script>
  <script src="~/js/xxxx.js"></script>
  <script src="~/js/xxxx.js"></script>
  <script src="~/js/xxxx.js"></script>
  <script src="~/js/xxxx.js"></script>
  <script src="~/js/xxxx.js"></script>
  <script src="~/js/xxxx.js"></script>

```

#### 前端异常监控组件exceptionWatcher.js ----------------------- v1.0.1 版本
1、新增监测列表预览信息，错误预览信息，网络状态码
![](http://192.168.30.10:8888/Public/Uploads/2019-12-24/5e01c6712424f.jpg)
2、新增详情，内核版本信息，请求错误时 页面的信息在tags中展示
![](http://192.168.30.10:8888/Public/Uploads/2019-12-24/5e01c700eb26e.jpg)

迭代目的： 
1、 对问题一目了然，已经解决过的问题不需要一一的打开详情
2、 修复http请求错误时无法定位到具体页面
3、 重复问题自动归类，方便统计出现的比例，相对直观的体现出问题的具体数量

#### 前端异常监控组件exceptionWatcher.js ----------------------- v1.0.2 版本
- 本次v1.0.2V版本的exceptionwatcher经历了比较大的变动，不仅加入了用户行为监控和回溯，并且加入了资源的监控和URL hash的监控，外抛了一些目前为止比较安全的功能可供外部配置和使用；

#####细数那些功能变化和新增：
- 新增： 
  1.行为线：
  ![](https://github.com/allensunjian/image/blob/master/exceptionWatcher/1.png)
  2.行为类型： 进入页面 --> 资源加载 -->接口 -->事件 --> url hash变化 --> 输出错误  （该顺序同样为监控的顺序）；
  ![](https://github.com/allensunjian/image/blob/master/exceptionWatcher/2.png)
  3.接口返回事件监控：
  ![](https://github.com/allensunjian/image/blob/master/exceptionWatcher/3.png)
  4.URL hash 改变同样计入事件
  ![](https://github.com/allensunjian/image/blob/master/exceptionWatcher/4.png)
  备注：虽然RNSS项目用不到 url hash的监控，但是着眼于未来，单页面应用时该监控作为用户行为的一种变得尤为重要；
  5.新增ExceptionWatcher对象
    - showDevLogger 类型：函数  作用： 手动开启：日志打印，遇到错误时，可输出监控到的行为并输出错误
	开启logger
	![](https://github.com/allensunjian/image/blob/master/exceptionWatcher/5.png)
	发生错误
	![](https://github.com/allensunjian/image/blob/master/exceptionWatcher/6.png)
    - getCookie 类型： 方法 作用 ，获取当前页面的cookie
	- getVersion 类型： 方法 作用， 获取当前监控插件的版本
	- setWatchNum 类型： 方法 作用设置监控队列的数量；数量必须是数字且不能小于6；
   6.新增返回值监测，如果不是JSON的情况下会上报
   ![](https://github.com/allensunjian/image/blob/master/exceptionWatcher/7.png)
   备注：虽然在RNSS中这种直接返回HTML的做法是普遍的，但是这是极其难预期的做法，也是被摒弃的陋习。所以目前监测他同样起到了，收集的作用，一旦某天想让他变得更好就需要用到这里收集到的接口数据去有针对性的迭代，而不必花大量的事件去进行整个项目的测试。
- 微调
  1. tag 标签不再展示错误类型，而是固定展示发生错误的页面 和 内核版本   
