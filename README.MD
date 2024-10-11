# hippy 首屏自动化监控工具
<font color="#cf222e">一个200行代码即可实现在hippy的首屏自动化监控的工具</font>
## 在项目里安装：`npm install hippy-spd`

## 2 组件使用说明

### 2.1 使用方式

```js
import SPD from 'hippy-spd';
```
使用时传入参数初始化，
`entryName` 为必填项

```js
var spd = new SPD({
    timeOut: 2000,
    entryName: 'topic',
    getFirstTime: (ret) => {
      console.log(ret);
    },
});
```

### 2.2初始化参数说明

| 参数名 | 类型 | 是否必填 | 默认值 | 可选值| 描述 |
|:-----|:-----|:-------|:-------|:------|:-----|
| timeOut | Number | 否 | 2000 | - | 监控页面性能阈值，默认2000毫秒作为监控区间 |
| entryName | String | 是 | - | - | hippy 页面名，标识唯一 |
| spdRate | Number | 否 | 1 | - | 抽样率，默认为 1 即 100%， 100 即为1% |
| getFirstTime  | callback         | 获取首屏性能数据回调 | 回调数据格式 {'fcp': {'timestamp': *}, 'fmp': {'timestamp': *}}
