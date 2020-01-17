/**
 *  Created by Allen.sun on 2019/12/28
 *  Collaborator: 协作者
 *  Module: exceptionWatcher
 *  Description: 前端异常监测模块
 */


(function ($w) {

  'use strict';

  var version = 'v1.0.3',

       $d = $w.document,  // document 中转

        Behavior = ['click', 'keydown', 'blur'], // 行为栈

        cnle = console,

        cnleList = ['error'],

        Resource = ['error'],

        Resource_list = ['link', 'script'],

        Watcher = 'onerror',

        un = 'onunload',

        queryErr = '@error',

        UrlWatcher = 'onhashchange',

        StateChange = 'onloadend',

        WatcherUrl = 'http://log.risfond.com',

        Nav = $w.navigator,

        HttpTimeOutStamp = 10000,

        impIp = '59.110.244.9',
        //impIp = '119.57.66.250',

        _initState = 'waiting',

        _CitySN = null,

        _start = 0,

        _end = 0,

        _completeTime = 0,

        _counter = 0,

        loggerOpts = {
          cnle: function (type, argus) {
            return {
              type: type + '_console',
              content: argus[0],
              time: _get_time(),
              url: _get_current_url()
            }
          },
          cnle_err: function (argus, stack_trace) {
            return {
              message: argus[0],
              stack_trace: stack_trace
            }
          },
          cnle_trace: function (file_name, line_number, column, err_type, argus) {
            return [{
              file_name: 'handle console.error(' + argus[0] + ')',
              line_number: line_number,
              column: column,
              err_type: 'handle_err'
            }]
          },
          cnle_request: function (local, query) {
            return {
              host: local.host,
              path: local.pathname,
              port: local.port || 80,
              query: query
            }
          },
          cnle_query: function (query) {
            return query
          },
          program: function (type, argus) {
            return {
              type: type,
              content: argus[0],
              time: _get_time(),
              url: argus[1],
              lineno: argus[2],
              colno: argus[3],
              error: argus[4],
            }
          },
          program_err: function (argus, stack_trace) {
            return {
              message: argus[4].message,
              stack_trace: stack_trace
            }
          },
          program_trace: function (file_name, line_number, column, err_type, argus) {
            var tamp = argus;
            var ev = tamp[4];
            return [{
              file_name: tamp[1],
              line_number: tamp[2],
              column: tamp[3],
              err_type: ev.name
            }]
          },
          program_request: function (local, query) {
            return {
              host: local.host,
              path: local.pathname,
              port: local.port || 80,
              query: query
            }
          },
          program_query: function (query) {
            return query
          },
          http_err: function (argus, stack_trace) {
            return {
              message: 'net status code ' + argus[3],
              stack_trace: stack_trace
            }
          },
          http_trace: function (file_name, line_number, column, err_type, argus) {
            return [{
              file_name: argus[0],
              line_number: '【method:' + argus[5] + '】【Query:' + argus[1] + '】',
              column: 'respones' + argus[4],
            }]
          },
          http_request: function (local, query) {
            return {
              host: query[6],
              path: query[7],
              port: 80,
              query: query[1]
            }
          },
          http_query: function (query) {
            return query
          },
          resouce_query: function (query) {
            return query
          },
          resouce_err: function (argus, stack_trace) {
            return {
              message: 'tag: ' + argus[0] + ' /URL: ' + argus[1] + ' load fail',
              stack_trace: stack_trace
            }
          },
          resouce_trace: function () {
            return [{
              stack_trace: {
                line_number: "",
                file_name: 'resouce load fail'
              }
            }]
          },
          resouce_request: function (query, tag) {
            return {
              host: query.host,
              path: query.pathname,
              port: 80,
              query: tag
            }
          }
        },

        staff_info = null,

        parse = JSON.parse,

        DefaultSubmissionClient = null,

        config_excptionConfigs = null,

        coreVersion = null,

        client = null;

  var log_heaps = {};

  var query_heaps = {};

  var methods_heaps = {};

  var behavior_queue = [];
  // TODO: 外界配置对象 待完成
  var retOpts = {
    showLogger: false,
    queue_num: 10,
    switch_watcher: true,
    _interactive_switch: true
  }

  _exception_process();
  // Done: 设置监听中转
  function addListen(type, fn, f) {
    $w.addEventListener(type, fn, true)
  }

  function _init_cnle_watcher() {
    _get_cookie();
    cnleList.forEach(function (k) {
      cnle[k] = watcher_bridge(cnle[k], k, 'cnle', cnle, 'logger_watcher', [_get_current_url().href, coreVersion]);
    })
  };

  function _init_program_watcher() {
    $w[Watcher] = watcher_bridge($w[Watcher], 'program_error', 'program', null, 'program_watcher', [_get_current_url().href, coreVersion]);
  };
  // TODO: unstall module
  function _init_un_events() {
    //console.log('un');
    $w[un] = function () {

    }
  }

  function _init_http_watcher() {
    XMLHttpRequest.prototype.nativeOpen = XMLHttpRequest.prototype.open;
    var customizeOpen = function (method, url, async, user, password) {
      this.nativeOpen(method, url, async, user, password);
      _getStart(this);
      this.key = setRandomKey();
      this.send = NativeSend(this.send)
      function NativeSend(send) {
        return function () {
          send.apply(this, [arguments, this.key, method, url])
        }
      }
      if (_verHostException(url)) return;
      this[StateChange] = _state_change(this);
    };
    XMLHttpRequest.prototype.open = customizeOpen;
    XMLHttpRequest.prototype.nativeSend = XMLHttpRequest.prototype.send;
    var customizeSend = function () {
      if (arguments[1]) {
        query_heaps[arguments[1]] = arguments[0][0];
        methods_heaps[arguments[1]] = arguments[2];
      }
      this.nativeSend.apply(this, arguments[0]);
    }
    XMLHttpRequest.prototype.send = customizeSend;
  }

  function _state_change(xhr) {
    return function () {
      _http_excption_bridge(xhr, _getEnd(xhr))
    }
  }

  function _http_excption_bridge(xhr, time) {
    var url, query, status, statusText, responseText, method, host, key, totalTime, path;
    responseText = xhr.responseText;
    key = xhr.key;
    url = xhr.responseURL;
    var o = _getPort(url.toString());
    host = o.host;
    path = o.local;
    query = query_heaps[key];
    statusText = xhr.statusText;
    method = methods_heaps[key];
    status = xhr.status;
    totalTime = (xhr.endTime - xhr.startTime) / 1000;
    _bq_append(new Http_target(url, query, status, responseText, totalTime, host, path));
    try {
      parse(responseText);
    } catch (e) {
      /** 
       *  Destoried by allen.sun on 2020/1/9
       *  Note: RNSS系统中返回值问题类似的错误太多了，导致日志系统接收太频繁！先注释掉，后期再讨论解决方案。
       */
     // createErrorEvents('http', [
     //   url,
     //   query,
     //   statusText,
     //   'code:' + status + '-respones_error',
     //   responseText, method, host, path],
     //   'respones_error',
     //   [_get_current_url().href, coreVersion]
     //   );
     // _get_cookie();
     // _clear_method_heaps();
      // _clear_query_heaps();
      // return;
    }
    if (xhr.status == 200 || xhr.statusText == 'OK') return;
    createErrorEvents('http',
      [url, query, statusText, status, responseText, method, host, path], 'request_error', [_get_current_url().href, coreVersion]);
    _clear_method_heaps();
    _clear_query_heaps();
  }

  function _verHostException(xhrUrl) {
    return xhrUrl.indexOf(WatcherUrl) >= 0;
  }

  function _getStart(o) {
    o.startTime = _get_time();
  }

  function _getEnd(o) {
    o.endTime = _get_time();
    return computedTime(o);
  }

  function _getPort(url) {
    var urlSp = url.split('/');
    var host = urlSp[0] + '//' + urlSp[2] + '/';
    return {
      local: url.replace(new RegExp(host), ''),
      host: host
    };
  }

  function computedTime(o) {
    return Math.floor((o.endTime - o.startTime) / 1000);
  }

  function asyncStep(fn) {
    setTimeout(function () {
      fn()
    }, HttpTimeOutStamp)
  }

  function _init_excption_postEvents() {
    DefaultSubmissionClient = new $w.DefaultSubmissionClient();
  }

  function _init_configs() {
    config_excptionConfigs = $w.config_excptionConfigs
  }

  function _init_excption_watcher() {
    client = exceptionless.ExceptionlessClient.default;
    client.config.serverUrl = WatcherUrl;
    client.config.updateSettingsWhenIdleInterval = 60000;
    client.config.setUserIdentity(staff_info, 'staffId');
  }

  function _init_behavior_watcher() {

    Behavior.forEach(function (type) {
      addListen(type, behavior_bridge(type), true);
    })
  }
  // TODO: _init_hash_watcher 
  function _init_hash_watcher() {
    _bq_append(new Page_target(_get_current_url(), _get_title()));
    $w[UrlWatcher] = function (e) {
      // TODO
    }
  }

  function behavior_bridge(type) {
    return function (e) {
      if (e instanceof KeyboardEvent && [13, 37, 38, 39, 40].indexOf(e.keyCode) >= 0) {
        t = new Behavior_target(type, null, null, null, null, null, e.keyCode, e.key);
        _bq_append(t);
        return;
      }

      if (e instanceof KeyboardEvent) return;
      if (e instanceof FocusEvent && !(e.target.tagName == 'INPUT' || e.target.tagName == 'TEXTAREA')) return;

      var tar = e.target,
          bt = type,
          cn = tar.className,
          ph = tar.placeholder,
          iv = tar.value,
          tn = tar.tagName,
          tx = tar.innerText,
          t = null;

      if (!tn) return;

      t = new Behavior_target(bt, cn, ph, iv, tn, tx);
      _bq_append(t);
    }
  }

  function resources(e) {
    var typeName = e.target.localName, sourceUrl;
    if (!(typeName === "link" || typeName === "script")) return;
    sourceUrl = e.target.src || e.target.href;
    _bq_append(new Resouce_target(typeName, sourceUrl));
    // 资源加载失败往往 会导致程序错误，如果没导致错误 证明该依赖并没有使用到。则不用上报
    //createErrorEvents('resouce', [typeName, sourceUrl], 'resouce_load_fail', [_get_current_url().href, coreVersion])
  }

  function _init_resources_watcher() {
    Resource.forEach(function (type) {
      addListen(type, resources, true);
    })

  }

  function _send_postEvents(events) {
    DefaultSubmissionClient.postEvents(events, config_excptionConfigs, _events_callback);
  }

  function _events_callback(res) {
    //  console.log(res);
  }

  function watcher_bridge(tmp, type, opt_str, scope, wacther_type, tags) {
    return function () {
      Array.prototype.push.call(arguments, coreVersion)
      _wirte_logs(type, opt_str, Array.prototype.slice.call(arguments, 0));
      _bq_append(new Exception_target(opt_str, arguments));
      createErrorEvents.apply(null, [opt_str, arguments, wacther_type, tags]);
      if (typeof tmp !== 'function') return;
      tmp.apply(scope, arguments);
    }
  };

  function createErrorEvents(type, argus, wacther_type, tags) {
    var err = {};
    var type_modifiy = argus[4];
    var modified_text = typeof type_modifiy == 'object' ? type_modifiy.message : argus[3];
    !modified_text && (modified_text = (typeof argus[0] == 'object' ? argus[0].message.toString().substring(0, 50) + '...' : argus[0].toString().substring(0, 50) + '...'));
    _createErr(err, type, argus);
    _createRequest(err, type, argus);
    _createSubmission(err, wacther_type);
    _createUser(err);
    _create_date(err);
    _create_tags(err, tags);
    _create_events_type(err, type + '【' + modified_text + '】');
    _mixim_behavior(err);
    if (!retOpts._interactive_switch) {
      console.warn('[exceptionWatcher log]: postEvents is closed')
      return;
    }
    _send_postEvents([err]);
  }

  function _mixim_behavior(err) {
    var behavior_line = '   behavior_line: start__',
        len = behavior_queue.length;
    behavior_queue.forEach(function (o, index) {
      behavior_line += '(' + (index + 1) + ')' + o.get_behavior() + (len == (index + 1) ? '__end' : '----->');
      retOpts.showLogger && console.log(o.get_behavior());
    })
    err[queryErr].stack_trace[0].line_number += behavior_line;
  }

  function _createErr(ex, type, argus) {
    ex[queryErr] = loggerOpts[type + '_err'](argus, _create_trace(type, null, null, null, null, argus));
  };

  function _create_trace(type, file_name, line_number, column, err_type, argus) {
    return loggerOpts[type + '_trace'](file_name, line_number, column, err_type, argus);
  };

  function _createRequest(ex, type, query) {
    ex['@request'] = loggerOpts[type + '_request'](_get_current_url(), _create_query(type, query));
  }

  function _create_query(type, query) {
    return loggerOpts[type + '_query'](query);
  }

  function _createSubmission(ex, method) {
    ex['@submission_method'] = method;
  }

  function _createUser(ex) {
    ex['@user'] = { identity: staff_info, name: 'staffId' };
  }

  function _create_date(ex) {
    ex.date = new Date();
  }

  function _create_tags(ex, tags) {
    ex.tags = tags;
  }

  function _create_events_type(ex, type) {
    ex.type = type;
  }

  function _wirte_logs(type, s, argus) {
    if (!log_heaps[type]) log_heaps[type] = [];
    var o = loggerOpts[s].apply(null, [type, argus]);
    o.staff_info = staff_info;
    log_heaps[type].push(o);
  }

  function _get_time() {
    return new Date().getTime();
  }

  function setRandomKey() {
    return 'request_' + _get_time()
  }

  function _get_current_url() {
    return $w.location;
  }

  function _get_cookie() {
    staff_info = $d.cookie
  }

  function _clear_method_heaps() {
    methods_heaps = {};
  }

  function _clear_query_heaps() {
    query_heaps = {};
  }

  function _get_title() {
    return $d.title;
  }

  function _init_watcher() {
    console.log('[exceptionWatcher log]: exceptionWatcher Already initialized!');
    _init_http_watcher();
    _init_cnle_watcher();
    _init_program_watcher();
    _init_behavior_watcher();
    _init_resources_watcher();
    _init_excption_watcher();
    _init_excption_postEvents();
    _init_hash_watcher();
    _init_configs();
    _reset_parse();
  }

  function _tip_change_broser() {
    alert('为了获得更好的交互体验，请使用谷歌浏览器或360浏览器的极速模式！')
  }

  function _get_netCore() {
    var agent = Nav.userAgent.toLowerCase();
    var regStr_ie = /msie [\d.]+;/gi;
    var regStr_ie1 = /trident\/[\d.]+;/gi;
    var regStr_ff = /firefox\/[\d.]+/gi
    var regStr_chrome = /chrome\/[\d.]+/gi;
    var regStr_saf = /safari\/[\d.]+/gi;
    //IE
    if (agent.indexOf("msie") > 0) {
      _tip_change_broser();
      return agent.match(regStr_ie);
    }
    if (agent.indexOf("trident") > 0) {
      _tip_change_broser();
      return agent.match(regStr_ie1);
    }
    //firefox
    if (agent.indexOf("firefox") > 0) {
      return agent.match(regStr_ff);
    }

    //Chrome
    if (agent.indexOf("chrome") > 0) {
      return agent.match(regStr_chrome);
    }

    //Safari
    if (agent.indexOf("safari") > 0 && agent.indexOf("chrome") < 0) {
      return agent.match(regStr_saf);
    }
  }

  function _reset_parse() {
    JSON.parse = function (str) {
      try {
        return parse(str)
      } catch (e) {
        console.warn(e);
      }
    }
  }

  function Behavior_target(behaviorType, className, placeholder, value, tagName, innerText, code, key) {
    this.computed_props(behaviorType, className, placeholder, value, tagName, innerText, code, key);
    this.textMap = {
      click: '[点击]',
      keydown: '[按下键盘]',
      mouseover: '[鼠标进入]',
      blur: '[结束输入]'
    }
  }
  Behavior_target.prototype = {
    computed_props: function (behaviorType, className, placeholder, value, tagName, innerText, code, key) {
      props_helper(this, 'behaviorType', behaviorType);
      props_helper(this, 'className', className);
      props_helper(this, 'tagName', tagName);
      props_helper(this, 'placeholder', placeholder);
      props_helper(this, 'value', value);
      props_helper(this, 'innerText', innerText);
      props_helper(this, 'innerText', innerText);
      props_helper(this, 'code', code);
      props_helper(this, 'key', key);
    },
    get_behavior: function () {
      var cls = this.className;
      var text = this.innerText ? '[' + this.innerText.toString().substring(0, 15) + ']' : '';
      var value = this.value ? '_value:[' + this.value.toString().substring(0, 500) + ']' : '';
      var ph = this.placeholder ? '_placeholder:[' + this.placeholder.toString().substring(0, 500) + ']' : '';
      if (this.key) return this.textMap[this.behaviorType] + ':' + this.key + '[' + this.code + ']';
      return this.textMap[this.behaviorType] + '元素:' + this.tagName + (cls ? '[' + cls.substring(0, 20) + '...]' : '') + ph + text + (this.behaviorType !== 'blur' ? "" : value);
    }
  }

  function Http_target(url, query, status, respones, totalTime, host, port) {
    this.computed_props(url, query, status, respones, totalTime, host, port);
  }

  Http_target.prototype = {
    computed_props: function (url, query, status, respones, totalTime, host, port) {
      props_helper(this, 'url', url.toString());
      props_helper(this, 'query', query);
      props_helper(this, 'status', status);
      props_helper(this, 'respones', respones);
      props_helper(this, 'totalTime', totalTime);
      props_helper(this, 'host', host);
      props_helper(this, 'port', port);
    },
    get_behavior: function () {
      return '请求接口：' + this.port + '耗时[' + this.totalTime + 's]';
    },
  }

  function Exception_target(type, argus) {
    this.exceptionType = type;
    this.computed_props.apply(this, this[type](argus));
  }

  Exception_target.prototype = {
    computed_props: function (type, msg, lineno, colno) {
      props_helper(this, 'type', type);
      props_helper(this, 'msg', msg);
      props_helper(this, 'lineno', lineno);
      props_helper(this, 'colno', colno);
    },
    cnle: function (argus) {
      return ['handle', argus[0]]
    },
    program: function (argus) {
      var err = argus[4] || {};
      return [err.name, err.message, argus[2], argus[3]];
    },
    get_behavior: function () {
      return '输出' + this.exceptionType + '错误：' + this.msg;
    }
  }

  function Page_target(url, title) {
    this.computed_props(url, title);
  }
  Page_target.prototype = {
    computed_props: function (url, title) {
      props_helper(this, 'hashurl', url);
      props_helper(this, 'title', title);
    },
    get_behavior: function () {
      return '进入页面：' + this.hashurl + '【' + this.title + '】';
    }
  }
  function props_helper(scope, type, value) {
    value && (scope[type] = value);
  }

  function Resouce_target(typename, url) {
    this.computed_props(typename, url);
  }
  Resouce_target.prototype = {
    computed_props: function (typename, url) {
      props_helper(this, 'typename', typename);
      props_helper(this, 'url', url);
    },
    get_behavior: function () {
      return '资源加载失败：' + this.typename + '[' + this.url + ']';
    }
  }

  function _bq_append(event) {
    var len = behavior_queue.length, n = retOpts.queue_num;
    behavior_queue.push(event);
    if (len >= retOpts.queue_num) {
      behavior_queue.shift();
    }
  }

  function _mounte_helper() {
    $w.log = log_heaps;

    $w.ExceptionWatcher = {
      showDevLogger: function () {
        console.log('[ExceptionWatcher log] dev logger has been opened! Its will be show current log on any exception encounter!')
        retOpts.showLogger = true;
      },
      getCookie: function () {
        _get_cookie();
        return staff_info;
      },
      getVersion: function () {
        return version
      },
      getWatcherState: function () {
        return {
          state: _initState,
          time: _completeTime,
        }
      },
      setWatchNum: function (num) {
        if (isNaN(num)) {
          console.warn('[ExceptionWatcher exception] setWatchNum must be Number!');
          return;
        }
        if (num < 6) {
          console.warn('[ExceptionWatcher exception] set setWatchNum can not less than 6');
          return;
        }
        retOpts.queue_num = num;
      },
      initWatcher: function () {
        _ready();
      },

    }
  }

  function _exception_process() {
    _start = _get_time();
    var script = document.createElement('script');
    var list = document.getElementsByTagName('head')[0];
    var timer = null;
    script.src = 'http://staff.risfond.com/WebSite/GetServerIp';
    list.insertBefore(script, list.childNodes[0]);
    timer = setInterval(function () {
      _counter++;
      var b = false;
      if (window._rnssIpConfig) {
        b = _rnssIpConfig.Env == 'production';
        retOpts.switch_watcher = b;
        b ? _ready(timer) : _failed(timer);
      }
      if (_counter >= 50) {
        _failed(timer)
      }
    }, 50)
  }

  function _ready(timer) {
    clearInterval(timer)
    _initState = 'already';
    retOpts._interactive_switch = true;
    _end = _get_time();
    _completeTime = _end - _start;

  };

  function _failed(timer) {
    console.warn('[exceptionWatcher log]: exceptionWatcher closed in the development environment. use initWatcher to open it!')
    clearInterval(timer);
    _initState = 'suspend';
    retOpts._interactive_switch = false;
    _end = _get_time();
    _completeTime = _end - _start;
  }

  var t = _get_netCore();

  coreVersion = Array.isArray(t) ? t[0] : t;

  _init_watcher();

  _mounte_helper();

  _get_cookie();

})(window);
