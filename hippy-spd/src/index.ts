/**
 * hippy 首屏自动化监控 daoye 2023.4.17
 * SPD.init(开始时间点, url);
 */

interface SpdOpts {
    timeOut?: number;
    entryName: string;
    spdRate?: number;
    getFirstTime?: (data: unknown) => void;
  }
  
  export default class SPD {
    opts: SpdOpts = {
        entryName: '',
    };
    _spdRate = 1;
    _spdTiming: Record<string, number | string | any> = {};
    _firtTime: Array<Record<string, any>> = [];
    _renderId = 0;
    _isSampling = true;
    report = false;
    constructor(opts: SpdOpts) {
        // 容错： markDuration执行在init之前时
        if (opts) {
            this.init(opts);
        }
    }
  
    /**
     *
     * @param {*} opts
     *  @param {number} option.spdRate 性能监控抽样率，默认为 1 即 100%， 100 即为1%
     */
    init = (opts: SpdOpts): void => {
        this.opts = opts;
        this._spdRate = opts.spdRate || 1; /* 默认采样百分百*/
        this._spdTiming = {};
        this._firtTime = [];
        this._renderId = 0;
        this._isSampling = this.isSamplingSuccess();
        setTimeout(() => {
            // 上报首屏关键时间点 FCP与FMP
            if (this._isSampling && this.opts.entryName) {
                this.sendFirstTime();
                this.opts.getFirstTime?.(this._spdTiming);
            }
        }, opts.timeOut || 2000);
  
        // 自动监听首屏
        this._isSampling && this.opts.entryName && this.decoratorLogTime(Hippy.bridge, 'callNative');
    };
  
    checkRate = (): boolean => {
        return this._spdRate <= 1 ? true : Math.round(Math.random() * this._spdRate) < 1;
    };
  
    // 装饰器函数
    decoratorLogTime = (target: unknown, key: string): void => {
        // const targetPrototype = target.prototype
        // Step1 备份原来类上的属性描述符 Descriptor
        const oldDescriptor = Object.getOwnPropertyDescriptor(target, key);
  
        // Step2 编写装饰器函数业务逻辑代码
        const logTime = (...arg: any[]) => {
            // Before 钩子
            try {
                // 执行原来函数
                return oldDescriptor?.value.apply(this, arg); // 调用之前的函数
            } finally {
                // After 钩子
                if (!this.report && arg[1] == 'startBatch') {
                    // console.log(`startBatch: ${Date.now()}`);
                    this._firtTime[this._renderId] = {
                        points: 0,
                    };
                }
                if (!this.report && arg[1] == 'endBatch') {
                    // console.log(`endBatch: ${Date.now()}`);
                    !this._firtTime[this._renderId] &&
                        (this._firtTime[this._renderId] = {
                            points: 0,
                        });
                    this._firtTime[this._renderId].timestamp = Date.now();
                    this._renderId++;
                }
                if (!this.report && arg[1] == 'createNode') {
                    // console.log(`createNode: ${Date.now()}`);
                    const points = this.getNodesPoints(arg[3]);
                    !this._firtTime[this._renderId] &&
                        (this._firtTime[this._renderId] = {
                            points: 0,
                        });
                    points > this._firtTime[this._renderId].points && (this._firtTime[this._renderId].points = points);
                }
                // console.log(`耗时:${arg} ${Date.now()}`);
            }
        };
  
        // Step3 将装饰器覆盖原来的属性描述符的 value
        Object.defineProperty(target, key, {
            ...oldDescriptor,
            value: logTime,
        });
    };
  
    /* 采样是否成功*/
    isSamplingSuccess = (): boolean => {
        if (this._spdRate >= 0 && this._spdRate <= 1) {
            return Math.random() <= this._spdRate;
        }
        return true;
    };
  
    sendFirstTime = (): void => {
        console.log('FCP this._firtTime::', this._firtTime);
        // FCP 上报
        const fcp = this._firtTime[0]?.timestamp;
        if (fcp) {
            this._spdTiming['fcp'] = {
                timestamp: fcp,
                fetchType: 121,
            };
            this.sendFMPTime(1, fcp);
        }
    };
  
    sendFMPTime = (num: number, fcp: number): void => {
        this._firtTime.sort((a, b) => {
            return b.points - a.points;
        });
        if (this._firtTime[0]?.timestamp > fcp) {
            console.log('FMP this._firtTime::', this._firtTime);
            this._spdTiming['fmp'] = {
                timestamp: this._firtTime[0].timestamp,
                fetchType: 122,
            };
            this.report = true;
        } else if (num < 4) {
            setTimeout(() => {
                num++;
                this.sendFMPTime(num, fcp);
            }, 500 * num);
        } else {
            this.report = true;
        }
    };
  
    getNodesPoints = (nodes: any[]): number => {
        let points = 0;
  
        const getChildrenIdx = (nodesChildren: any[], pId: any) => {
            const idxAry: Array<any> = [];
            nodesChildren.map((node, idx) => {
                node.pId == pId && idxAry.push(idx);
            });
            return idxAry;
        };
  
        nodes.map(node => {
            // 横划翻页 只计算第一屏
            if (node.name == 'ViewPager') {
                const childrenIdx = getChildrenIdx(nodes, node.pId);
                let viewPagerNodes: Array<any> = [];
                if (childrenIdx.length > 1) {
                    viewPagerNodes = nodes.splice(childrenIdx[0], childrenIdx[1] - childrenIdx[0]);
                } else {
                    viewPagerNodes = nodes.splice(childrenIdx[0]);
                }
                const viewPagerItemIdx = getChildrenIdx(viewPagerNodes, viewPagerNodes[1].pId);
                let viewPagerItemNodes: Array<any> = [];
                if (viewPagerItemIdx.length > 1) {
                    viewPagerItemNodes = viewPagerNodes.splice(viewPagerItemIdx[0], viewPagerItemIdx[1] - viewPagerItemIdx[0]);
                } else {
                    viewPagerItemNodes = viewPagerNodes.splice(viewPagerItemIdx[0]);
                }
                points += this.getNodesPoints(viewPagerItemNodes);
            } else if (node.name == 'Image' && node.props && node.props.source && node.props.source[0] && node.props.source[0].uri) {
                points += 2;
            } else if (node.name == 'Text' && node.props && node.props.text) {
                points += 1;
            } else if (node.name == 'Svg' && node.props && node.props.d) {
                points += 1;
            }
        });
        return points;
    };
  }
  