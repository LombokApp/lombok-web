var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};

// ../../node_modules/axios/lib/helpers/bind.js
function bind(fn, thisArg) {
  return function wrap() {
    return fn.apply(thisArg, arguments);
  };
}

// ../../node_modules/axios/lib/utils.js
var { toString } = Object.prototype;
var { getPrototypeOf } = Object;
var { iterator, toStringTag } = Symbol;
var kindOf = ((cache) => (thing) => {
  const str = toString.call(thing);
  return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
})(Object.create(null));
var kindOfTest = (type) => {
  type = type.toLowerCase();
  return (thing) => kindOf(thing) === type;
};
var typeOfTest = (type) => (thing) => typeof thing === type;
var { isArray } = Array;
var isUndefined = typeOfTest("undefined");
function isBuffer(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor) && isFunction(val.constructor.isBuffer) && val.constructor.isBuffer(val);
}
var isArrayBuffer = kindOfTest("ArrayBuffer");
function isArrayBufferView(val) {
  let result;
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) {
    result = ArrayBuffer.isView(val);
  } else {
    result = val && val.buffer && isArrayBuffer(val.buffer);
  }
  return result;
}
var isString = typeOfTest("string");
var isFunction = typeOfTest("function");
var isNumber = typeOfTest("number");
var isObject = (thing) => thing !== null && typeof thing === "object";
var isBoolean = (thing) => thing === true || thing === false;
var isPlainObject = (val) => {
  if (kindOf(val) !== "object") {
    return false;
  }
  const prototype = getPrototypeOf(val);
  return (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) && !(toStringTag in val) && !(iterator in val);
};
var isDate = kindOfTest("Date");
var isFile = kindOfTest("File");
var isBlob = kindOfTest("Blob");
var isFileList = kindOfTest("FileList");
var isStream = (val) => isObject(val) && isFunction(val.pipe);
var isFormData = (thing) => {
  let kind;
  return thing && (typeof FormData === "function" && thing instanceof FormData || isFunction(thing.append) && ((kind = kindOf(thing)) === "formdata" || kind === "object" && isFunction(thing.toString) && thing.toString() === "[object FormData]"));
};
var isURLSearchParams = kindOfTest("URLSearchParams");
var [isReadableStream, isRequest, isResponse, isHeaders] = ["ReadableStream", "Request", "Response", "Headers"].map(kindOfTest);
var trim = (str) => str.trim ? str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
function forEach(obj, fn, { allOwnKeys = false } = {}) {
  if (obj === null || typeof obj === "undefined") {
    return;
  }
  let i;
  let l;
  if (typeof obj !== "object") {
    obj = [obj];
  }
  if (isArray(obj)) {
    for (i = 0, l = obj.length;i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
    const len = keys.length;
    let key;
    for (i = 0;i < len; i++) {
      key = keys[i];
      fn.call(null, obj[key], key, obj);
    }
  }
}
function findKey(obj, key) {
  key = key.toLowerCase();
  const keys = Object.keys(obj);
  let i = keys.length;
  let _key;
  while (i-- > 0) {
    _key = keys[i];
    if (key === _key.toLowerCase()) {
      return _key;
    }
  }
  return null;
}
var _global = (() => {
  if (typeof globalThis !== "undefined")
    return globalThis;
  return typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : global;
})();
var isContextDefined = (context) => !isUndefined(context) && context !== _global;
function merge() {
  const { caseless } = isContextDefined(this) && this || {};
  const result = {};
  const assignValue = (val, key) => {
    const targetKey = caseless && findKey(result, key) || key;
    if (isPlainObject(result[targetKey]) && isPlainObject(val)) {
      result[targetKey] = merge(result[targetKey], val);
    } else if (isPlainObject(val)) {
      result[targetKey] = merge({}, val);
    } else if (isArray(val)) {
      result[targetKey] = val.slice();
    } else {
      result[targetKey] = val;
    }
  };
  for (let i = 0, l = arguments.length;i < l; i++) {
    arguments[i] && forEach(arguments[i], assignValue);
  }
  return result;
}
var extend = (a, b, thisArg, { allOwnKeys } = {}) => {
  forEach(b, (val, key) => {
    if (thisArg && isFunction(val)) {
      a[key] = bind(val, thisArg);
    } else {
      a[key] = val;
    }
  }, { allOwnKeys });
  return a;
};
var stripBOM = (content) => {
  if (content.charCodeAt(0) === 65279) {
    content = content.slice(1);
  }
  return content;
};
var inherits = (constructor, superConstructor, props, descriptors) => {
  constructor.prototype = Object.create(superConstructor.prototype, descriptors);
  constructor.prototype.constructor = constructor;
  Object.defineProperty(constructor, "super", {
    value: superConstructor.prototype
  });
  props && Object.assign(constructor.prototype, props);
};
var toFlatObject = (sourceObj, destObj, filter, propFilter) => {
  let props;
  let i;
  let prop;
  const merged = {};
  destObj = destObj || {};
  if (sourceObj == null)
    return destObj;
  do {
    props = Object.getOwnPropertyNames(sourceObj);
    i = props.length;
    while (i-- > 0) {
      prop = props[i];
      if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
        destObj[prop] = sourceObj[prop];
        merged[prop] = true;
      }
    }
    sourceObj = filter !== false && getPrototypeOf(sourceObj);
  } while (sourceObj && (!filter || filter(sourceObj, destObj)) && sourceObj !== Object.prototype);
  return destObj;
};
var endsWith = (str, searchString, position) => {
  str = String(str);
  if (position === undefined || position > str.length) {
    position = str.length;
  }
  position -= searchString.length;
  const lastIndex = str.indexOf(searchString, position);
  return lastIndex !== -1 && lastIndex === position;
};
var toArray = (thing) => {
  if (!thing)
    return null;
  if (isArray(thing))
    return thing;
  let i = thing.length;
  if (!isNumber(i))
    return null;
  const arr = new Array(i);
  while (i-- > 0) {
    arr[i] = thing[i];
  }
  return arr;
};
var isTypedArray = ((TypedArray) => {
  return (thing) => {
    return TypedArray && thing instanceof TypedArray;
  };
})(typeof Uint8Array !== "undefined" && getPrototypeOf(Uint8Array));
var forEachEntry = (obj, fn) => {
  const generator = obj && obj[iterator];
  const _iterator = generator.call(obj);
  let result;
  while ((result = _iterator.next()) && !result.done) {
    const pair = result.value;
    fn.call(obj, pair[0], pair[1]);
  }
};
var matchAll = (regExp, str) => {
  let matches;
  const arr = [];
  while ((matches = regExp.exec(str)) !== null) {
    arr.push(matches);
  }
  return arr;
};
var isHTMLForm = kindOfTest("HTMLFormElement");
var toCamelCase = (str) => {
  return str.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function replacer(m, p1, p2) {
    return p1.toUpperCase() + p2;
  });
};
var hasOwnProperty = (({ hasOwnProperty: hasOwnProperty2 }) => (obj, prop) => hasOwnProperty2.call(obj, prop))(Object.prototype);
var isRegExp = kindOfTest("RegExp");
var reduceDescriptors = (obj, reducer) => {
  const descriptors = Object.getOwnPropertyDescriptors(obj);
  const reducedDescriptors = {};
  forEach(descriptors, (descriptor, name) => {
    let ret;
    if ((ret = reducer(descriptor, name, obj)) !== false) {
      reducedDescriptors[name] = ret || descriptor;
    }
  });
  Object.defineProperties(obj, reducedDescriptors);
};
var freezeMethods = (obj) => {
  reduceDescriptors(obj, (descriptor, name) => {
    if (isFunction(obj) && ["arguments", "caller", "callee"].indexOf(name) !== -1) {
      return false;
    }
    const value = obj[name];
    if (!isFunction(value))
      return;
    descriptor.enumerable = false;
    if ("writable" in descriptor) {
      descriptor.writable = false;
      return;
    }
    if (!descriptor.set) {
      descriptor.set = () => {
        throw Error("Can not rewrite read-only method '" + name + "'");
      };
    }
  });
};
var toObjectSet = (arrayOrString, delimiter) => {
  const obj = {};
  const define = (arr) => {
    arr.forEach((value) => {
      obj[value] = true;
    });
  };
  isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));
  return obj;
};
var noop = () => {};
var toFiniteNumber = (value, defaultValue) => {
  return value != null && Number.isFinite(value = +value) ? value : defaultValue;
};
function isSpecCompliantForm(thing) {
  return !!(thing && isFunction(thing.append) && thing[toStringTag] === "FormData" && thing[iterator]);
}
var toJSONObject = (obj) => {
  const stack = new Array(10);
  const visit = (source, i) => {
    if (isObject(source)) {
      if (stack.indexOf(source) >= 0) {
        return;
      }
      if (!("toJSON" in source)) {
        stack[i] = source;
        const target = isArray(source) ? [] : {};
        forEach(source, (value, key) => {
          const reducedValue = visit(value, i + 1);
          !isUndefined(reducedValue) && (target[key] = reducedValue);
        });
        stack[i] = undefined;
        return target;
      }
    }
    return source;
  };
  return visit(obj, 0);
};
var isAsyncFn = kindOfTest("AsyncFunction");
var isThenable = (thing) => thing && (isObject(thing) || isFunction(thing)) && isFunction(thing.then) && isFunction(thing.catch);
var _setImmediate = ((setImmediateSupported, postMessageSupported) => {
  if (setImmediateSupported) {
    return setImmediate;
  }
  return postMessageSupported ? ((token, callbacks) => {
    _global.addEventListener("message", ({ source, data }) => {
      if (source === _global && data === token) {
        callbacks.length && callbacks.shift()();
      }
    }, false);
    return (cb) => {
      callbacks.push(cb);
      _global.postMessage(token, "*");
    };
  })(`axios@${Math.random()}`, []) : (cb) => setTimeout(cb);
})(typeof setImmediate === "function", isFunction(_global.postMessage));
var asap = typeof queueMicrotask !== "undefined" ? queueMicrotask.bind(_global) : typeof process !== "undefined" && process.nextTick || _setImmediate;
var isIterable = (thing) => thing != null && isFunction(thing[iterator]);
var utils_default = {
  isArray,
  isArrayBuffer,
  isBuffer,
  isFormData,
  isArrayBufferView,
  isString,
  isNumber,
  isBoolean,
  isObject,
  isPlainObject,
  isReadableStream,
  isRequest,
  isResponse,
  isHeaders,
  isUndefined,
  isDate,
  isFile,
  isBlob,
  isRegExp,
  isFunction,
  isStream,
  isURLSearchParams,
  isTypedArray,
  isFileList,
  forEach,
  merge,
  extend,
  trim,
  stripBOM,
  inherits,
  toFlatObject,
  kindOf,
  kindOfTest,
  endsWith,
  toArray,
  forEachEntry,
  matchAll,
  isHTMLForm,
  hasOwnProperty,
  hasOwnProp: hasOwnProperty,
  reduceDescriptors,
  freezeMethods,
  toObjectSet,
  toCamelCase,
  noop,
  toFiniteNumber,
  findKey,
  global: _global,
  isContextDefined,
  isSpecCompliantForm,
  toJSONObject,
  isAsyncFn,
  isThenable,
  setImmediate: _setImmediate,
  asap,
  isIterable
};

// ../../node_modules/axios/lib/core/AxiosError.js
function AxiosError(message, code, config, request, response) {
  Error.call(this);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = new Error().stack;
  }
  this.message = message;
  this.name = "AxiosError";
  code && (this.code = code);
  config && (this.config = config);
  request && (this.request = request);
  if (response) {
    this.response = response;
    this.status = response.status ? response.status : null;
  }
}
utils_default.inherits(AxiosError, Error, {
  toJSON: function toJSON() {
    return {
      message: this.message,
      name: this.name,
      description: this.description,
      number: this.number,
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      config: utils_default.toJSONObject(this.config),
      code: this.code,
      status: this.status
    };
  }
});
var prototype = AxiosError.prototype;
var descriptors = {};
[
  "ERR_BAD_OPTION_VALUE",
  "ERR_BAD_OPTION",
  "ECONNABORTED",
  "ETIMEDOUT",
  "ERR_NETWORK",
  "ERR_FR_TOO_MANY_REDIRECTS",
  "ERR_DEPRECATED",
  "ERR_BAD_RESPONSE",
  "ERR_BAD_REQUEST",
  "ERR_CANCELED",
  "ERR_NOT_SUPPORT",
  "ERR_INVALID_URL"
].forEach((code) => {
  descriptors[code] = { value: code };
});
Object.defineProperties(AxiosError, descriptors);
Object.defineProperty(prototype, "isAxiosError", { value: true });
AxiosError.from = (error, code, config, request, response, customProps) => {
  const axiosError = Object.create(prototype);
  utils_default.toFlatObject(error, axiosError, function filter(obj) {
    return obj !== Error.prototype;
  }, (prop) => {
    return prop !== "isAxiosError";
  });
  AxiosError.call(axiosError, error.message, code, config, request, response);
  axiosError.cause = error;
  axiosError.name = error.name;
  customProps && Object.assign(axiosError, customProps);
  return axiosError;
};
var AxiosError_default = AxiosError;

// ../../node_modules/axios/lib/helpers/null.js
var null_default = null;

// ../../node_modules/axios/lib/helpers/toFormData.js
function isVisitable(thing) {
  return utils_default.isPlainObject(thing) || utils_default.isArray(thing);
}
function removeBrackets(key) {
  return utils_default.endsWith(key, "[]") ? key.slice(0, -2) : key;
}
function renderKey(path, key, dots) {
  if (!path)
    return key;
  return path.concat(key).map(function each(token, i) {
    token = removeBrackets(token);
    return !dots && i ? "[" + token + "]" : token;
  }).join(dots ? "." : "");
}
function isFlatArray(arr) {
  return utils_default.isArray(arr) && !arr.some(isVisitable);
}
var predicates = utils_default.toFlatObject(utils_default, {}, null, function filter(prop) {
  return /^is[A-Z]/.test(prop);
});
function toFormData(obj, formData, options) {
  if (!utils_default.isObject(obj)) {
    throw new TypeError("target must be an object");
  }
  formData = formData || new (null_default || FormData);
  options = utils_default.toFlatObject(options, {
    metaTokens: true,
    dots: false,
    indexes: false
  }, false, function defined(option, source) {
    return !utils_default.isUndefined(source[option]);
  });
  const metaTokens = options.metaTokens;
  const visitor = options.visitor || defaultVisitor;
  const dots = options.dots;
  const indexes = options.indexes;
  const _Blob = options.Blob || typeof Blob !== "undefined" && Blob;
  const useBlob = _Blob && utils_default.isSpecCompliantForm(formData);
  if (!utils_default.isFunction(visitor)) {
    throw new TypeError("visitor must be a function");
  }
  function convertValue(value) {
    if (value === null)
      return "";
    if (utils_default.isDate(value)) {
      return value.toISOString();
    }
    if (!useBlob && utils_default.isBlob(value)) {
      throw new AxiosError_default("Blob is not supported. Use a Buffer instead.");
    }
    if (utils_default.isArrayBuffer(value) || utils_default.isTypedArray(value)) {
      return useBlob && typeof Blob === "function" ? new Blob([value]) : Buffer.from(value);
    }
    return value;
  }
  function defaultVisitor(value, key, path) {
    let arr = value;
    if (value && !path && typeof value === "object") {
      if (utils_default.endsWith(key, "{}")) {
        key = metaTokens ? key : key.slice(0, -2);
        value = JSON.stringify(value);
      } else if (utils_default.isArray(value) && isFlatArray(value) || (utils_default.isFileList(value) || utils_default.endsWith(key, "[]")) && (arr = utils_default.toArray(value))) {
        key = removeBrackets(key);
        arr.forEach(function each(el, index) {
          !(utils_default.isUndefined(el) || el === null) && formData.append(indexes === true ? renderKey([key], index, dots) : indexes === null ? key : key + "[]", convertValue(el));
        });
        return false;
      }
    }
    if (isVisitable(value)) {
      return true;
    }
    formData.append(renderKey(path, key, dots), convertValue(value));
    return false;
  }
  const stack = [];
  const exposedHelpers = Object.assign(predicates, {
    defaultVisitor,
    convertValue,
    isVisitable
  });
  function build(value, path) {
    if (utils_default.isUndefined(value))
      return;
    if (stack.indexOf(value) !== -1) {
      throw Error("Circular reference detected in " + path.join("."));
    }
    stack.push(value);
    utils_default.forEach(value, function each(el, key) {
      const result = !(utils_default.isUndefined(el) || el === null) && visitor.call(formData, el, utils_default.isString(key) ? key.trim() : key, path, exposedHelpers);
      if (result === true) {
        build(el, path ? path.concat(key) : [key]);
      }
    });
    stack.pop();
  }
  if (!utils_default.isObject(obj)) {
    throw new TypeError("data must be an object");
  }
  build(obj);
  return formData;
}
var toFormData_default = toFormData;

// ../../node_modules/axios/lib/helpers/AxiosURLSearchParams.js
function encode(str) {
  const charMap = {
    "!": "%21",
    "'": "%27",
    "(": "%28",
    ")": "%29",
    "~": "%7E",
    "%20": "+",
    "%00": "\x00"
  };
  return encodeURIComponent(str).replace(/[!'()~]|%20|%00/g, function replacer(match) {
    return charMap[match];
  });
}
function AxiosURLSearchParams(params, options) {
  this._pairs = [];
  params && toFormData_default(params, this, options);
}
var prototype2 = AxiosURLSearchParams.prototype;
prototype2.append = function append(name, value) {
  this._pairs.push([name, value]);
};
prototype2.toString = function toString2(encoder) {
  const _encode = encoder ? function(value) {
    return encoder.call(this, value, encode);
  } : encode;
  return this._pairs.map(function each(pair) {
    return _encode(pair[0]) + "=" + _encode(pair[1]);
  }, "").join("&");
};
var AxiosURLSearchParams_default = AxiosURLSearchParams;

// ../../node_modules/axios/lib/helpers/buildURL.js
function encode2(val) {
  return encodeURIComponent(val).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+").replace(/%5B/gi, "[").replace(/%5D/gi, "]");
}
function buildURL(url, params, options) {
  if (!params) {
    return url;
  }
  const _encode = options && options.encode || encode2;
  if (utils_default.isFunction(options)) {
    options = {
      serialize: options
    };
  }
  const serializeFn = options && options.serialize;
  let serializedParams;
  if (serializeFn) {
    serializedParams = serializeFn(params, options);
  } else {
    serializedParams = utils_default.isURLSearchParams(params) ? params.toString() : new AxiosURLSearchParams_default(params, options).toString(_encode);
  }
  if (serializedParams) {
    const hashmarkIndex = url.indexOf("#");
    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }
    url += (url.indexOf("?") === -1 ? "?" : "&") + serializedParams;
  }
  return url;
}

// ../../node_modules/axios/lib/core/InterceptorManager.js
class InterceptorManager {
  constructor() {
    this.handlers = [];
  }
  use(fulfilled, rejected, options) {
    this.handlers.push({
      fulfilled,
      rejected,
      synchronous: options ? options.synchronous : false,
      runWhen: options ? options.runWhen : null
    });
    return this.handlers.length - 1;
  }
  eject(id) {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }
  clear() {
    if (this.handlers) {
      this.handlers = [];
    }
  }
  forEach(fn) {
    utils_default.forEach(this.handlers, function forEachHandler(h) {
      if (h !== null) {
        fn(h);
      }
    });
  }
}
var InterceptorManager_default = InterceptorManager;

// ../../node_modules/axios/lib/defaults/transitional.js
var transitional_default = {
  silentJSONParsing: true,
  forcedJSONParsing: true,
  clarifyTimeoutError: false
};

// ../../node_modules/axios/lib/platform/browser/classes/URLSearchParams.js
var URLSearchParams_default = typeof URLSearchParams !== "undefined" ? URLSearchParams : AxiosURLSearchParams_default;

// ../../node_modules/axios/lib/platform/browser/classes/FormData.js
var FormData_default = typeof FormData !== "undefined" ? FormData : null;

// ../../node_modules/axios/lib/platform/browser/classes/Blob.js
var Blob_default = typeof Blob !== "undefined" ? Blob : null;

// ../../node_modules/axios/lib/platform/browser/index.js
var browser_default = {
  isBrowser: true,
  classes: {
    URLSearchParams: URLSearchParams_default,
    FormData: FormData_default,
    Blob: Blob_default
  },
  protocols: ["http", "https", "file", "blob", "url", "data"]
};

// ../../node_modules/axios/lib/platform/common/utils.js
var exports_utils = {};
__export(exports_utils, {
  origin: () => origin,
  navigator: () => _navigator,
  hasStandardBrowserWebWorkerEnv: () => hasStandardBrowserWebWorkerEnv,
  hasStandardBrowserEnv: () => hasStandardBrowserEnv,
  hasBrowserEnv: () => hasBrowserEnv
});
var hasBrowserEnv = typeof window !== "undefined" && typeof document !== "undefined";
var _navigator = typeof navigator === "object" && navigator || undefined;
var hasStandardBrowserEnv = hasBrowserEnv && (!_navigator || ["ReactNative", "NativeScript", "NS"].indexOf(_navigator.product) < 0);
var hasStandardBrowserWebWorkerEnv = (() => {
  return typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope && typeof self.importScripts === "function";
})();
var origin = hasBrowserEnv && window.location.href || "http://localhost";

// ../../node_modules/axios/lib/platform/index.js
var platform_default = {
  ...exports_utils,
  ...browser_default
};

// ../../node_modules/axios/lib/helpers/toURLEncodedForm.js
function toURLEncodedForm(data, options) {
  return toFormData_default(data, new platform_default.classes.URLSearchParams, Object.assign({
    visitor: function(value, key, path, helpers) {
      if (platform_default.isNode && utils_default.isBuffer(value)) {
        this.append(key, value.toString("base64"));
        return false;
      }
      return helpers.defaultVisitor.apply(this, arguments);
    }
  }, options));
}

// ../../node_modules/axios/lib/helpers/formDataToJSON.js
function parsePropPath(name) {
  return utils_default.matchAll(/\w+|\[(\w*)]/g, name).map((match) => {
    return match[0] === "[]" ? "" : match[1] || match[0];
  });
}
function arrayToObject(arr) {
  const obj = {};
  const keys = Object.keys(arr);
  let i;
  const len = keys.length;
  let key;
  for (i = 0;i < len; i++) {
    key = keys[i];
    obj[key] = arr[key];
  }
  return obj;
}
function formDataToJSON(formData) {
  function buildPath(path, value, target, index) {
    let name = path[index++];
    if (name === "__proto__")
      return true;
    const isNumericKey = Number.isFinite(+name);
    const isLast = index >= path.length;
    name = !name && utils_default.isArray(target) ? target.length : name;
    if (isLast) {
      if (utils_default.hasOwnProp(target, name)) {
        target[name] = [target[name], value];
      } else {
        target[name] = value;
      }
      return !isNumericKey;
    }
    if (!target[name] || !utils_default.isObject(target[name])) {
      target[name] = [];
    }
    const result = buildPath(path, value, target[name], index);
    if (result && utils_default.isArray(target[name])) {
      target[name] = arrayToObject(target[name]);
    }
    return !isNumericKey;
  }
  if (utils_default.isFormData(formData) && utils_default.isFunction(formData.entries)) {
    const obj = {};
    utils_default.forEachEntry(formData, (name, value) => {
      buildPath(parsePropPath(name), value, obj, 0);
    });
    return obj;
  }
  return null;
}
var formDataToJSON_default = formDataToJSON;

// ../../node_modules/axios/lib/defaults/index.js
function stringifySafely(rawValue, parser, encoder) {
  if (utils_default.isString(rawValue)) {
    try {
      (parser || JSON.parse)(rawValue);
      return utils_default.trim(rawValue);
    } catch (e) {
      if (e.name !== "SyntaxError") {
        throw e;
      }
    }
  }
  return (encoder || JSON.stringify)(rawValue);
}
var defaults = {
  transitional: transitional_default,
  adapter: ["xhr", "http", "fetch"],
  transformRequest: [function transformRequest(data, headers) {
    const contentType = headers.getContentType() || "";
    const hasJSONContentType = contentType.indexOf("application/json") > -1;
    const isObjectPayload = utils_default.isObject(data);
    if (isObjectPayload && utils_default.isHTMLForm(data)) {
      data = new FormData(data);
    }
    const isFormData2 = utils_default.isFormData(data);
    if (isFormData2) {
      return hasJSONContentType ? JSON.stringify(formDataToJSON_default(data)) : data;
    }
    if (utils_default.isArrayBuffer(data) || utils_default.isBuffer(data) || utils_default.isStream(data) || utils_default.isFile(data) || utils_default.isBlob(data) || utils_default.isReadableStream(data)) {
      return data;
    }
    if (utils_default.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils_default.isURLSearchParams(data)) {
      headers.setContentType("application/x-www-form-urlencoded;charset=utf-8", false);
      return data.toString();
    }
    let isFileList2;
    if (isObjectPayload) {
      if (contentType.indexOf("application/x-www-form-urlencoded") > -1) {
        return toURLEncodedForm(data, this.formSerializer).toString();
      }
      if ((isFileList2 = utils_default.isFileList(data)) || contentType.indexOf("multipart/form-data") > -1) {
        const _FormData = this.env && this.env.FormData;
        return toFormData_default(isFileList2 ? { "files[]": data } : data, _FormData && new _FormData, this.formSerializer);
      }
    }
    if (isObjectPayload || hasJSONContentType) {
      headers.setContentType("application/json", false);
      return stringifySafely(data);
    }
    return data;
  }],
  transformResponse: [function transformResponse(data) {
    const transitional = this.transitional || defaults.transitional;
    const forcedJSONParsing = transitional && transitional.forcedJSONParsing;
    const JSONRequested = this.responseType === "json";
    if (utils_default.isResponse(data) || utils_default.isReadableStream(data)) {
      return data;
    }
    if (data && utils_default.isString(data) && (forcedJSONParsing && !this.responseType || JSONRequested)) {
      const silentJSONParsing = transitional && transitional.silentJSONParsing;
      const strictJSONParsing = !silentJSONParsing && JSONRequested;
      try {
        return JSON.parse(data);
      } catch (e) {
        if (strictJSONParsing) {
          if (e.name === "SyntaxError") {
            throw AxiosError_default.from(e, AxiosError_default.ERR_BAD_RESPONSE, this, null, this.response);
          }
          throw e;
        }
      }
    }
    return data;
  }],
  timeout: 0,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  maxContentLength: -1,
  maxBodyLength: -1,
  env: {
    FormData: platform_default.classes.FormData,
    Blob: platform_default.classes.Blob
  },
  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  },
  headers: {
    common: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": undefined
    }
  }
};
utils_default.forEach(["delete", "get", "head", "post", "put", "patch"], (method) => {
  defaults.headers[method] = {};
});
var defaults_default = defaults;

// ../../node_modules/axios/lib/helpers/parseHeaders.js
var ignoreDuplicateOf = utils_default.toObjectSet([
  "age",
  "authorization",
  "content-length",
  "content-type",
  "etag",
  "expires",
  "from",
  "host",
  "if-modified-since",
  "if-unmodified-since",
  "last-modified",
  "location",
  "max-forwards",
  "proxy-authorization",
  "referer",
  "retry-after",
  "user-agent"
]);
var parseHeaders_default = (rawHeaders) => {
  const parsed = {};
  let key;
  let val;
  let i;
  rawHeaders && rawHeaders.split(`
`).forEach(function parser(line) {
    i = line.indexOf(":");
    key = line.substring(0, i).trim().toLowerCase();
    val = line.substring(i + 1).trim();
    if (!key || parsed[key] && ignoreDuplicateOf[key]) {
      return;
    }
    if (key === "set-cookie") {
      if (parsed[key]) {
        parsed[key].push(val);
      } else {
        parsed[key] = [val];
      }
    } else {
      parsed[key] = parsed[key] ? parsed[key] + ", " + val : val;
    }
  });
  return parsed;
};

// ../../node_modules/axios/lib/core/AxiosHeaders.js
var $internals = Symbol("internals");
function normalizeHeader(header) {
  return header && String(header).trim().toLowerCase();
}
function normalizeValue(value) {
  if (value === false || value == null) {
    return value;
  }
  return utils_default.isArray(value) ? value.map(normalizeValue) : String(value);
}
function parseTokens(str) {
  const tokens = Object.create(null);
  const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let match;
  while (match = tokensRE.exec(str)) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}
var isValidHeaderName = (str) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());
function matchHeaderValue(context, value, header, filter2, isHeaderNameFilter) {
  if (utils_default.isFunction(filter2)) {
    return filter2.call(this, value, header);
  }
  if (isHeaderNameFilter) {
    value = header;
  }
  if (!utils_default.isString(value))
    return;
  if (utils_default.isString(filter2)) {
    return value.indexOf(filter2) !== -1;
  }
  if (utils_default.isRegExp(filter2)) {
    return filter2.test(value);
  }
}
function formatHeader(header) {
  return header.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str) => {
    return char.toUpperCase() + str;
  });
}
function buildAccessors(obj, header) {
  const accessorName = utils_default.toCamelCase(" " + header);
  ["get", "set", "has"].forEach((methodName) => {
    Object.defineProperty(obj, methodName + accessorName, {
      value: function(arg1, arg2, arg3) {
        return this[methodName].call(this, header, arg1, arg2, arg3);
      },
      configurable: true
    });
  });
}

class AxiosHeaders {
  constructor(headers) {
    headers && this.set(headers);
  }
  set(header, valueOrRewrite, rewrite) {
    const self2 = this;
    function setHeader(_value, _header, _rewrite) {
      const lHeader = normalizeHeader(_header);
      if (!lHeader) {
        throw new Error("header name must be a non-empty string");
      }
      const key = utils_default.findKey(self2, lHeader);
      if (!key || self2[key] === undefined || _rewrite === true || _rewrite === undefined && self2[key] !== false) {
        self2[key || _header] = normalizeValue(_value);
      }
    }
    const setHeaders = (headers, _rewrite) => utils_default.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));
    if (utils_default.isPlainObject(header) || header instanceof this.constructor) {
      setHeaders(header, valueOrRewrite);
    } else if (utils_default.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
      setHeaders(parseHeaders_default(header), valueOrRewrite);
    } else if (utils_default.isObject(header) && utils_default.isIterable(header)) {
      let obj = {}, dest, key;
      for (const entry of header) {
        if (!utils_default.isArray(entry)) {
          throw TypeError("Object iterator must return a key-value pair");
        }
        obj[key = entry[0]] = (dest = obj[key]) ? utils_default.isArray(dest) ? [...dest, entry[1]] : [dest, entry[1]] : entry[1];
      }
      setHeaders(obj, valueOrRewrite);
    } else {
      header != null && setHeader(valueOrRewrite, header, rewrite);
    }
    return this;
  }
  get(header, parser) {
    header = normalizeHeader(header);
    if (header) {
      const key = utils_default.findKey(this, header);
      if (key) {
        const value = this[key];
        if (!parser) {
          return value;
        }
        if (parser === true) {
          return parseTokens(value);
        }
        if (utils_default.isFunction(parser)) {
          return parser.call(this, value, key);
        }
        if (utils_default.isRegExp(parser)) {
          return parser.exec(value);
        }
        throw new TypeError("parser must be boolean|regexp|function");
      }
    }
  }
  has(header, matcher) {
    header = normalizeHeader(header);
    if (header) {
      const key = utils_default.findKey(this, header);
      return !!(key && this[key] !== undefined && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
    }
    return false;
  }
  delete(header, matcher) {
    const self2 = this;
    let deleted = false;
    function deleteHeader(_header) {
      _header = normalizeHeader(_header);
      if (_header) {
        const key = utils_default.findKey(self2, _header);
        if (key && (!matcher || matchHeaderValue(self2, self2[key], key, matcher))) {
          delete self2[key];
          deleted = true;
        }
      }
    }
    if (utils_default.isArray(header)) {
      header.forEach(deleteHeader);
    } else {
      deleteHeader(header);
    }
    return deleted;
  }
  clear(matcher) {
    const keys = Object.keys(this);
    let i = keys.length;
    let deleted = false;
    while (i--) {
      const key = keys[i];
      if (!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
        delete this[key];
        deleted = true;
      }
    }
    return deleted;
  }
  normalize(format) {
    const self2 = this;
    const headers = {};
    utils_default.forEach(this, (value, header) => {
      const key = utils_default.findKey(headers, header);
      if (key) {
        self2[key] = normalizeValue(value);
        delete self2[header];
        return;
      }
      const normalized = format ? formatHeader(header) : String(header).trim();
      if (normalized !== header) {
        delete self2[header];
      }
      self2[normalized] = normalizeValue(value);
      headers[normalized] = true;
    });
    return this;
  }
  concat(...targets) {
    return this.constructor.concat(this, ...targets);
  }
  toJSON(asStrings) {
    const obj = Object.create(null);
    utils_default.forEach(this, (value, header) => {
      value != null && value !== false && (obj[header] = asStrings && utils_default.isArray(value) ? value.join(", ") : value);
    });
    return obj;
  }
  [Symbol.iterator]() {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }
  toString() {
    return Object.entries(this.toJSON()).map(([header, value]) => header + ": " + value).join(`
`);
  }
  getSetCookie() {
    return this.get("set-cookie") || [];
  }
  get [Symbol.toStringTag]() {
    return "AxiosHeaders";
  }
  static from(thing) {
    return thing instanceof this ? thing : new this(thing);
  }
  static concat(first, ...targets) {
    const computed = new this(first);
    targets.forEach((target) => computed.set(target));
    return computed;
  }
  static accessor(header) {
    const internals = this[$internals] = this[$internals] = {
      accessors: {}
    };
    const accessors = internals.accessors;
    const prototype3 = this.prototype;
    function defineAccessor(_header) {
      const lHeader = normalizeHeader(_header);
      if (!accessors[lHeader]) {
        buildAccessors(prototype3, _header);
        accessors[lHeader] = true;
      }
    }
    utils_default.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);
    return this;
  }
}
AxiosHeaders.accessor(["Content-Type", "Content-Length", "Accept", "Accept-Encoding", "User-Agent", "Authorization"]);
utils_default.reduceDescriptors(AxiosHeaders.prototype, ({ value }, key) => {
  let mapped = key[0].toUpperCase() + key.slice(1);
  return {
    get: () => value,
    set(headerValue) {
      this[mapped] = headerValue;
    }
  };
});
utils_default.freezeMethods(AxiosHeaders);
var AxiosHeaders_default = AxiosHeaders;

// ../../node_modules/axios/lib/core/transformData.js
function transformData(fns, response) {
  const config = this || defaults_default;
  const context = response || config;
  const headers = AxiosHeaders_default.from(context.headers);
  let data = context.data;
  utils_default.forEach(fns, function transform(fn) {
    data = fn.call(config, data, headers.normalize(), response ? response.status : undefined);
  });
  headers.normalize();
  return data;
}

// ../../node_modules/axios/lib/cancel/isCancel.js
function isCancel(value) {
  return !!(value && value.__CANCEL__);
}

// ../../node_modules/axios/lib/cancel/CanceledError.js
function CanceledError(message, config, request) {
  AxiosError_default.call(this, message == null ? "canceled" : message, AxiosError_default.ERR_CANCELED, config, request);
  this.name = "CanceledError";
}
utils_default.inherits(CanceledError, AxiosError_default, {
  __CANCEL__: true
});
var CanceledError_default = CanceledError;

// ../../node_modules/axios/lib/core/settle.js
function settle(resolve, reject, response) {
  const validateStatus2 = response.config.validateStatus;
  if (!response.status || !validateStatus2 || validateStatus2(response.status)) {
    resolve(response);
  } else {
    reject(new AxiosError_default("Request failed with status code " + response.status, [AxiosError_default.ERR_BAD_REQUEST, AxiosError_default.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4], response.config, response.request, response));
  }
}

// ../../node_modules/axios/lib/helpers/parseProtocol.js
function parseProtocol(url) {
  const match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
  return match && match[1] || "";
}

// ../../node_modules/axios/lib/helpers/speedometer.js
function speedometer(samplesCount, min) {
  samplesCount = samplesCount || 10;
  const bytes = new Array(samplesCount);
  const timestamps = new Array(samplesCount);
  let head = 0;
  let tail = 0;
  let firstSampleTS;
  min = min !== undefined ? min : 1000;
  return function push(chunkLength) {
    const now = Date.now();
    const startedAt = timestamps[tail];
    if (!firstSampleTS) {
      firstSampleTS = now;
    }
    bytes[head] = chunkLength;
    timestamps[head] = now;
    let i = tail;
    let bytesCount = 0;
    while (i !== head) {
      bytesCount += bytes[i++];
      i = i % samplesCount;
    }
    head = (head + 1) % samplesCount;
    if (head === tail) {
      tail = (tail + 1) % samplesCount;
    }
    if (now - firstSampleTS < min) {
      return;
    }
    const passed = startedAt && now - startedAt;
    return passed ? Math.round(bytesCount * 1000 / passed) : undefined;
  };
}
var speedometer_default = speedometer;

// ../../node_modules/axios/lib/helpers/throttle.js
function throttle(fn, freq) {
  let timestamp = 0;
  let threshold = 1000 / freq;
  let lastArgs;
  let timer;
  const invoke = (args, now = Date.now()) => {
    timestamp = now;
    lastArgs = null;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    fn.apply(null, args);
  };
  const throttled = (...args) => {
    const now = Date.now();
    const passed = now - timestamp;
    if (passed >= threshold) {
      invoke(args, now);
    } else {
      lastArgs = args;
      if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          invoke(lastArgs);
        }, threshold - passed);
      }
    }
  };
  const flush = () => lastArgs && invoke(lastArgs);
  return [throttled, flush];
}
var throttle_default = throttle;

// ../../node_modules/axios/lib/helpers/progressEventReducer.js
var progressEventReducer = (listener, isDownloadStream, freq = 3) => {
  let bytesNotified = 0;
  const _speedometer = speedometer_default(50, 250);
  return throttle_default((e) => {
    const loaded = e.loaded;
    const total = e.lengthComputable ? e.total : undefined;
    const progressBytes = loaded - bytesNotified;
    const rate = _speedometer(progressBytes);
    const inRange = loaded <= total;
    bytesNotified = loaded;
    const data = {
      loaded,
      total,
      progress: total ? loaded / total : undefined,
      bytes: progressBytes,
      rate: rate ? rate : undefined,
      estimated: rate && total && inRange ? (total - loaded) / rate : undefined,
      event: e,
      lengthComputable: total != null,
      [isDownloadStream ? "download" : "upload"]: true
    };
    listener(data);
  }, freq);
};
var progressEventDecorator = (total, throttled) => {
  const lengthComputable = total != null;
  return [(loaded) => throttled[0]({
    lengthComputable,
    total,
    loaded
  }), throttled[1]];
};
var asyncDecorator = (fn) => (...args) => utils_default.asap(() => fn(...args));

// ../../node_modules/axios/lib/helpers/isURLSameOrigin.js
var isURLSameOrigin_default = platform_default.hasStandardBrowserEnv ? ((origin2, isMSIE) => (url) => {
  url = new URL(url, platform_default.origin);
  return origin2.protocol === url.protocol && origin2.host === url.host && (isMSIE || origin2.port === url.port);
})(new URL(platform_default.origin), platform_default.navigator && /(msie|trident)/i.test(platform_default.navigator.userAgent)) : () => true;

// ../../node_modules/axios/lib/helpers/cookies.js
var cookies_default = platform_default.hasStandardBrowserEnv ? {
  write(name, value, expires, path, domain, secure) {
    const cookie = [name + "=" + encodeURIComponent(value)];
    utils_default.isNumber(expires) && cookie.push("expires=" + new Date(expires).toGMTString());
    utils_default.isString(path) && cookie.push("path=" + path);
    utils_default.isString(domain) && cookie.push("domain=" + domain);
    secure === true && cookie.push("secure");
    document.cookie = cookie.join("; ");
  },
  read(name) {
    const match = document.cookie.match(new RegExp("(^|;\\s*)(" + name + ")=([^;]*)"));
    return match ? decodeURIComponent(match[3]) : null;
  },
  remove(name) {
    this.write(name, "", Date.now() - 86400000);
  }
} : {
  write() {},
  read() {
    return null;
  },
  remove() {}
};

// ../../node_modules/axios/lib/helpers/isAbsoluteURL.js
function isAbsoluteURL(url) {
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
}

// ../../node_modules/axios/lib/helpers/combineURLs.js
function combineURLs(baseURL, relativeURL) {
  return relativeURL ? baseURL.replace(/\/?\/$/, "") + "/" + relativeURL.replace(/^\/+/, "") : baseURL;
}

// ../../node_modules/axios/lib/core/buildFullPath.js
function buildFullPath(baseURL, requestedURL, allowAbsoluteUrls) {
  let isRelativeUrl = !isAbsoluteURL(requestedURL);
  if (baseURL && (isRelativeUrl || allowAbsoluteUrls == false)) {
    return combineURLs(baseURL, requestedURL);
  }
  return requestedURL;
}

// ../../node_modules/axios/lib/core/mergeConfig.js
var headersToObject = (thing) => thing instanceof AxiosHeaders_default ? { ...thing } : thing;
function mergeConfig(config1, config2) {
  config2 = config2 || {};
  const config = {};
  function getMergedValue(target, source, prop, caseless) {
    if (utils_default.isPlainObject(target) && utils_default.isPlainObject(source)) {
      return utils_default.merge.call({ caseless }, target, source);
    } else if (utils_default.isPlainObject(source)) {
      return utils_default.merge({}, source);
    } else if (utils_default.isArray(source)) {
      return source.slice();
    }
    return source;
  }
  function mergeDeepProperties(a, b, prop, caseless) {
    if (!utils_default.isUndefined(b)) {
      return getMergedValue(a, b, prop, caseless);
    } else if (!utils_default.isUndefined(a)) {
      return getMergedValue(undefined, a, prop, caseless);
    }
  }
  function valueFromConfig2(a, b) {
    if (!utils_default.isUndefined(b)) {
      return getMergedValue(undefined, b);
    }
  }
  function defaultToConfig2(a, b) {
    if (!utils_default.isUndefined(b)) {
      return getMergedValue(undefined, b);
    } else if (!utils_default.isUndefined(a)) {
      return getMergedValue(undefined, a);
    }
  }
  function mergeDirectKeys(a, b, prop) {
    if (prop in config2) {
      return getMergedValue(a, b);
    } else if (prop in config1) {
      return getMergedValue(undefined, a);
    }
  }
  const mergeMap = {
    url: valueFromConfig2,
    method: valueFromConfig2,
    data: valueFromConfig2,
    baseURL: defaultToConfig2,
    transformRequest: defaultToConfig2,
    transformResponse: defaultToConfig2,
    paramsSerializer: defaultToConfig2,
    timeout: defaultToConfig2,
    timeoutMessage: defaultToConfig2,
    withCredentials: defaultToConfig2,
    withXSRFToken: defaultToConfig2,
    adapter: defaultToConfig2,
    responseType: defaultToConfig2,
    xsrfCookieName: defaultToConfig2,
    xsrfHeaderName: defaultToConfig2,
    onUploadProgress: defaultToConfig2,
    onDownloadProgress: defaultToConfig2,
    decompress: defaultToConfig2,
    maxContentLength: defaultToConfig2,
    maxBodyLength: defaultToConfig2,
    beforeRedirect: defaultToConfig2,
    transport: defaultToConfig2,
    httpAgent: defaultToConfig2,
    httpsAgent: defaultToConfig2,
    cancelToken: defaultToConfig2,
    socketPath: defaultToConfig2,
    responseEncoding: defaultToConfig2,
    validateStatus: mergeDirectKeys,
    headers: (a, b, prop) => mergeDeepProperties(headersToObject(a), headersToObject(b), prop, true)
  };
  utils_default.forEach(Object.keys(Object.assign({}, config1, config2)), function computeConfigValue(prop) {
    const merge2 = mergeMap[prop] || mergeDeepProperties;
    const configValue = merge2(config1[prop], config2[prop], prop);
    utils_default.isUndefined(configValue) && merge2 !== mergeDirectKeys || (config[prop] = configValue);
  });
  return config;
}

// ../../node_modules/axios/lib/helpers/resolveConfig.js
var resolveConfig_default = (config) => {
  const newConfig = mergeConfig({}, config);
  let { data, withXSRFToken, xsrfHeaderName, xsrfCookieName, headers, auth } = newConfig;
  newConfig.headers = headers = AxiosHeaders_default.from(headers);
  newConfig.url = buildURL(buildFullPath(newConfig.baseURL, newConfig.url, newConfig.allowAbsoluteUrls), config.params, config.paramsSerializer);
  if (auth) {
    headers.set("Authorization", "Basic " + btoa((auth.username || "") + ":" + (auth.password ? unescape(encodeURIComponent(auth.password)) : "")));
  }
  let contentType;
  if (utils_default.isFormData(data)) {
    if (platform_default.hasStandardBrowserEnv || platform_default.hasStandardBrowserWebWorkerEnv) {
      headers.setContentType(undefined);
    } else if ((contentType = headers.getContentType()) !== false) {
      const [type, ...tokens] = contentType ? contentType.split(";").map((token) => token.trim()).filter(Boolean) : [];
      headers.setContentType([type || "multipart/form-data", ...tokens].join("; "));
    }
  }
  if (platform_default.hasStandardBrowserEnv) {
    withXSRFToken && utils_default.isFunction(withXSRFToken) && (withXSRFToken = withXSRFToken(newConfig));
    if (withXSRFToken || withXSRFToken !== false && isURLSameOrigin_default(newConfig.url)) {
      const xsrfValue = xsrfHeaderName && xsrfCookieName && cookies_default.read(xsrfCookieName);
      if (xsrfValue) {
        headers.set(xsrfHeaderName, xsrfValue);
      }
    }
  }
  return newConfig;
};

// ../../node_modules/axios/lib/adapters/xhr.js
var isXHRAdapterSupported = typeof XMLHttpRequest !== "undefined";
var xhr_default = isXHRAdapterSupported && function(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    const _config = resolveConfig_default(config);
    let requestData = _config.data;
    const requestHeaders = AxiosHeaders_default.from(_config.headers).normalize();
    let { responseType, onUploadProgress, onDownloadProgress } = _config;
    let onCanceled;
    let uploadThrottled, downloadThrottled;
    let flushUpload, flushDownload;
    function done() {
      flushUpload && flushUpload();
      flushDownload && flushDownload();
      _config.cancelToken && _config.cancelToken.unsubscribe(onCanceled);
      _config.signal && _config.signal.removeEventListener("abort", onCanceled);
    }
    let request = new XMLHttpRequest;
    request.open(_config.method.toUpperCase(), _config.url, true);
    request.timeout = _config.timeout;
    function onloadend() {
      if (!request) {
        return;
      }
      const responseHeaders = AxiosHeaders_default.from("getAllResponseHeaders" in request && request.getAllResponseHeaders());
      const responseData = !responseType || responseType === "text" || responseType === "json" ? request.responseText : request.response;
      const response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config,
        request
      };
      settle(function _resolve(value) {
        resolve(value);
        done();
      }, function _reject(err) {
        reject(err);
        done();
      }, response);
      request = null;
    }
    if ("onloadend" in request) {
      request.onloadend = onloadend;
    } else {
      request.onreadystatechange = function handleLoad() {
        if (!request || request.readyState !== 4) {
          return;
        }
        if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf("file:") === 0)) {
          return;
        }
        setTimeout(onloadend);
      };
    }
    request.onabort = function handleAbort() {
      if (!request) {
        return;
      }
      reject(new AxiosError_default("Request aborted", AxiosError_default.ECONNABORTED, config, request));
      request = null;
    };
    request.onerror = function handleError() {
      reject(new AxiosError_default("Network Error", AxiosError_default.ERR_NETWORK, config, request));
      request = null;
    };
    request.ontimeout = function handleTimeout() {
      let timeoutErrorMessage = _config.timeout ? "timeout of " + _config.timeout + "ms exceeded" : "timeout exceeded";
      const transitional = _config.transitional || transitional_default;
      if (_config.timeoutErrorMessage) {
        timeoutErrorMessage = _config.timeoutErrorMessage;
      }
      reject(new AxiosError_default(timeoutErrorMessage, transitional.clarifyTimeoutError ? AxiosError_default.ETIMEDOUT : AxiosError_default.ECONNABORTED, config, request));
      request = null;
    };
    requestData === undefined && requestHeaders.setContentType(null);
    if ("setRequestHeader" in request) {
      utils_default.forEach(requestHeaders.toJSON(), function setRequestHeader(val, key) {
        request.setRequestHeader(key, val);
      });
    }
    if (!utils_default.isUndefined(_config.withCredentials)) {
      request.withCredentials = !!_config.withCredentials;
    }
    if (responseType && responseType !== "json") {
      request.responseType = _config.responseType;
    }
    if (onDownloadProgress) {
      [downloadThrottled, flushDownload] = progressEventReducer(onDownloadProgress, true);
      request.addEventListener("progress", downloadThrottled);
    }
    if (onUploadProgress && request.upload) {
      [uploadThrottled, flushUpload] = progressEventReducer(onUploadProgress);
      request.upload.addEventListener("progress", uploadThrottled);
      request.upload.addEventListener("loadend", flushUpload);
    }
    if (_config.cancelToken || _config.signal) {
      onCanceled = (cancel) => {
        if (!request) {
          return;
        }
        reject(!cancel || cancel.type ? new CanceledError_default(null, config, request) : cancel);
        request.abort();
        request = null;
      };
      _config.cancelToken && _config.cancelToken.subscribe(onCanceled);
      if (_config.signal) {
        _config.signal.aborted ? onCanceled() : _config.signal.addEventListener("abort", onCanceled);
      }
    }
    const protocol = parseProtocol(_config.url);
    if (protocol && platform_default.protocols.indexOf(protocol) === -1) {
      reject(new AxiosError_default("Unsupported protocol " + protocol + ":", AxiosError_default.ERR_BAD_REQUEST, config));
      return;
    }
    request.send(requestData || null);
  });
};

// ../../node_modules/axios/lib/helpers/composeSignals.js
var composeSignals = (signals, timeout) => {
  const { length } = signals = signals ? signals.filter(Boolean) : [];
  if (timeout || length) {
    let controller = new AbortController;
    let aborted;
    const onabort = function(reason) {
      if (!aborted) {
        aborted = true;
        unsubscribe();
        const err = reason instanceof Error ? reason : this.reason;
        controller.abort(err instanceof AxiosError_default ? err : new CanceledError_default(err instanceof Error ? err.message : err));
      }
    };
    let timer = timeout && setTimeout(() => {
      timer = null;
      onabort(new AxiosError_default(`timeout ${timeout} of ms exceeded`, AxiosError_default.ETIMEDOUT));
    }, timeout);
    const unsubscribe = () => {
      if (signals) {
        timer && clearTimeout(timer);
        timer = null;
        signals.forEach((signal2) => {
          signal2.unsubscribe ? signal2.unsubscribe(onabort) : signal2.removeEventListener("abort", onabort);
        });
        signals = null;
      }
    };
    signals.forEach((signal2) => signal2.addEventListener("abort", onabort));
    const { signal } = controller;
    signal.unsubscribe = () => utils_default.asap(unsubscribe);
    return signal;
  }
};
var composeSignals_default = composeSignals;

// ../../node_modules/axios/lib/helpers/trackStream.js
var streamChunk = function* (chunk, chunkSize) {
  let len = chunk.byteLength;
  if (!chunkSize || len < chunkSize) {
    yield chunk;
    return;
  }
  let pos = 0;
  let end;
  while (pos < len) {
    end = pos + chunkSize;
    yield chunk.slice(pos, end);
    pos = end;
  }
};
var readBytes = async function* (iterable, chunkSize) {
  for await (const chunk of readStream(iterable)) {
    yield* streamChunk(chunk, chunkSize);
  }
};
var readStream = async function* (stream) {
  if (stream[Symbol.asyncIterator]) {
    yield* stream;
    return;
  }
  const reader = stream.getReader();
  try {
    for (;; ) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      yield value;
    }
  } finally {
    await reader.cancel();
  }
};
var trackStream = (stream, chunkSize, onProgress, onFinish) => {
  const iterator2 = readBytes(stream, chunkSize);
  let bytes = 0;
  let done;
  let _onFinish = (e) => {
    if (!done) {
      done = true;
      onFinish && onFinish(e);
    }
  };
  return new ReadableStream({
    async pull(controller) {
      try {
        const { done: done2, value } = await iterator2.next();
        if (done2) {
          _onFinish();
          controller.close();
          return;
        }
        let len = value.byteLength;
        if (onProgress) {
          let loadedBytes = bytes += len;
          onProgress(loadedBytes);
        }
        controller.enqueue(new Uint8Array(value));
      } catch (err) {
        _onFinish(err);
        throw err;
      }
    },
    cancel(reason) {
      _onFinish(reason);
      return iterator2.return();
    }
  }, {
    highWaterMark: 2
  });
};

// ../../node_modules/axios/lib/adapters/fetch.js
var isFetchSupported = typeof fetch === "function" && typeof Request === "function" && typeof Response === "function";
var isReadableStreamSupported = isFetchSupported && typeof ReadableStream === "function";
var encodeText = isFetchSupported && (typeof TextEncoder === "function" ? ((encoder) => (str) => encoder.encode(str))(new TextEncoder) : async (str) => new Uint8Array(await new Response(str).arrayBuffer()));
var test = (fn, ...args) => {
  try {
    return !!fn(...args);
  } catch (e) {
    return false;
  }
};
var supportsRequestStream = isReadableStreamSupported && test(() => {
  let duplexAccessed = false;
  const hasContentType = new Request(platform_default.origin, {
    body: new ReadableStream,
    method: "POST",
    get duplex() {
      duplexAccessed = true;
      return "half";
    }
  }).headers.has("Content-Type");
  return duplexAccessed && !hasContentType;
});
var DEFAULT_CHUNK_SIZE = 64 * 1024;
var supportsResponseStream = isReadableStreamSupported && test(() => utils_default.isReadableStream(new Response("").body));
var resolvers = {
  stream: supportsResponseStream && ((res) => res.body)
};
isFetchSupported && ((res) => {
  ["text", "arrayBuffer", "blob", "formData", "stream"].forEach((type) => {
    !resolvers[type] && (resolvers[type] = utils_default.isFunction(res[type]) ? (res2) => res2[type]() : (_, config) => {
      throw new AxiosError_default(`Response type '${type}' is not supported`, AxiosError_default.ERR_NOT_SUPPORT, config);
    });
  });
})(new Response);
var getBodyLength = async (body) => {
  if (body == null) {
    return 0;
  }
  if (utils_default.isBlob(body)) {
    return body.size;
  }
  if (utils_default.isSpecCompliantForm(body)) {
    const _request = new Request(platform_default.origin, {
      method: "POST",
      body
    });
    return (await _request.arrayBuffer()).byteLength;
  }
  if (utils_default.isArrayBufferView(body) || utils_default.isArrayBuffer(body)) {
    return body.byteLength;
  }
  if (utils_default.isURLSearchParams(body)) {
    body = body + "";
  }
  if (utils_default.isString(body)) {
    return (await encodeText(body)).byteLength;
  }
};
var resolveBodyLength = async (headers, body) => {
  const length = utils_default.toFiniteNumber(headers.getContentLength());
  return length == null ? getBodyLength(body) : length;
};
var fetch_default = isFetchSupported && (async (config) => {
  let {
    url,
    method,
    data,
    signal,
    cancelToken,
    timeout,
    onDownloadProgress,
    onUploadProgress,
    responseType,
    headers,
    withCredentials = "same-origin",
    fetchOptions
  } = resolveConfig_default(config);
  responseType = responseType ? (responseType + "").toLowerCase() : "text";
  let composedSignal = composeSignals_default([signal, cancelToken && cancelToken.toAbortSignal()], timeout);
  let request;
  const unsubscribe = composedSignal && composedSignal.unsubscribe && (() => {
    composedSignal.unsubscribe();
  });
  let requestContentLength;
  try {
    if (onUploadProgress && supportsRequestStream && method !== "get" && method !== "head" && (requestContentLength = await resolveBodyLength(headers, data)) !== 0) {
      let _request = new Request(url, {
        method: "POST",
        body: data,
        duplex: "half"
      });
      let contentTypeHeader;
      if (utils_default.isFormData(data) && (contentTypeHeader = _request.headers.get("content-type"))) {
        headers.setContentType(contentTypeHeader);
      }
      if (_request.body) {
        const [onProgress, flush] = progressEventDecorator(requestContentLength, progressEventReducer(asyncDecorator(onUploadProgress)));
        data = trackStream(_request.body, DEFAULT_CHUNK_SIZE, onProgress, flush);
      }
    }
    if (!utils_default.isString(withCredentials)) {
      withCredentials = withCredentials ? "include" : "omit";
    }
    const isCredentialsSupported = "credentials" in Request.prototype;
    request = new Request(url, {
      ...fetchOptions,
      signal: composedSignal,
      method: method.toUpperCase(),
      headers: headers.normalize().toJSON(),
      body: data,
      duplex: "half",
      credentials: isCredentialsSupported ? withCredentials : undefined
    });
    let response = await fetch(request);
    const isStreamResponse = supportsResponseStream && (responseType === "stream" || responseType === "response");
    if (supportsResponseStream && (onDownloadProgress || isStreamResponse && unsubscribe)) {
      const options = {};
      ["status", "statusText", "headers"].forEach((prop) => {
        options[prop] = response[prop];
      });
      const responseContentLength = utils_default.toFiniteNumber(response.headers.get("content-length"));
      const [onProgress, flush] = onDownloadProgress && progressEventDecorator(responseContentLength, progressEventReducer(asyncDecorator(onDownloadProgress), true)) || [];
      response = new Response(trackStream(response.body, DEFAULT_CHUNK_SIZE, onProgress, () => {
        flush && flush();
        unsubscribe && unsubscribe();
      }), options);
    }
    responseType = responseType || "text";
    let responseData = await resolvers[utils_default.findKey(resolvers, responseType) || "text"](response, config);
    !isStreamResponse && unsubscribe && unsubscribe();
    return await new Promise((resolve, reject) => {
      settle(resolve, reject, {
        data: responseData,
        headers: AxiosHeaders_default.from(response.headers),
        status: response.status,
        statusText: response.statusText,
        config,
        request
      });
    });
  } catch (err) {
    unsubscribe && unsubscribe();
    if (err && err.name === "TypeError" && /Load failed|fetch/i.test(err.message)) {
      throw Object.assign(new AxiosError_default("Network Error", AxiosError_default.ERR_NETWORK, config, request), {
        cause: err.cause || err
      });
    }
    throw AxiosError_default.from(err, err && err.code, config, request);
  }
});

// ../../node_modules/axios/lib/adapters/adapters.js
var knownAdapters = {
  http: null_default,
  xhr: xhr_default,
  fetch: fetch_default
};
utils_default.forEach(knownAdapters, (fn, value) => {
  if (fn) {
    try {
      Object.defineProperty(fn, "name", { value });
    } catch (e) {}
    Object.defineProperty(fn, "adapterName", { value });
  }
});
var renderReason = (reason) => `- ${reason}`;
var isResolvedHandle = (adapter) => utils_default.isFunction(adapter) || adapter === null || adapter === false;
var adapters_default = {
  getAdapter: (adapters) => {
    adapters = utils_default.isArray(adapters) ? adapters : [adapters];
    const { length } = adapters;
    let nameOrAdapter;
    let adapter;
    const rejectedReasons = {};
    for (let i = 0;i < length; i++) {
      nameOrAdapter = adapters[i];
      let id;
      adapter = nameOrAdapter;
      if (!isResolvedHandle(nameOrAdapter)) {
        adapter = knownAdapters[(id = String(nameOrAdapter)).toLowerCase()];
        if (adapter === undefined) {
          throw new AxiosError_default(`Unknown adapter '${id}'`);
        }
      }
      if (adapter) {
        break;
      }
      rejectedReasons[id || "#" + i] = adapter;
    }
    if (!adapter) {
      const reasons = Object.entries(rejectedReasons).map(([id, state]) => `adapter ${id} ` + (state === false ? "is not supported by the environment" : "is not available in the build"));
      let s = length ? reasons.length > 1 ? `since :
` + reasons.map(renderReason).join(`
`) : " " + renderReason(reasons[0]) : "as no adapter specified";
      throw new AxiosError_default(`There is no suitable adapter to dispatch the request ` + s, "ERR_NOT_SUPPORT");
    }
    return adapter;
  },
  adapters: knownAdapters
};

// ../../node_modules/axios/lib/core/dispatchRequest.js
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
  if (config.signal && config.signal.aborted) {
    throw new CanceledError_default(null, config);
  }
}
function dispatchRequest(config) {
  throwIfCancellationRequested(config);
  config.headers = AxiosHeaders_default.from(config.headers);
  config.data = transformData.call(config, config.transformRequest);
  if (["post", "put", "patch"].indexOf(config.method) !== -1) {
    config.headers.setContentType("application/x-www-form-urlencoded", false);
  }
  const adapter = adapters_default.getAdapter(config.adapter || defaults_default.adapter);
  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);
    response.data = transformData.call(config, config.transformResponse, response);
    response.headers = AxiosHeaders_default.from(response.headers);
    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);
      if (reason && reason.response) {
        reason.response.data = transformData.call(config, config.transformResponse, reason.response);
        reason.response.headers = AxiosHeaders_default.from(reason.response.headers);
      }
    }
    return Promise.reject(reason);
  });
}

// ../../node_modules/axios/lib/env/data.js
var VERSION = "1.9.0";

// ../../node_modules/axios/lib/helpers/validator.js
var validators = {};
["object", "boolean", "number", "function", "string", "symbol"].forEach((type, i) => {
  validators[type] = function validator(thing) {
    return typeof thing === type || "a" + (i < 1 ? "n " : " ") + type;
  };
});
var deprecatedWarnings = {};
validators.transitional = function transitional(validator, version, message) {
  function formatMessage(opt, desc) {
    return "[Axios v" + VERSION + "] Transitional option '" + opt + "'" + desc + (message ? ". " + message : "");
  }
  return (value, opt, opts) => {
    if (validator === false) {
      throw new AxiosError_default(formatMessage(opt, " has been removed" + (version ? " in " + version : "")), AxiosError_default.ERR_DEPRECATED);
    }
    if (version && !deprecatedWarnings[opt]) {
      deprecatedWarnings[opt] = true;
      console.warn(formatMessage(opt, " has been deprecated since v" + version + " and will be removed in the near future"));
    }
    return validator ? validator(value, opt, opts) : true;
  };
};
validators.spelling = function spelling(correctSpelling) {
  return (value, opt) => {
    console.warn(`${opt} is likely a misspelling of ${correctSpelling}`);
    return true;
  };
};
function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== "object") {
    throw new AxiosError_default("options must be an object", AxiosError_default.ERR_BAD_OPTION_VALUE);
  }
  const keys = Object.keys(options);
  let i = keys.length;
  while (i-- > 0) {
    const opt = keys[i];
    const validator = schema[opt];
    if (validator) {
      const value = options[opt];
      const result = value === undefined || validator(value, opt, options);
      if (result !== true) {
        throw new AxiosError_default("option " + opt + " must be " + result, AxiosError_default.ERR_BAD_OPTION_VALUE);
      }
      continue;
    }
    if (allowUnknown !== true) {
      throw new AxiosError_default("Unknown option " + opt, AxiosError_default.ERR_BAD_OPTION);
    }
  }
}
var validator_default = {
  assertOptions,
  validators
};

// ../../node_modules/axios/lib/core/Axios.js
var validators2 = validator_default.validators;

class Axios {
  constructor(instanceConfig) {
    this.defaults = instanceConfig || {};
    this.interceptors = {
      request: new InterceptorManager_default,
      response: new InterceptorManager_default
    };
  }
  async request(configOrUrl, config) {
    try {
      return await this._request(configOrUrl, config);
    } catch (err) {
      if (err instanceof Error) {
        let dummy = {};
        Error.captureStackTrace ? Error.captureStackTrace(dummy) : dummy = new Error;
        const stack = dummy.stack ? dummy.stack.replace(/^.+\n/, "") : "";
        try {
          if (!err.stack) {
            err.stack = stack;
          } else if (stack && !String(err.stack).endsWith(stack.replace(/^.+\n.+\n/, ""))) {
            err.stack += `
` + stack;
          }
        } catch (e) {}
      }
      throw err;
    }
  }
  _request(configOrUrl, config) {
    if (typeof configOrUrl === "string") {
      config = config || {};
      config.url = configOrUrl;
    } else {
      config = configOrUrl || {};
    }
    config = mergeConfig(this.defaults, config);
    const { transitional: transitional2, paramsSerializer, headers } = config;
    if (transitional2 !== undefined) {
      validator_default.assertOptions(transitional2, {
        silentJSONParsing: validators2.transitional(validators2.boolean),
        forcedJSONParsing: validators2.transitional(validators2.boolean),
        clarifyTimeoutError: validators2.transitional(validators2.boolean)
      }, false);
    }
    if (paramsSerializer != null) {
      if (utils_default.isFunction(paramsSerializer)) {
        config.paramsSerializer = {
          serialize: paramsSerializer
        };
      } else {
        validator_default.assertOptions(paramsSerializer, {
          encode: validators2.function,
          serialize: validators2.function
        }, true);
      }
    }
    if (config.allowAbsoluteUrls !== undefined) {} else if (this.defaults.allowAbsoluteUrls !== undefined) {
      config.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls;
    } else {
      config.allowAbsoluteUrls = true;
    }
    validator_default.assertOptions(config, {
      baseUrl: validators2.spelling("baseURL"),
      withXsrfToken: validators2.spelling("withXSRFToken")
    }, true);
    config.method = (config.method || this.defaults.method || "get").toLowerCase();
    let contextHeaders = headers && utils_default.merge(headers.common, headers[config.method]);
    headers && utils_default.forEach(["delete", "get", "head", "post", "put", "patch", "common"], (method) => {
      delete headers[method];
    });
    config.headers = AxiosHeaders_default.concat(contextHeaders, headers);
    const requestInterceptorChain = [];
    let synchronousRequestInterceptors = true;
    this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
      if (typeof interceptor.runWhen === "function" && interceptor.runWhen(config) === false) {
        return;
      }
      synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;
      requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
    });
    const responseInterceptorChain = [];
    this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
      responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
    });
    let promise;
    let i = 0;
    let len;
    if (!synchronousRequestInterceptors) {
      const chain = [dispatchRequest.bind(this), undefined];
      chain.unshift.apply(chain, requestInterceptorChain);
      chain.push.apply(chain, responseInterceptorChain);
      len = chain.length;
      promise = Promise.resolve(config);
      while (i < len) {
        promise = promise.then(chain[i++], chain[i++]);
      }
      return promise;
    }
    len = requestInterceptorChain.length;
    let newConfig = config;
    i = 0;
    while (i < len) {
      const onFulfilled = requestInterceptorChain[i++];
      const onRejected = requestInterceptorChain[i++];
      try {
        newConfig = onFulfilled(newConfig);
      } catch (error) {
        onRejected.call(this, error);
        break;
      }
    }
    try {
      promise = dispatchRequest.call(this, newConfig);
    } catch (error) {
      return Promise.reject(error);
    }
    i = 0;
    len = responseInterceptorChain.length;
    while (i < len) {
      promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
    }
    return promise;
  }
  getUri(config) {
    config = mergeConfig(this.defaults, config);
    const fullPath = buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls);
    return buildURL(fullPath, config.params, config.paramsSerializer);
  }
}
utils_default.forEach(["delete", "get", "head", "options"], function forEachMethodNoData(method) {
  Axios.prototype[method] = function(url, config) {
    return this.request(mergeConfig(config || {}, {
      method,
      url,
      data: (config || {}).data
    }));
  };
});
utils_default.forEach(["post", "put", "patch"], function forEachMethodWithData(method) {
  function generateHTTPMethod(isForm) {
    return function httpMethod(url, data, config) {
      return this.request(mergeConfig(config || {}, {
        method,
        headers: isForm ? {
          "Content-Type": "multipart/form-data"
        } : {},
        url,
        data
      }));
    };
  }
  Axios.prototype[method] = generateHTTPMethod();
  Axios.prototype[method + "Form"] = generateHTTPMethod(true);
});
var Axios_default = Axios;

// ../../node_modules/axios/lib/cancel/CancelToken.js
class CancelToken {
  constructor(executor) {
    if (typeof executor !== "function") {
      throw new TypeError("executor must be a function.");
    }
    let resolvePromise;
    this.promise = new Promise(function promiseExecutor(resolve) {
      resolvePromise = resolve;
    });
    const token = this;
    this.promise.then((cancel) => {
      if (!token._listeners)
        return;
      let i = token._listeners.length;
      while (i-- > 0) {
        token._listeners[i](cancel);
      }
      token._listeners = null;
    });
    this.promise.then = (onfulfilled) => {
      let _resolve;
      const promise = new Promise((resolve) => {
        token.subscribe(resolve);
        _resolve = resolve;
      }).then(onfulfilled);
      promise.cancel = function reject() {
        token.unsubscribe(_resolve);
      };
      return promise;
    };
    executor(function cancel(message, config, request) {
      if (token.reason) {
        return;
      }
      token.reason = new CanceledError_default(message, config, request);
      resolvePromise(token.reason);
    });
  }
  throwIfRequested() {
    if (this.reason) {
      throw this.reason;
    }
  }
  subscribe(listener) {
    if (this.reason) {
      listener(this.reason);
      return;
    }
    if (this._listeners) {
      this._listeners.push(listener);
    } else {
      this._listeners = [listener];
    }
  }
  unsubscribe(listener) {
    if (!this._listeners) {
      return;
    }
    const index = this._listeners.indexOf(listener);
    if (index !== -1) {
      this._listeners.splice(index, 1);
    }
  }
  toAbortSignal() {
    const controller = new AbortController;
    const abort = (err) => {
      controller.abort(err);
    };
    this.subscribe(abort);
    controller.signal.unsubscribe = () => this.unsubscribe(abort);
    return controller.signal;
  }
  static source() {
    let cancel;
    const token = new CancelToken(function executor(c) {
      cancel = c;
    });
    return {
      token,
      cancel
    };
  }
}
var CancelToken_default = CancelToken;

// ../../node_modules/axios/lib/helpers/spread.js
function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
}

// ../../node_modules/axios/lib/helpers/isAxiosError.js
function isAxiosError(payload) {
  return utils_default.isObject(payload) && payload.isAxiosError === true;
}

// ../../node_modules/axios/lib/helpers/HttpStatusCode.js
var HttpStatusCode = {
  Continue: 100,
  SwitchingProtocols: 101,
  Processing: 102,
  EarlyHints: 103,
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NonAuthoritativeInformation: 203,
  NoContent: 204,
  ResetContent: 205,
  PartialContent: 206,
  MultiStatus: 207,
  AlreadyReported: 208,
  ImUsed: 226,
  MultipleChoices: 300,
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  UseProxy: 305,
  Unused: 306,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,
  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  PayloadTooLarge: 413,
  UriTooLong: 414,
  UnsupportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImATeapot: 418,
  MisdirectedRequest: 421,
  UnprocessableEntity: 422,
  Locked: 423,
  FailedDependency: 424,
  TooEarly: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HttpVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511
};
Object.entries(HttpStatusCode).forEach(([key, value]) => {
  HttpStatusCode[value] = key;
});
var HttpStatusCode_default = HttpStatusCode;

// ../../node_modules/axios/lib/axios.js
function createInstance(defaultConfig) {
  const context = new Axios_default(defaultConfig);
  const instance = bind(Axios_default.prototype.request, context);
  utils_default.extend(instance, Axios_default.prototype, context, { allOwnKeys: true });
  utils_default.extend(instance, context, null, { allOwnKeys: true });
  instance.create = function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  };
  return instance;
}
var axios = createInstance(defaults_default);
axios.Axios = Axios_default;
axios.CanceledError = CanceledError_default;
axios.CancelToken = CancelToken_default;
axios.isCancel = isCancel;
axios.VERSION = VERSION;
axios.toFormData = toFormData_default;
axios.AxiosError = AxiosError_default;
axios.Cancel = axios.CanceledError;
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = spread;
axios.isAxiosError = isAxiosError;
axios.mergeConfig = mergeConfig;
axios.AxiosHeaders = AxiosHeaders_default;
axios.formToJSON = (thing) => formDataToJSON_default(utils_default.isHTMLForm(thing) ? new FormData(thing) : thing);
axios.getAdapter = adapters_default.getAdapter;
axios.HttpStatusCode = HttpStatusCode_default;
axios.default = axios;
var axios_default = axios;

// src/base.ts
var BASE_PATH = "http://localhost".replace(/\/+$/, "");
class BaseAPI {
  basePath;
  axios;
  configuration;
  constructor(configuration, basePath = BASE_PATH, axios2 = axios_default) {
    this.basePath = basePath;
    this.axios = axios2;
    if (configuration) {
      this.configuration = configuration;
      this.basePath = configuration.basePath ?? basePath;
    }
  }
}

class RequiredError extends Error {
  field;
  constructor(field, msg) {
    super(msg);
    this.field = field;
    this.name = "RequiredError";
  }
}
var operationServerMap = {};

// src/common.ts
var DUMMY_BASE_URL = "https://example.com";
var assertParamExists = function(functionName, paramName, paramValue) {
  if (paramValue === null || paramValue === undefined) {
    throw new RequiredError(paramName, `Required parameter ${paramName} was null or undefined when calling ${functionName}.`);
  }
};
var setBearerAuthToObject = async function(object, configuration) {
  if (configuration && configuration.accessToken) {
    const accessToken = typeof configuration.accessToken === "function" ? await configuration.accessToken() : await configuration.accessToken;
    object["Authorization"] = "Bearer " + accessToken;
  }
};
function setFlattenedQueryParams(urlSearchParams, parameter, key = "") {
  if (parameter == null)
    return;
  if (typeof parameter === "object") {
    if (Array.isArray(parameter)) {
      parameter.forEach((item) => setFlattenedQueryParams(urlSearchParams, item, key));
    } else {
      Object.keys(parameter).forEach((currentKey) => setFlattenedQueryParams(urlSearchParams, parameter[currentKey], `${key}${key !== "" ? "." : ""}${currentKey}`));
    }
  } else {
    if (urlSearchParams.has(key)) {
      urlSearchParams.append(key, parameter);
    } else {
      urlSearchParams.set(key, parameter);
    }
  }
}
var setSearchParams = function(url, ...objects) {
  const searchParams = new URLSearchParams(url.search);
  setFlattenedQueryParams(searchParams, objects);
  url.search = searchParams.toString();
};
var serializeDataIfNeeded = function(value, requestOptions, configuration) {
  const nonString = typeof value !== "string";
  const needsSerialization = nonString && configuration && configuration.isJsonMime ? configuration.isJsonMime(requestOptions.headers["Content-Type"]) : nonString;
  return needsSerialization ? JSON.stringify(value !== undefined ? value : {}) : value || "";
};
var toPathString = function(url) {
  return url.pathname + url.search + url.hash;
};
var createRequestFunction = function(axiosArgs, globalAxios, BASE_PATH2, configuration) {
  return (axios2 = globalAxios, basePath = BASE_PATH2) => {
    const axiosRequestArgs = { ...axiosArgs.options, url: (axios2.defaults.baseURL ? "" : configuration?.basePath ?? basePath) + axiosArgs.url };
    return axios2.request(axiosRequestArgs);
  };
};

// src/api.ts
var AppDTOConfigTasksInnerInputParamsValueTypeEnum = {
  Boolean: "boolean",
  String: "string",
  Number: "number"
};
var AppDTOConfigTasksInnerTriggersInnerOneOfTypeEnum = {
  Event: "event"
};
var AppDTOConfigTasksInnerTriggersInnerOneOf1TypeEnum = {
  ObjectAction: "objectAction"
};
var AppDTOConfigTasksInnerTriggersInnerOneOf2TypeEnum = {
  FolderAction: "folderAction"
};
var EventDTOLevelEnum = {
  Trace: "TRACE",
  Debug: "DEBUG",
  Info: "INFO",
  Warn: "WARN",
  Error: "ERROR"
};
var EventGetResponseEventLevelEnum = {
  Trace: "TRACE",
  Debug: "DEBUG",
  Info: "INFO",
  Warn: "WARN",
  Error: "ERROR"
};
var FolderCreateSignedUrlInputDTOInnerMethodEnum = {
  Delete: "DELETE",
  Put: "PUT",
  Get: "GET"
};
var FolderDTOMetadataLocationProviderTypeEnum = {
  Server: "SERVER",
  User: "USER"
};
var FolderGetResponsePermissionsEnum = {
  FolderReindex: "FOLDER_REINDEX",
  FolderForget: "FOLDER_FORGET",
  FolderEdit: "FOLDER_EDIT",
  ObjectEdit: "OBJECT_EDIT",
  ObjectManage: "OBJECT_MANAGE"
};
var FolderListResponseResultInnerPermissionsEnum = {
  FolderReindex: "FOLDER_REINDEX",
  FolderForget: "FOLDER_FORGET",
  FolderEdit: "FOLDER_EDIT",
  ObjectEdit: "OBJECT_EDIT",
  ObjectManage: "OBJECT_MANAGE"
};
var FolderObjectDTOMediaTypeEnum = {
  Image: "IMAGE",
  Video: "VIDEO",
  Audio: "AUDIO",
  Document: "DOCUMENT",
  Unknown: "UNKNOWN"
};
var FolderObjectDTOContentMetadataValueValueOneOfContentEnum = {
  Empty: ""
};
var FolderObjectDTOContentMetadataValueValueOneOf1HashEnum = {
  Empty: ""
};
var FolderObjectDTOContentMetadataValueValueOneOf1StorageKeyEnum = {
  Empty: ""
};
var FolderObjectListResponseResultInnerMediaTypeEnum = {
  Image: "IMAGE",
  Video: "VIDEO",
  Audio: "AUDIO",
  Document: "DOCUMENT",
  Unknown: "UNKNOWN"
};
var FolderShareCreateInputDTOPermissionsEnum = {
  FolderReindex: "FOLDER_REINDEX",
  FolderForget: "FOLDER_FORGET",
  FolderEdit: "FOLDER_EDIT",
  ObjectEdit: "OBJECT_EDIT",
  ObjectManage: "OBJECT_MANAGE"
};
var FolderShareGetResponseSharePermissionsEnum = {
  FolderReindex: "FOLDER_REINDEX",
  FolderForget: "FOLDER_FORGET",
  FolderEdit: "FOLDER_EDIT",
  ObjectEdit: "OBJECT_EDIT",
  ObjectManage: "OBJECT_MANAGE"
};
var UserStorageProvisionDTOProvisionTypesEnum = {
  Content: "CONTENT",
  Metadata: "METADATA",
  Redundancy: "REDUNDANCY"
};
var UserStorageProvisionInputDTOProvisionTypesEnum = {
  Content: "CONTENT",
  Metadata: "METADATA",
  Redundancy: "REDUNDANCY"
};
var UserStorageProvisionListResponseResultInnerProvisionTypesEnum = {
  Content: "CONTENT",
  Metadata: "METADATA",
  Redundancy: "REDUNDANCY"
};
var AccessKeysApiAxiosParamCreator = function(configuration) {
  return {
    getAccessKey: async (accessKeyHashId, options = {}) => {
      assertParamExists("getAccessKey", "accessKeyHashId", accessKeyHashId);
      const localVarPath = `/api/v1/access-keys/{accessKeyHashId}`.replace(`{${"accessKeyHashId"}}`, encodeURIComponent(String(accessKeyHashId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    listAccessKeyBuckets: async (accessKeyHashId, options = {}) => {
      assertParamExists("listAccessKeyBuckets", "accessKeyHashId", accessKeyHashId);
      const localVarPath = `/api/v1/access-keys/{accessKeyHashId}/buckets`.replace(`{${"accessKeyHashId"}}`, encodeURIComponent(String(accessKeyHashId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    listAccessKeys: async (offset, limit, sort, options = {}) => {
      const localVarPath = `/api/v1/access-keys`;
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      if (offset !== undefined) {
        localVarQueryParameter["offset"] = offset;
      }
      if (limit !== undefined) {
        localVarQueryParameter["limit"] = limit;
      }
      if (sort !== undefined) {
        localVarQueryParameter["sort"] = sort;
      }
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    rotateAccessKey: async (accessKeyHashId, rotateAccessKeyInputDTO, options = {}) => {
      assertParamExists("rotateAccessKey", "accessKeyHashId", accessKeyHashId);
      assertParamExists("rotateAccessKey", "rotateAccessKeyInputDTO", rotateAccessKeyInputDTO);
      const localVarPath = `/api/v1/access-keys/{accessKeyHashId}/rotate`.replace(`{${"accessKeyHashId"}}`, encodeURIComponent(String(accessKeyHashId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "POST", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      localVarHeaderParameter["Content-Type"] = "application/json";
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      localVarRequestOptions.data = serializeDataIfNeeded(rotateAccessKeyInputDTO, localVarRequestOptions, configuration);
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    }
  };
};
var AccessKeysApiFp = function(configuration) {
  const localVarAxiosParamCreator = AccessKeysApiAxiosParamCreator(configuration);
  return {
    async getAccessKey(accessKeyHashId, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getAccessKey(accessKeyHashId, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["AccessKeysApi.getAccessKey"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async listAccessKeyBuckets(accessKeyHashId, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.listAccessKeyBuckets(accessKeyHashId, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["AccessKeysApi.listAccessKeyBuckets"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async listAccessKeys(offset, limit, sort, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.listAccessKeys(offset, limit, sort, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["AccessKeysApi.listAccessKeys"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async rotateAccessKey(accessKeyHashId, rotateAccessKeyInputDTO, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.rotateAccessKey(accessKeyHashId, rotateAccessKeyInputDTO, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["AccessKeysApi.rotateAccessKey"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    }
  };
};
var AccessKeysApiFactory = function(configuration, basePath, axios2) {
  const localVarFp = AccessKeysApiFp(configuration);
  return {
    getAccessKey(requestParameters, options) {
      return localVarFp.getAccessKey(requestParameters.accessKeyHashId, options).then((request) => request(axios2, basePath));
    },
    listAccessKeyBuckets(requestParameters, options) {
      return localVarFp.listAccessKeyBuckets(requestParameters.accessKeyHashId, options).then((request) => request(axios2, basePath));
    },
    listAccessKeys(requestParameters = {}, options) {
      return localVarFp.listAccessKeys(requestParameters.offset, requestParameters.limit, requestParameters.sort, options).then((request) => request(axios2, basePath));
    },
    rotateAccessKey(requestParameters, options) {
      return localVarFp.rotateAccessKey(requestParameters.accessKeyHashId, requestParameters.rotateAccessKeyInputDTO, options).then((request) => request(axios2, basePath));
    }
  };
};

class AccessKeysApi extends BaseAPI {
  getAccessKey(requestParameters, options) {
    return AccessKeysApiFp(this.configuration).getAccessKey(requestParameters.accessKeyHashId, options).then((request) => request(this.axios, this.basePath));
  }
  listAccessKeyBuckets(requestParameters, options) {
    return AccessKeysApiFp(this.configuration).listAccessKeyBuckets(requestParameters.accessKeyHashId, options).then((request) => request(this.axios, this.basePath));
  }
  listAccessKeys(requestParameters = {}, options) {
    return AccessKeysApiFp(this.configuration).listAccessKeys(requestParameters.offset, requestParameters.limit, requestParameters.sort, options).then((request) => request(this.axios, this.basePath));
  }
  rotateAccessKey(requestParameters, options) {
    return AccessKeysApiFp(this.configuration).rotateAccessKey(requestParameters.accessKeyHashId, requestParameters.rotateAccessKeyInputDTO, options).then((request) => request(this.axios, this.basePath));
  }
}
var ListAccessKeysSortEnum = {
  AccessKeyIdAsc: "accessKeyId-asc",
  AccessKeyIdDesc: "accessKeyId-desc",
  AccessKeyHashIdAsc: "accessKeyHashId-asc",
  AccessKeyHashIdDesc: "accessKeyHashId-desc",
  EndpointAsc: "endpoint-asc",
  EndpointDesc: "endpoint-desc",
  RegionAsc: "region-asc",
  RegionDesc: "region-desc",
  UpdatedAtAsc: "updatedAt-asc",
  UpdatedAtDesc: "updatedAt-desc"
};
var AppsApiAxiosParamCreator = function(configuration) {
  return {
    getApp: async (appIdentifier, options = {}) => {
      assertParamExists("getApp", "appIdentifier", appIdentifier);
      const localVarPath = `/api/v1/server/apps/{appIdentifier}`.replace(`{${"appIdentifier"}}`, encodeURIComponent(String(appIdentifier)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    listApps: async (options = {}) => {
      const localVarPath = `/api/v1/server/apps`;
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    setWorkerScriptEnvVars: async (appIdentifier, workerIdentifier, setWorkerScriptEnvVarsInputDTO, options = {}) => {
      assertParamExists("setWorkerScriptEnvVars", "appIdentifier", appIdentifier);
      assertParamExists("setWorkerScriptEnvVars", "workerIdentifier", workerIdentifier);
      assertParamExists("setWorkerScriptEnvVars", "setWorkerScriptEnvVarsInputDTO", setWorkerScriptEnvVarsInputDTO);
      const localVarPath = `/api/v1/server/apps/{appIdentifier}/workers/{workerIdentifier}/env-vars`.replace(`{${"appIdentifier"}}`, encodeURIComponent(String(appIdentifier))).replace(`{${"workerIdentifier"}}`, encodeURIComponent(String(workerIdentifier)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "PUT", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      localVarHeaderParameter["Content-Type"] = "application/json";
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      localVarRequestOptions.data = serializeDataIfNeeded(setWorkerScriptEnvVarsInputDTO, localVarRequestOptions, configuration);
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    }
  };
};
var AppsApiFp = function(configuration) {
  const localVarAxiosParamCreator = AppsApiAxiosParamCreator(configuration);
  return {
    async getApp(appIdentifier, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getApp(appIdentifier, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["AppsApi.getApp"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async listApps(options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.listApps(options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["AppsApi.listApps"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async setWorkerScriptEnvVars(appIdentifier, workerIdentifier, setWorkerScriptEnvVarsInputDTO, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.setWorkerScriptEnvVars(appIdentifier, workerIdentifier, setWorkerScriptEnvVarsInputDTO, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["AppsApi.setWorkerScriptEnvVars"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    }
  };
};
var AppsApiFactory = function(configuration, basePath, axios2) {
  const localVarFp = AppsApiFp(configuration);
  return {
    getApp(requestParameters, options) {
      return localVarFp.getApp(requestParameters.appIdentifier, options).then((request) => request(axios2, basePath));
    },
    listApps(options) {
      return localVarFp.listApps(options).then((request) => request(axios2, basePath));
    },
    setWorkerScriptEnvVars(requestParameters, options) {
      return localVarFp.setWorkerScriptEnvVars(requestParameters.appIdentifier, requestParameters.workerIdentifier, requestParameters.setWorkerScriptEnvVarsInputDTO, options).then((request) => request(axios2, basePath));
    }
  };
};

class AppsApi extends BaseAPI {
  getApp(requestParameters, options) {
    return AppsApiFp(this.configuration).getApp(requestParameters.appIdentifier, options).then((request) => request(this.axios, this.basePath));
  }
  listApps(options) {
    return AppsApiFp(this.configuration).listApps(options).then((request) => request(this.axios, this.basePath));
  }
  setWorkerScriptEnvVars(requestParameters, options) {
    return AppsApiFp(this.configuration).setWorkerScriptEnvVars(requestParameters.appIdentifier, requestParameters.workerIdentifier, requestParameters.setWorkerScriptEnvVarsInputDTO, options).then((request) => request(this.axios, this.basePath));
  }
}
var AuthApiAxiosParamCreator = function(configuration) {
  return {
    login: async (loginCredentialsDTO, options = {}) => {
      assertParamExists("login", "loginCredentialsDTO", loginCredentialsDTO);
      const localVarPath = `/api/v1/auth/login`;
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "POST", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      localVarHeaderParameter["Content-Type"] = "application/json";
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      localVarRequestOptions.data = serializeDataIfNeeded(loginCredentialsDTO, localVarRequestOptions, configuration);
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    logout: async (options = {}) => {
      const localVarPath = `/api/v1/auth/logout`;
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "POST", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    refreshToken: async (refreshToken, options = {}) => {
      assertParamExists("refreshToken", "refreshToken", refreshToken);
      const localVarPath = `/api/v1/auth/{refreshToken}`.replace(`{${"refreshToken"}}`, encodeURIComponent(String(refreshToken)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "POST", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    signup: async (signupCredentialsDTO, options = {}) => {
      assertParamExists("signup", "signupCredentialsDTO", signupCredentialsDTO);
      const localVarPath = `/api/v1/auth/signup`;
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "POST", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      localVarHeaderParameter["Content-Type"] = "application/json";
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      localVarRequestOptions.data = serializeDataIfNeeded(signupCredentialsDTO, localVarRequestOptions, configuration);
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    }
  };
};
var AuthApiFp = function(configuration) {
  const localVarAxiosParamCreator = AuthApiAxiosParamCreator(configuration);
  return {
    async login(loginCredentialsDTO, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.login(loginCredentialsDTO, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["AuthApi.login"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async logout(options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.logout(options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["AuthApi.logout"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async refreshToken(refreshToken, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.refreshToken(refreshToken, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["AuthApi.refreshToken"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async signup(signupCredentialsDTO, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.signup(signupCredentialsDTO, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["AuthApi.signup"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    }
  };
};
var AuthApiFactory = function(configuration, basePath, axios2) {
  const localVarFp = AuthApiFp(configuration);
  return {
    login(requestParameters, options) {
      return localVarFp.login(requestParameters.loginCredentialsDTO, options).then((request) => request(axios2, basePath));
    },
    logout(options) {
      return localVarFp.logout(options).then((request) => request(axios2, basePath));
    },
    refreshToken(requestParameters, options) {
      return localVarFp.refreshToken(requestParameters.refreshToken, options).then((request) => request(axios2, basePath));
    },
    signup(requestParameters, options) {
      return localVarFp.signup(requestParameters.signupCredentialsDTO, options).then((request) => request(axios2, basePath));
    }
  };
};

class AuthApi extends BaseAPI {
  login(requestParameters, options) {
    return AuthApiFp(this.configuration).login(requestParameters.loginCredentialsDTO, options).then((request) => request(this.axios, this.basePath));
  }
  logout(options) {
    return AuthApiFp(this.configuration).logout(options).then((request) => request(this.axios, this.basePath));
  }
  refreshToken(requestParameters, options) {
    return AuthApiFp(this.configuration).refreshToken(requestParameters.refreshToken, options).then((request) => request(this.axios, this.basePath));
  }
  signup(requestParameters, options) {
    return AuthApiFp(this.configuration).signup(requestParameters.signupCredentialsDTO, options).then((request) => request(this.axios, this.basePath));
  }
}
var FolderEventsApiAxiosParamCreator = function(configuration) {
  return {
    getFolderEvent: async (folderId, eventId, options = {}) => {
      assertParamExists("getFolderEvent", "folderId", folderId);
      assertParamExists("getFolderEvent", "eventId", eventId);
      const localVarPath = `/api/v1/folders/{folderId}/events/{eventId}`.replace(`{${"folderId"}}`, encodeURIComponent(String(folderId))).replace(`{${"eventId"}}`, encodeURIComponent(String(eventId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    listFolderEvents: async (folderId, sort, objectKey, search, includeTrace, includeDebug, includeInfo, includeWarning, includeError, offset, limit, options = {}) => {
      assertParamExists("listFolderEvents", "folderId", folderId);
      const localVarPath = `/api/v1/folders/{folderId}/events`.replace(`{${"folderId"}}`, encodeURIComponent(String(folderId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      if (sort !== undefined) {
        localVarQueryParameter["sort"] = sort;
      }
      if (objectKey !== undefined) {
        localVarQueryParameter["objectKey"] = objectKey;
      }
      if (search !== undefined) {
        localVarQueryParameter["search"] = search;
      }
      if (includeTrace !== undefined) {
        localVarQueryParameter["includeTrace"] = includeTrace;
      }
      if (includeDebug !== undefined) {
        localVarQueryParameter["includeDebug"] = includeDebug;
      }
      if (includeInfo !== undefined) {
        localVarQueryParameter["includeInfo"] = includeInfo;
      }
      if (includeWarning !== undefined) {
        localVarQueryParameter["includeWarning"] = includeWarning;
      }
      if (includeError !== undefined) {
        localVarQueryParameter["includeError"] = includeError;
      }
      if (offset !== undefined) {
        localVarQueryParameter["offset"] = offset;
      }
      if (limit !== undefined) {
        localVarQueryParameter["limit"] = limit;
      }
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    }
  };
};
var FolderEventsApiFp = function(configuration) {
  const localVarAxiosParamCreator = FolderEventsApiAxiosParamCreator(configuration);
  return {
    async getFolderEvent(folderId, eventId, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getFolderEvent(folderId, eventId, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["FolderEventsApi.getFolderEvent"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async listFolderEvents(folderId, sort, objectKey, search, includeTrace, includeDebug, includeInfo, includeWarning, includeError, offset, limit, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.listFolderEvents(folderId, sort, objectKey, search, includeTrace, includeDebug, includeInfo, includeWarning, includeError, offset, limit, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["FolderEventsApi.listFolderEvents"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    }
  };
};
var FolderEventsApiFactory = function(configuration, basePath, axios2) {
  const localVarFp = FolderEventsApiFp(configuration);
  return {
    getFolderEvent(requestParameters, options) {
      return localVarFp.getFolderEvent(requestParameters.folderId, requestParameters.eventId, options).then((request) => request(axios2, basePath));
    },
    listFolderEvents(requestParameters, options) {
      return localVarFp.listFolderEvents(requestParameters.folderId, requestParameters.sort, requestParameters.objectKey, requestParameters.search, requestParameters.includeTrace, requestParameters.includeDebug, requestParameters.includeInfo, requestParameters.includeWarning, requestParameters.includeError, requestParameters.offset, requestParameters.limit, options).then((request) => request(axios2, basePath));
    }
  };
};

class FolderEventsApi extends BaseAPI {
  getFolderEvent(requestParameters, options) {
    return FolderEventsApiFp(this.configuration).getFolderEvent(requestParameters.folderId, requestParameters.eventId, options).then((request) => request(this.axios, this.basePath));
  }
  listFolderEvents(requestParameters, options) {
    return FolderEventsApiFp(this.configuration).listFolderEvents(requestParameters.folderId, requestParameters.sort, requestParameters.objectKey, requestParameters.search, requestParameters.includeTrace, requestParameters.includeDebug, requestParameters.includeInfo, requestParameters.includeWarning, requestParameters.includeError, requestParameters.offset, requestParameters.limit, options).then((request) => request(this.axios, this.basePath));
  }
}
var ListFolderEventsSortEnum = {
  CreatedAtAsc: "createdAt-asc",
  CreatedAtDesc: "createdAt-desc",
  UpdatedAtAsc: "updatedAt-asc",
  UpdatedAtDesc: "updatedAt-desc"
};
var ListFolderEventsIncludeTraceEnum = {
  True: "true"
};
var ListFolderEventsIncludeDebugEnum = {
  True: "true"
};
var ListFolderEventsIncludeInfoEnum = {
  True: "true"
};
var ListFolderEventsIncludeWarningEnum = {
  True: "true"
};
var ListFolderEventsIncludeErrorEnum = {
  True: "true"
};
var FoldersApiAxiosParamCreator = function(configuration) {
  return {
    createFolder: async (folderCreateInputDTO, options = {}) => {
      assertParamExists("createFolder", "folderCreateInputDTO", folderCreateInputDTO);
      const localVarPath = `/api/v1/folders`;
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "POST", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      localVarHeaderParameter["Content-Type"] = "application/json";
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      localVarRequestOptions.data = serializeDataIfNeeded(folderCreateInputDTO, localVarRequestOptions, configuration);
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    createPresignedUrls: async (folderId, folderCreateSignedUrlInputDTOInner, options = {}) => {
      assertParamExists("createPresignedUrls", "folderId", folderId);
      assertParamExists("createPresignedUrls", "folderCreateSignedUrlInputDTOInner", folderCreateSignedUrlInputDTOInner);
      const localVarPath = `/api/v1/folders/{folderId}/presigned-urls`.replace(`{${"folderId"}}`, encodeURIComponent(String(folderId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "POST", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      localVarHeaderParameter["Content-Type"] = "application/json";
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      localVarRequestOptions.data = serializeDataIfNeeded(folderCreateSignedUrlInputDTOInner, localVarRequestOptions, configuration);
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    deleteFolder: async (folderId, options = {}) => {
      assertParamExists("deleteFolder", "folderId", folderId);
      const localVarPath = `/api/v1/folders/{folderId}`.replace(`{${"folderId"}}`, encodeURIComponent(String(folderId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "DELETE", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    deleteFolderObject: async (folderId, objectKey, options = {}) => {
      assertParamExists("deleteFolderObject", "folderId", folderId);
      assertParamExists("deleteFolderObject", "objectKey", objectKey);
      const localVarPath = `/api/v1/folders/{folderId}/objects/{objectKey}`.replace(`{${"folderId"}}`, encodeURIComponent(String(folderId))).replace(`{${"objectKey"}}`, encodeURIComponent(String(objectKey)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "DELETE", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    getFolder: async (folderId, options = {}) => {
      assertParamExists("getFolder", "folderId", folderId);
      const localVarPath = `/api/v1/folders/{folderId}`.replace(`{${"folderId"}}`, encodeURIComponent(String(folderId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    getFolderMetadata: async (folderId, options = {}) => {
      assertParamExists("getFolderMetadata", "folderId", folderId);
      const localVarPath = `/api/v1/folders/{folderId}/metadata`.replace(`{${"folderId"}}`, encodeURIComponent(String(folderId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    getFolderObject: async (folderId, objectKey, options = {}) => {
      assertParamExists("getFolderObject", "folderId", folderId);
      assertParamExists("getFolderObject", "objectKey", objectKey);
      const localVarPath = `/api/v1/folders/{folderId}/objects/{objectKey}`.replace(`{${"folderId"}}`, encodeURIComponent(String(folderId))).replace(`{${"objectKey"}}`, encodeURIComponent(String(objectKey)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    getFolderShares: async (folderId, userId, options = {}) => {
      assertParamExists("getFolderShares", "folderId", folderId);
      assertParamExists("getFolderShares", "userId", userId);
      const localVarPath = `/api/v1/folders/{folderId}/shares/{userId}`.replace(`{${"folderId"}}`, encodeURIComponent(String(folderId))).replace(`{${"userId"}}`, encodeURIComponent(String(userId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    handleAppTaskTrigger: async (folderId, appIdentifier, taskKey, triggerAppTaskInputDTO, options = {}) => {
      assertParamExists("handleAppTaskTrigger", "folderId", folderId);
      assertParamExists("handleAppTaskTrigger", "appIdentifier", appIdentifier);
      assertParamExists("handleAppTaskTrigger", "taskKey", taskKey);
      assertParamExists("handleAppTaskTrigger", "triggerAppTaskInputDTO", triggerAppTaskInputDTO);
      const localVarPath = `/api/v1/folders/{folderId}/apps/{appIdentifier}/trigger/{taskKey}`.replace(`{${"folderId"}}`, encodeURIComponent(String(folderId))).replace(`{${"appIdentifier"}}`, encodeURIComponent(String(appIdentifier))).replace(`{${"taskKey"}}`, encodeURIComponent(String(taskKey)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "POST", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      localVarHeaderParameter["Content-Type"] = "application/json";
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      localVarRequestOptions.data = serializeDataIfNeeded(triggerAppTaskInputDTO, localVarRequestOptions, configuration);
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    listFolderObjects: async (folderId, offset, limit, search, sort, options = {}) => {
      assertParamExists("listFolderObjects", "folderId", folderId);
      const localVarPath = `/api/v1/folders/{folderId}/objects`.replace(`{${"folderId"}}`, encodeURIComponent(String(folderId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      if (offset !== undefined) {
        localVarQueryParameter["offset"] = offset;
      }
      if (limit !== undefined) {
        localVarQueryParameter["limit"] = limit;
      }
      if (search !== undefined) {
        localVarQueryParameter["search"] = search;
      }
      if (sort !== undefined) {
        localVarQueryParameter["sort"] = sort;
      }
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    listFolderShareUsers: async (folderId, offset, limit, search, options = {}) => {
      assertParamExists("listFolderShareUsers", "folderId", folderId);
      const localVarPath = `/api/v1/folders/{folderId}/user-share-options`.replace(`{${"folderId"}}`, encodeURIComponent(String(folderId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      if (offset !== undefined) {
        localVarQueryParameter["offset"] = offset;
      }
      if (limit !== undefined) {
        localVarQueryParameter["limit"] = limit;
      }
      if (search !== undefined) {
        localVarQueryParameter["search"] = search;
      }
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    listFolderShares: async (folderId, options = {}) => {
      assertParamExists("listFolderShares", "folderId", folderId);
      const localVarPath = `/api/v1/folders/{folderId}/shares`.replace(`{${"folderId"}}`, encodeURIComponent(String(folderId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    listFolders: async (offset, limit, sort, search, options = {}) => {
      const localVarPath = `/api/v1/folders`;
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      if (offset !== undefined) {
        localVarQueryParameter["offset"] = offset;
      }
      if (limit !== undefined) {
        localVarQueryParameter["limit"] = limit;
      }
      if (sort !== undefined) {
        localVarQueryParameter["sort"] = sort;
      }
      if (search !== undefined) {
        localVarQueryParameter["search"] = search;
      }
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    refreshFolderObjectS3Metadata: async (folderId, objectKey, options = {}) => {
      assertParamExists("refreshFolderObjectS3Metadata", "folderId", folderId);
      assertParamExists("refreshFolderObjectS3Metadata", "objectKey", objectKey);
      const localVarPath = `/api/v1/folders/{folderId}/objects/{objectKey}`.replace(`{${"folderId"}}`, encodeURIComponent(String(folderId))).replace(`{${"objectKey"}}`, encodeURIComponent(String(objectKey)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "POST", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    reindexFolder: async (folderId, options = {}) => {
      assertParamExists("reindexFolder", "folderId", folderId);
      const localVarPath = `/api/v1/folders/{folderId}/reindex`.replace(`{${"folderId"}}`, encodeURIComponent(String(folderId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "POST", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    removeFolderShare: async (folderId, userId, options = {}) => {
      assertParamExists("removeFolderShare", "folderId", folderId);
      assertParamExists("removeFolderShare", "userId", userId);
      const localVarPath = `/api/v1/folders/{folderId}/shares/{userId}`.replace(`{${"folderId"}}`, encodeURIComponent(String(folderId))).replace(`{${"userId"}}`, encodeURIComponent(String(userId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "DELETE", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    updateFolder: async (folderId, folderUpdateInputDTO, options = {}) => {
      assertParamExists("updateFolder", "folderId", folderId);
      assertParamExists("updateFolder", "folderUpdateInputDTO", folderUpdateInputDTO);
      const localVarPath = `/api/v1/folders/{folderId}`.replace(`{${"folderId"}}`, encodeURIComponent(String(folderId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "PUT", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      localVarHeaderParameter["Content-Type"] = "application/json";
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      localVarRequestOptions.data = serializeDataIfNeeded(folderUpdateInputDTO, localVarRequestOptions, configuration);
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    upsertFolderShare: async (folderId, userId, folderShareCreateInputDTO, options = {}) => {
      assertParamExists("upsertFolderShare", "folderId", folderId);
      assertParamExists("upsertFolderShare", "userId", userId);
      assertParamExists("upsertFolderShare", "folderShareCreateInputDTO", folderShareCreateInputDTO);
      const localVarPath = `/api/v1/folders/{folderId}/shares/{userId}`.replace(`{${"folderId"}}`, encodeURIComponent(String(folderId))).replace(`{${"userId"}}`, encodeURIComponent(String(userId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "POST", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      localVarHeaderParameter["Content-Type"] = "application/json";
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      localVarRequestOptions.data = serializeDataIfNeeded(folderShareCreateInputDTO, localVarRequestOptions, configuration);
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    }
  };
};
var FoldersApiFp = function(configuration) {
  const localVarAxiosParamCreator = FoldersApiAxiosParamCreator(configuration);
  return {
    async createFolder(folderCreateInputDTO, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.createFolder(folderCreateInputDTO, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["FoldersApi.createFolder"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async createPresignedUrls(folderId, folderCreateSignedUrlInputDTOInner, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.createPresignedUrls(folderId, folderCreateSignedUrlInputDTOInner, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["FoldersApi.createPresignedUrls"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async deleteFolder(folderId, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.deleteFolder(folderId, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["FoldersApi.deleteFolder"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async deleteFolderObject(folderId, objectKey, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.deleteFolderObject(folderId, objectKey, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["FoldersApi.deleteFolderObject"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async getFolder(folderId, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getFolder(folderId, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["FoldersApi.getFolder"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async getFolderMetadata(folderId, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getFolderMetadata(folderId, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["FoldersApi.getFolderMetadata"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async getFolderObject(folderId, objectKey, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getFolderObject(folderId, objectKey, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["FoldersApi.getFolderObject"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async getFolderShares(folderId, userId, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getFolderShares(folderId, userId, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["FoldersApi.getFolderShares"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async handleAppTaskTrigger(folderId, appIdentifier, taskKey, triggerAppTaskInputDTO, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.handleAppTaskTrigger(folderId, appIdentifier, taskKey, triggerAppTaskInputDTO, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["FoldersApi.handleAppTaskTrigger"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async listFolderObjects(folderId, offset, limit, search, sort, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.listFolderObjects(folderId, offset, limit, search, sort, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["FoldersApi.listFolderObjects"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async listFolderShareUsers(folderId, offset, limit, search, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.listFolderShareUsers(folderId, offset, limit, search, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["FoldersApi.listFolderShareUsers"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async listFolderShares(folderId, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.listFolderShares(folderId, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["FoldersApi.listFolderShares"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async listFolders(offset, limit, sort, search, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.listFolders(offset, limit, sort, search, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["FoldersApi.listFolders"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async refreshFolderObjectS3Metadata(folderId, objectKey, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.refreshFolderObjectS3Metadata(folderId, objectKey, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["FoldersApi.refreshFolderObjectS3Metadata"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async reindexFolder(folderId, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.reindexFolder(folderId, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["FoldersApi.reindexFolder"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async removeFolderShare(folderId, userId, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.removeFolderShare(folderId, userId, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["FoldersApi.removeFolderShare"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async updateFolder(folderId, folderUpdateInputDTO, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.updateFolder(folderId, folderUpdateInputDTO, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["FoldersApi.updateFolder"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async upsertFolderShare(folderId, userId, folderShareCreateInputDTO, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.upsertFolderShare(folderId, userId, folderShareCreateInputDTO, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["FoldersApi.upsertFolderShare"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    }
  };
};
var FoldersApiFactory = function(configuration, basePath, axios2) {
  const localVarFp = FoldersApiFp(configuration);
  return {
    createFolder(requestParameters, options) {
      return localVarFp.createFolder(requestParameters.folderCreateInputDTO, options).then((request) => request(axios2, basePath));
    },
    createPresignedUrls(requestParameters, options) {
      return localVarFp.createPresignedUrls(requestParameters.folderId, requestParameters.folderCreateSignedUrlInputDTOInner, options).then((request) => request(axios2, basePath));
    },
    deleteFolder(requestParameters, options) {
      return localVarFp.deleteFolder(requestParameters.folderId, options).then((request) => request(axios2, basePath));
    },
    deleteFolderObject(requestParameters, options) {
      return localVarFp.deleteFolderObject(requestParameters.folderId, requestParameters.objectKey, options).then((request) => request(axios2, basePath));
    },
    getFolder(requestParameters, options) {
      return localVarFp.getFolder(requestParameters.folderId, options).then((request) => request(axios2, basePath));
    },
    getFolderMetadata(requestParameters, options) {
      return localVarFp.getFolderMetadata(requestParameters.folderId, options).then((request) => request(axios2, basePath));
    },
    getFolderObject(requestParameters, options) {
      return localVarFp.getFolderObject(requestParameters.folderId, requestParameters.objectKey, options).then((request) => request(axios2, basePath));
    },
    getFolderShares(requestParameters, options) {
      return localVarFp.getFolderShares(requestParameters.folderId, requestParameters.userId, options).then((request) => request(axios2, basePath));
    },
    handleAppTaskTrigger(requestParameters, options) {
      return localVarFp.handleAppTaskTrigger(requestParameters.folderId, requestParameters.appIdentifier, requestParameters.taskKey, requestParameters.triggerAppTaskInputDTO, options).then((request) => request(axios2, basePath));
    },
    listFolderObjects(requestParameters, options) {
      return localVarFp.listFolderObjects(requestParameters.folderId, requestParameters.offset, requestParameters.limit, requestParameters.search, requestParameters.sort, options).then((request) => request(axios2, basePath));
    },
    listFolderShareUsers(requestParameters, options) {
      return localVarFp.listFolderShareUsers(requestParameters.folderId, requestParameters.offset, requestParameters.limit, requestParameters.search, options).then((request) => request(axios2, basePath));
    },
    listFolderShares(requestParameters, options) {
      return localVarFp.listFolderShares(requestParameters.folderId, options).then((request) => request(axios2, basePath));
    },
    listFolders(requestParameters = {}, options) {
      return localVarFp.listFolders(requestParameters.offset, requestParameters.limit, requestParameters.sort, requestParameters.search, options).then((request) => request(axios2, basePath));
    },
    refreshFolderObjectS3Metadata(requestParameters, options) {
      return localVarFp.refreshFolderObjectS3Metadata(requestParameters.folderId, requestParameters.objectKey, options).then((request) => request(axios2, basePath));
    },
    reindexFolder(requestParameters, options) {
      return localVarFp.reindexFolder(requestParameters.folderId, options).then((request) => request(axios2, basePath));
    },
    removeFolderShare(requestParameters, options) {
      return localVarFp.removeFolderShare(requestParameters.folderId, requestParameters.userId, options).then((request) => request(axios2, basePath));
    },
    updateFolder(requestParameters, options) {
      return localVarFp.updateFolder(requestParameters.folderId, requestParameters.folderUpdateInputDTO, options).then((request) => request(axios2, basePath));
    },
    upsertFolderShare(requestParameters, options) {
      return localVarFp.upsertFolderShare(requestParameters.folderId, requestParameters.userId, requestParameters.folderShareCreateInputDTO, options).then((request) => request(axios2, basePath));
    }
  };
};

class FoldersApi extends BaseAPI {
  createFolder(requestParameters, options) {
    return FoldersApiFp(this.configuration).createFolder(requestParameters.folderCreateInputDTO, options).then((request) => request(this.axios, this.basePath));
  }
  createPresignedUrls(requestParameters, options) {
    return FoldersApiFp(this.configuration).createPresignedUrls(requestParameters.folderId, requestParameters.folderCreateSignedUrlInputDTOInner, options).then((request) => request(this.axios, this.basePath));
  }
  deleteFolder(requestParameters, options) {
    return FoldersApiFp(this.configuration).deleteFolder(requestParameters.folderId, options).then((request) => request(this.axios, this.basePath));
  }
  deleteFolderObject(requestParameters, options) {
    return FoldersApiFp(this.configuration).deleteFolderObject(requestParameters.folderId, requestParameters.objectKey, options).then((request) => request(this.axios, this.basePath));
  }
  getFolder(requestParameters, options) {
    return FoldersApiFp(this.configuration).getFolder(requestParameters.folderId, options).then((request) => request(this.axios, this.basePath));
  }
  getFolderMetadata(requestParameters, options) {
    return FoldersApiFp(this.configuration).getFolderMetadata(requestParameters.folderId, options).then((request) => request(this.axios, this.basePath));
  }
  getFolderObject(requestParameters, options) {
    return FoldersApiFp(this.configuration).getFolderObject(requestParameters.folderId, requestParameters.objectKey, options).then((request) => request(this.axios, this.basePath));
  }
  getFolderShares(requestParameters, options) {
    return FoldersApiFp(this.configuration).getFolderShares(requestParameters.folderId, requestParameters.userId, options).then((request) => request(this.axios, this.basePath));
  }
  handleAppTaskTrigger(requestParameters, options) {
    return FoldersApiFp(this.configuration).handleAppTaskTrigger(requestParameters.folderId, requestParameters.appIdentifier, requestParameters.taskKey, requestParameters.triggerAppTaskInputDTO, options).then((request) => request(this.axios, this.basePath));
  }
  listFolderObjects(requestParameters, options) {
    return FoldersApiFp(this.configuration).listFolderObjects(requestParameters.folderId, requestParameters.offset, requestParameters.limit, requestParameters.search, requestParameters.sort, options).then((request) => request(this.axios, this.basePath));
  }
  listFolderShareUsers(requestParameters, options) {
    return FoldersApiFp(this.configuration).listFolderShareUsers(requestParameters.folderId, requestParameters.offset, requestParameters.limit, requestParameters.search, options).then((request) => request(this.axios, this.basePath));
  }
  listFolderShares(requestParameters, options) {
    return FoldersApiFp(this.configuration).listFolderShares(requestParameters.folderId, options).then((request) => request(this.axios, this.basePath));
  }
  listFolders(requestParameters = {}, options) {
    return FoldersApiFp(this.configuration).listFolders(requestParameters.offset, requestParameters.limit, requestParameters.sort, requestParameters.search, options).then((request) => request(this.axios, this.basePath));
  }
  refreshFolderObjectS3Metadata(requestParameters, options) {
    return FoldersApiFp(this.configuration).refreshFolderObjectS3Metadata(requestParameters.folderId, requestParameters.objectKey, options).then((request) => request(this.axios, this.basePath));
  }
  reindexFolder(requestParameters, options) {
    return FoldersApiFp(this.configuration).reindexFolder(requestParameters.folderId, options).then((request) => request(this.axios, this.basePath));
  }
  removeFolderShare(requestParameters, options) {
    return FoldersApiFp(this.configuration).removeFolderShare(requestParameters.folderId, requestParameters.userId, options).then((request) => request(this.axios, this.basePath));
  }
  updateFolder(requestParameters, options) {
    return FoldersApiFp(this.configuration).updateFolder(requestParameters.folderId, requestParameters.folderUpdateInputDTO, options).then((request) => request(this.axios, this.basePath));
  }
  upsertFolderShare(requestParameters, options) {
    return FoldersApiFp(this.configuration).upsertFolderShare(requestParameters.folderId, requestParameters.userId, requestParameters.folderShareCreateInputDTO, options).then((request) => request(this.axios, this.basePath));
  }
}
var ListFolderObjectsSortEnum = {
  SizeAsc: "size-asc",
  SizeDesc: "size-desc",
  FilenameAsc: "filename-asc",
  FilenameDesc: "filename-desc",
  ObjectKeyAsc: "objectKey-asc",
  ObjectKeyDesc: "objectKey-desc",
  CreatedAtAsc: "createdAt-asc",
  CreatedAtDesc: "createdAt-desc",
  UpdatedAtAsc: "updatedAt-asc",
  UpdatedAtDesc: "updatedAt-desc"
};
var ListFoldersSortEnum = {
  NameAsc: "name-asc",
  NameDesc: "name-desc",
  CreatedAtAsc: "createdAt-asc",
  CreatedAtDesc: "createdAt-desc",
  UpdatedAtAsc: "updatedAt-asc",
  UpdatedAtDesc: "updatedAt-desc"
};
var ServerApiAxiosParamCreator = function(configuration) {
  return {
    getServerSettings: async (options = {}) => {
      const localVarPath = `/api/v1/server/settings`;
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    resetServerSetting: async (settingKey, options = {}) => {
      assertParamExists("resetServerSetting", "settingKey", settingKey);
      const localVarPath = `/api/v1/server/settings/{settingKey}`.replace(`{${"settingKey"}}`, encodeURIComponent(String(settingKey)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "DELETE", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    setServerSetting: async (settingKey, setSettingInputDTO, options = {}) => {
      assertParamExists("setServerSetting", "settingKey", settingKey);
      assertParamExists("setServerSetting", "setSettingInputDTO", setSettingInputDTO);
      const localVarPath = `/api/v1/server/settings/{settingKey}`.replace(`{${"settingKey"}}`, encodeURIComponent(String(settingKey)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "PUT", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      localVarHeaderParameter["Content-Type"] = "application/json";
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      localVarRequestOptions.data = serializeDataIfNeeded(setSettingInputDTO, localVarRequestOptions, configuration);
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    }
  };
};
var ServerApiFp = function(configuration) {
  const localVarAxiosParamCreator = ServerApiAxiosParamCreator(configuration);
  return {
    async getServerSettings(options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getServerSettings(options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["ServerApi.getServerSettings"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async resetServerSetting(settingKey, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.resetServerSetting(settingKey, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["ServerApi.resetServerSetting"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async setServerSetting(settingKey, setSettingInputDTO, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.setServerSetting(settingKey, setSettingInputDTO, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["ServerApi.setServerSetting"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    }
  };
};
var ServerApiFactory = function(configuration, basePath, axios2) {
  const localVarFp = ServerApiFp(configuration);
  return {
    getServerSettings(options) {
      return localVarFp.getServerSettings(options).then((request) => request(axios2, basePath));
    },
    resetServerSetting(requestParameters, options) {
      return localVarFp.resetServerSetting(requestParameters.settingKey, options).then((request) => request(axios2, basePath));
    },
    setServerSetting(requestParameters, options) {
      return localVarFp.setServerSetting(requestParameters.settingKey, requestParameters.setSettingInputDTO, options).then((request) => request(axios2, basePath));
    }
  };
};

class ServerApi extends BaseAPI {
  getServerSettings(options) {
    return ServerApiFp(this.configuration).getServerSettings(options).then((request) => request(this.axios, this.basePath));
  }
  resetServerSetting(requestParameters, options) {
    return ServerApiFp(this.configuration).resetServerSetting(requestParameters.settingKey, options).then((request) => request(this.axios, this.basePath));
  }
  setServerSetting(requestParameters, options) {
    return ServerApiFp(this.configuration).setServerSetting(requestParameters.settingKey, requestParameters.setSettingInputDTO, options).then((request) => request(this.axios, this.basePath));
  }
}
var ServerAccessKeysApiAxiosParamCreator = function(configuration) {
  return {
    getServerAccessKey: async (accessKeyHashId, options = {}) => {
      assertParamExists("getServerAccessKey", "accessKeyHashId", accessKeyHashId);
      const localVarPath = `/api/v1/server/access-keys/{accessKeyHashId}`.replace(`{${"accessKeyHashId"}}`, encodeURIComponent(String(accessKeyHashId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    listServerAccessKeyBuckets: async (accessKeyHashId, options = {}) => {
      assertParamExists("listServerAccessKeyBuckets", "accessKeyHashId", accessKeyHashId);
      const localVarPath = `/api/v1/server/access-keys/{accessKeyHashId}/buckets`.replace(`{${"accessKeyHashId"}}`, encodeURIComponent(String(accessKeyHashId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    listServerAccessKeys: async (offset, limit, sort, options = {}) => {
      const localVarPath = `/api/v1/server/access-keys`;
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      if (offset !== undefined) {
        localVarQueryParameter["offset"] = offset;
      }
      if (limit !== undefined) {
        localVarQueryParameter["limit"] = limit;
      }
      if (sort !== undefined) {
        localVarQueryParameter["sort"] = sort;
      }
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    rotateServerAccessKey: async (accessKeyHashId, rotateAccessKeyInputDTO, options = {}) => {
      assertParamExists("rotateServerAccessKey", "accessKeyHashId", accessKeyHashId);
      assertParamExists("rotateServerAccessKey", "rotateAccessKeyInputDTO", rotateAccessKeyInputDTO);
      const localVarPath = `/api/v1/server/access-keys/{accessKeyHashId}/rotate`.replace(`{${"accessKeyHashId"}}`, encodeURIComponent(String(accessKeyHashId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "POST", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      localVarHeaderParameter["Content-Type"] = "application/json";
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      localVarRequestOptions.data = serializeDataIfNeeded(rotateAccessKeyInputDTO, localVarRequestOptions, configuration);
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    }
  };
};
var ServerAccessKeysApiFp = function(configuration) {
  const localVarAxiosParamCreator = ServerAccessKeysApiAxiosParamCreator(configuration);
  return {
    async getServerAccessKey(accessKeyHashId, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getServerAccessKey(accessKeyHashId, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["ServerAccessKeysApi.getServerAccessKey"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async listServerAccessKeyBuckets(accessKeyHashId, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.listServerAccessKeyBuckets(accessKeyHashId, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["ServerAccessKeysApi.listServerAccessKeyBuckets"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async listServerAccessKeys(offset, limit, sort, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.listServerAccessKeys(offset, limit, sort, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["ServerAccessKeysApi.listServerAccessKeys"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async rotateServerAccessKey(accessKeyHashId, rotateAccessKeyInputDTO, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.rotateServerAccessKey(accessKeyHashId, rotateAccessKeyInputDTO, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["ServerAccessKeysApi.rotateServerAccessKey"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    }
  };
};
var ServerAccessKeysApiFactory = function(configuration, basePath, axios2) {
  const localVarFp = ServerAccessKeysApiFp(configuration);
  return {
    getServerAccessKey(requestParameters, options) {
      return localVarFp.getServerAccessKey(requestParameters.accessKeyHashId, options).then((request) => request(axios2, basePath));
    },
    listServerAccessKeyBuckets(requestParameters, options) {
      return localVarFp.listServerAccessKeyBuckets(requestParameters.accessKeyHashId, options).then((request) => request(axios2, basePath));
    },
    listServerAccessKeys(requestParameters = {}, options) {
      return localVarFp.listServerAccessKeys(requestParameters.offset, requestParameters.limit, requestParameters.sort, options).then((request) => request(axios2, basePath));
    },
    rotateServerAccessKey(requestParameters, options) {
      return localVarFp.rotateServerAccessKey(requestParameters.accessKeyHashId, requestParameters.rotateAccessKeyInputDTO, options).then((request) => request(axios2, basePath));
    }
  };
};

class ServerAccessKeysApi extends BaseAPI {
  getServerAccessKey(requestParameters, options) {
    return ServerAccessKeysApiFp(this.configuration).getServerAccessKey(requestParameters.accessKeyHashId, options).then((request) => request(this.axios, this.basePath));
  }
  listServerAccessKeyBuckets(requestParameters, options) {
    return ServerAccessKeysApiFp(this.configuration).listServerAccessKeyBuckets(requestParameters.accessKeyHashId, options).then((request) => request(this.axios, this.basePath));
  }
  listServerAccessKeys(requestParameters = {}, options) {
    return ServerAccessKeysApiFp(this.configuration).listServerAccessKeys(requestParameters.offset, requestParameters.limit, requestParameters.sort, options).then((request) => request(this.axios, this.basePath));
  }
  rotateServerAccessKey(requestParameters, options) {
    return ServerAccessKeysApiFp(this.configuration).rotateServerAccessKey(requestParameters.accessKeyHashId, requestParameters.rotateAccessKeyInputDTO, options).then((request) => request(this.axios, this.basePath));
  }
}
var ListServerAccessKeysSortEnum = {
  AccessKeyIdAsc: "accessKeyId-asc",
  AccessKeyIdDesc: "accessKeyId-desc",
  AccessKeyHashIdAsc: "accessKeyHashId-asc",
  AccessKeyHashIdDesc: "accessKeyHashId-desc",
  EndpointAsc: "endpoint-asc",
  EndpointDesc: "endpoint-desc",
  RegionAsc: "region-asc",
  RegionDesc: "region-desc",
  UpdatedAtAsc: "updatedAt-asc",
  UpdatedAtDesc: "updatedAt-desc"
};
var ServerEventsApiAxiosParamCreator = function(configuration) {
  return {
    getEvent: async (eventId, options = {}) => {
      assertParamExists("getEvent", "eventId", eventId);
      const localVarPath = `/api/v1/server/events/{eventId}`.replace(`{${"eventId"}}`, encodeURIComponent(String(eventId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    listEvents: async (sort, folderId, objectKey, search, includeTrace, includeDebug, includeInfo, includeWarning, includeError, offset, limit, options = {}) => {
      const localVarPath = `/api/v1/server/events`;
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      if (sort !== undefined) {
        localVarQueryParameter["sort"] = sort;
      }
      if (folderId !== undefined) {
        localVarQueryParameter["folderId"] = folderId;
      }
      if (objectKey !== undefined) {
        localVarQueryParameter["objectKey"] = objectKey;
      }
      if (search !== undefined) {
        localVarQueryParameter["search"] = search;
      }
      if (includeTrace !== undefined) {
        localVarQueryParameter["includeTrace"] = includeTrace;
      }
      if (includeDebug !== undefined) {
        localVarQueryParameter["includeDebug"] = includeDebug;
      }
      if (includeInfo !== undefined) {
        localVarQueryParameter["includeInfo"] = includeInfo;
      }
      if (includeWarning !== undefined) {
        localVarQueryParameter["includeWarning"] = includeWarning;
      }
      if (includeError !== undefined) {
        localVarQueryParameter["includeError"] = includeError;
      }
      if (offset !== undefined) {
        localVarQueryParameter["offset"] = offset;
      }
      if (limit !== undefined) {
        localVarQueryParameter["limit"] = limit;
      }
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    }
  };
};
var ServerEventsApiFp = function(configuration) {
  const localVarAxiosParamCreator = ServerEventsApiAxiosParamCreator(configuration);
  return {
    async getEvent(eventId, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getEvent(eventId, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["ServerEventsApi.getEvent"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async listEvents(sort, folderId, objectKey, search, includeTrace, includeDebug, includeInfo, includeWarning, includeError, offset, limit, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.listEvents(sort, folderId, objectKey, search, includeTrace, includeDebug, includeInfo, includeWarning, includeError, offset, limit, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["ServerEventsApi.listEvents"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    }
  };
};
var ServerEventsApiFactory = function(configuration, basePath, axios2) {
  const localVarFp = ServerEventsApiFp(configuration);
  return {
    getEvent(requestParameters, options) {
      return localVarFp.getEvent(requestParameters.eventId, options).then((request) => request(axios2, basePath));
    },
    listEvents(requestParameters = {}, options) {
      return localVarFp.listEvents(requestParameters.sort, requestParameters.folderId, requestParameters.objectKey, requestParameters.search, requestParameters.includeTrace, requestParameters.includeDebug, requestParameters.includeInfo, requestParameters.includeWarning, requestParameters.includeError, requestParameters.offset, requestParameters.limit, options).then((request) => request(axios2, basePath));
    }
  };
};

class ServerEventsApi extends BaseAPI {
  getEvent(requestParameters, options) {
    return ServerEventsApiFp(this.configuration).getEvent(requestParameters.eventId, options).then((request) => request(this.axios, this.basePath));
  }
  listEvents(requestParameters = {}, options) {
    return ServerEventsApiFp(this.configuration).listEvents(requestParameters.sort, requestParameters.folderId, requestParameters.objectKey, requestParameters.search, requestParameters.includeTrace, requestParameters.includeDebug, requestParameters.includeInfo, requestParameters.includeWarning, requestParameters.includeError, requestParameters.offset, requestParameters.limit, options).then((request) => request(this.axios, this.basePath));
  }
}
var ListEventsSortEnum = {
  CreatedAtAsc: "createdAt-asc",
  CreatedAtDesc: "createdAt-desc",
  UpdatedAtAsc: "updatedAt-asc",
  UpdatedAtDesc: "updatedAt-desc"
};
var ListEventsIncludeTraceEnum = {
  True: "true"
};
var ListEventsIncludeDebugEnum = {
  True: "true"
};
var ListEventsIncludeInfoEnum = {
  True: "true"
};
var ListEventsIncludeWarningEnum = {
  True: "true"
};
var ListEventsIncludeErrorEnum = {
  True: "true"
};
var ServerStorageLocationApiAxiosParamCreator = function(configuration) {
  return {
    deleteServerStorageLocation: async (options = {}) => {
      const localVarPath = `/api/v1/server/server-storage-location`;
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "DELETE", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    getServerStorageLocation: async (options = {}) => {
      const localVarPath = `/api/v1/server/server-storage-location`;
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    setServerStorageLocation: async (serverStorageLocationInputDTO, options = {}) => {
      assertParamExists("setServerStorageLocation", "serverStorageLocationInputDTO", serverStorageLocationInputDTO);
      const localVarPath = `/api/v1/server/server-storage-location`;
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "POST", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      localVarHeaderParameter["Content-Type"] = "application/json";
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      localVarRequestOptions.data = serializeDataIfNeeded(serverStorageLocationInputDTO, localVarRequestOptions, configuration);
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    }
  };
};
var ServerStorageLocationApiFp = function(configuration) {
  const localVarAxiosParamCreator = ServerStorageLocationApiAxiosParamCreator(configuration);
  return {
    async deleteServerStorageLocation(options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.deleteServerStorageLocation(options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["ServerStorageLocationApi.deleteServerStorageLocation"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async getServerStorageLocation(options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getServerStorageLocation(options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["ServerStorageLocationApi.getServerStorageLocation"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async setServerStorageLocation(serverStorageLocationInputDTO, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.setServerStorageLocation(serverStorageLocationInputDTO, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["ServerStorageLocationApi.setServerStorageLocation"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    }
  };
};
var ServerStorageLocationApiFactory = function(configuration, basePath, axios2) {
  const localVarFp = ServerStorageLocationApiFp(configuration);
  return {
    deleteServerStorageLocation(options) {
      return localVarFp.deleteServerStorageLocation(options).then((request) => request(axios2, basePath));
    },
    getServerStorageLocation(options) {
      return localVarFp.getServerStorageLocation(options).then((request) => request(axios2, basePath));
    },
    setServerStorageLocation(requestParameters, options) {
      return localVarFp.setServerStorageLocation(requestParameters.serverStorageLocationInputDTO, options).then((request) => request(axios2, basePath));
    }
  };
};

class ServerStorageLocationApi extends BaseAPI {
  deleteServerStorageLocation(options) {
    return ServerStorageLocationApiFp(this.configuration).deleteServerStorageLocation(options).then((request) => request(this.axios, this.basePath));
  }
  getServerStorageLocation(options) {
    return ServerStorageLocationApiFp(this.configuration).getServerStorageLocation(options).then((request) => request(this.axios, this.basePath));
  }
  setServerStorageLocation(requestParameters, options) {
    return ServerStorageLocationApiFp(this.configuration).setServerStorageLocation(requestParameters.serverStorageLocationInputDTO, options).then((request) => request(this.axios, this.basePath));
  }
}
var ServerTasksApiAxiosParamCreator = function(configuration) {
  return {
    getTask: async (taskId, options = {}) => {
      assertParamExists("getTask", "taskId", taskId);
      const localVarPath = `/api/v1/server/tasks/{taskId}`.replace(`{${"taskId"}}`, encodeURIComponent(String(taskId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    listTasks: async (objectKey, sort, search, includeWaiting, includeRunning, includeComplete, includeFailed, offset, limit, folderId, options = {}) => {
      const localVarPath = `/api/v1/server/tasks`;
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      if (objectKey !== undefined) {
        localVarQueryParameter["objectKey"] = objectKey;
      }
      if (sort !== undefined) {
        localVarQueryParameter["sort"] = sort;
      }
      if (search !== undefined) {
        localVarQueryParameter["search"] = search;
      }
      if (includeWaiting !== undefined) {
        localVarQueryParameter["includeWaiting"] = includeWaiting;
      }
      if (includeRunning !== undefined) {
        localVarQueryParameter["includeRunning"] = includeRunning;
      }
      if (includeComplete !== undefined) {
        localVarQueryParameter["includeComplete"] = includeComplete;
      }
      if (includeFailed !== undefined) {
        localVarQueryParameter["includeFailed"] = includeFailed;
      }
      if (offset !== undefined) {
        localVarQueryParameter["offset"] = offset;
      }
      if (limit !== undefined) {
        localVarQueryParameter["limit"] = limit;
      }
      if (folderId !== undefined) {
        localVarQueryParameter["folderId"] = folderId;
      }
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    }
  };
};
var ServerTasksApiFp = function(configuration) {
  const localVarAxiosParamCreator = ServerTasksApiAxiosParamCreator(configuration);
  return {
    async getTask(taskId, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getTask(taskId, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["ServerTasksApi.getTask"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async listTasks(objectKey, sort, search, includeWaiting, includeRunning, includeComplete, includeFailed, offset, limit, folderId, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.listTasks(objectKey, sort, search, includeWaiting, includeRunning, includeComplete, includeFailed, offset, limit, folderId, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["ServerTasksApi.listTasks"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    }
  };
};
var ServerTasksApiFactory = function(configuration, basePath, axios2) {
  const localVarFp = ServerTasksApiFp(configuration);
  return {
    getTask(requestParameters, options) {
      return localVarFp.getTask(requestParameters.taskId, options).then((request) => request(axios2, basePath));
    },
    listTasks(requestParameters = {}, options) {
      return localVarFp.listTasks(requestParameters.objectKey, requestParameters.sort, requestParameters.search, requestParameters.includeWaiting, requestParameters.includeRunning, requestParameters.includeComplete, requestParameters.includeFailed, requestParameters.offset, requestParameters.limit, requestParameters.folderId, options).then((request) => request(axios2, basePath));
    }
  };
};

class ServerTasksApi extends BaseAPI {
  getTask(requestParameters, options) {
    return ServerTasksApiFp(this.configuration).getTask(requestParameters.taskId, options).then((request) => request(this.axios, this.basePath));
  }
  listTasks(requestParameters = {}, options) {
    return ServerTasksApiFp(this.configuration).listTasks(requestParameters.objectKey, requestParameters.sort, requestParameters.search, requestParameters.includeWaiting, requestParameters.includeRunning, requestParameters.includeComplete, requestParameters.includeFailed, requestParameters.offset, requestParameters.limit, requestParameters.folderId, options).then((request) => request(this.axios, this.basePath));
  }
}
var ListTasksSortEnum = {
  CreatedAtAsc: "createdAt-asc",
  CreatedAtDesc: "createdAt-desc",
  UpdatedAtAsc: "updatedAt-asc",
  UpdatedAtDesc: "updatedAt-desc"
};
var ListTasksIncludeWaitingEnum = {
  True: "true"
};
var ListTasksIncludeRunningEnum = {
  True: "true"
};
var ListTasksIncludeCompleteEnum = {
  True: "true"
};
var ListTasksIncludeFailedEnum = {
  True: "true"
};
var TasksApiAxiosParamCreator = function(configuration) {
  return {
    getFolderTask: async (folderId, taskId, options = {}) => {
      assertParamExists("getFolderTask", "folderId", folderId);
      assertParamExists("getFolderTask", "taskId", taskId);
      const localVarPath = `/api/v1/folders/{folderId}/tasks/{taskId}`.replace(`{${"folderId"}}`, encodeURIComponent(String(folderId))).replace(`{${"taskId"}}`, encodeURIComponent(String(taskId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    listFolderTasks: async (folderId, objectKey, sort, search, includeWaiting, includeRunning, includeComplete, includeFailed, offset, limit, options = {}) => {
      assertParamExists("listFolderTasks", "folderId", folderId);
      const localVarPath = `/api/v1/folders/{folderId}/tasks`.replace(`{${"folderId"}}`, encodeURIComponent(String(folderId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      if (objectKey !== undefined) {
        localVarQueryParameter["objectKey"] = objectKey;
      }
      if (sort !== undefined) {
        localVarQueryParameter["sort"] = sort;
      }
      if (search !== undefined) {
        localVarQueryParameter["search"] = search;
      }
      if (includeWaiting !== undefined) {
        localVarQueryParameter["includeWaiting"] = includeWaiting;
      }
      if (includeRunning !== undefined) {
        localVarQueryParameter["includeRunning"] = includeRunning;
      }
      if (includeComplete !== undefined) {
        localVarQueryParameter["includeComplete"] = includeComplete;
      }
      if (includeFailed !== undefined) {
        localVarQueryParameter["includeFailed"] = includeFailed;
      }
      if (offset !== undefined) {
        localVarQueryParameter["offset"] = offset;
      }
      if (limit !== undefined) {
        localVarQueryParameter["limit"] = limit;
      }
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    }
  };
};
var TasksApiFp = function(configuration) {
  const localVarAxiosParamCreator = TasksApiAxiosParamCreator(configuration);
  return {
    async getFolderTask(folderId, taskId, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getFolderTask(folderId, taskId, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["TasksApi.getFolderTask"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async listFolderTasks(folderId, objectKey, sort, search, includeWaiting, includeRunning, includeComplete, includeFailed, offset, limit, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.listFolderTasks(folderId, objectKey, sort, search, includeWaiting, includeRunning, includeComplete, includeFailed, offset, limit, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["TasksApi.listFolderTasks"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    }
  };
};
var TasksApiFactory = function(configuration, basePath, axios2) {
  const localVarFp = TasksApiFp(configuration);
  return {
    getFolderTask(requestParameters, options) {
      return localVarFp.getFolderTask(requestParameters.folderId, requestParameters.taskId, options).then((request) => request(axios2, basePath));
    },
    listFolderTasks(requestParameters, options) {
      return localVarFp.listFolderTasks(requestParameters.folderId, requestParameters.objectKey, requestParameters.sort, requestParameters.search, requestParameters.includeWaiting, requestParameters.includeRunning, requestParameters.includeComplete, requestParameters.includeFailed, requestParameters.offset, requestParameters.limit, options).then((request) => request(axios2, basePath));
    }
  };
};

class TasksApi extends BaseAPI {
  getFolderTask(requestParameters, options) {
    return TasksApiFp(this.configuration).getFolderTask(requestParameters.folderId, requestParameters.taskId, options).then((request) => request(this.axios, this.basePath));
  }
  listFolderTasks(requestParameters, options) {
    return TasksApiFp(this.configuration).listFolderTasks(requestParameters.folderId, requestParameters.objectKey, requestParameters.sort, requestParameters.search, requestParameters.includeWaiting, requestParameters.includeRunning, requestParameters.includeComplete, requestParameters.includeFailed, requestParameters.offset, requestParameters.limit, options).then((request) => request(this.axios, this.basePath));
  }
}
var ListFolderTasksSortEnum = {
  CreatedAtAsc: "createdAt-asc",
  CreatedAtDesc: "createdAt-desc",
  UpdatedAtAsc: "updatedAt-asc",
  UpdatedAtDesc: "updatedAt-desc"
};
var ListFolderTasksIncludeWaitingEnum = {
  True: "true"
};
var ListFolderTasksIncludeRunningEnum = {
  True: "true"
};
var ListFolderTasksIncludeCompleteEnum = {
  True: "true"
};
var ListFolderTasksIncludeFailedEnum = {
  True: "true"
};
var UserStorageProvisionsApiAxiosParamCreator = function(configuration) {
  return {
    createUserStorageProvision: async (userStorageProvisionInputDTO, options = {}) => {
      assertParamExists("createUserStorageProvision", "userStorageProvisionInputDTO", userStorageProvisionInputDTO);
      const localVarPath = `/api/v1/server/user-storage-provisions`;
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "POST", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      localVarHeaderParameter["Content-Type"] = "application/json";
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      localVarRequestOptions.data = serializeDataIfNeeded(userStorageProvisionInputDTO, localVarRequestOptions, configuration);
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    deleteUserStorageProvision: async (userStorageProvisionId, options = {}) => {
      assertParamExists("deleteUserStorageProvision", "userStorageProvisionId", userStorageProvisionId);
      const localVarPath = `/api/v1/server/user-storage-provisions/{userStorageProvisionId}`.replace(`{${"userStorageProvisionId"}}`, encodeURIComponent(String(userStorageProvisionId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "DELETE", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    getUserStorageProvision: async (userStorageProvisionId, options = {}) => {
      assertParamExists("getUserStorageProvision", "userStorageProvisionId", userStorageProvisionId);
      const localVarPath = `/api/v1/server/user-storage-provisions/{userStorageProvisionId}`.replace(`{${"userStorageProvisionId"}}`, encodeURIComponent(String(userStorageProvisionId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    listUserStorageProvisions: async (provisionType, options = {}) => {
      const localVarPath = `/api/v1/server/user-storage-provisions`;
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      if (provisionType !== undefined) {
        localVarQueryParameter["provisionType"] = provisionType;
      }
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    updateUserStorageProvision: async (userStorageProvisionId, userStorageProvisionInputDTO, options = {}) => {
      assertParamExists("updateUserStorageProvision", "userStorageProvisionId", userStorageProvisionId);
      assertParamExists("updateUserStorageProvision", "userStorageProvisionInputDTO", userStorageProvisionInputDTO);
      const localVarPath = `/api/v1/server/user-storage-provisions/{userStorageProvisionId}`.replace(`{${"userStorageProvisionId"}}`, encodeURIComponent(String(userStorageProvisionId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "PUT", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      localVarHeaderParameter["Content-Type"] = "application/json";
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      localVarRequestOptions.data = serializeDataIfNeeded(userStorageProvisionInputDTO, localVarRequestOptions, configuration);
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    }
  };
};
var UserStorageProvisionsApiFp = function(configuration) {
  const localVarAxiosParamCreator = UserStorageProvisionsApiAxiosParamCreator(configuration);
  return {
    async createUserStorageProvision(userStorageProvisionInputDTO, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.createUserStorageProvision(userStorageProvisionInputDTO, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["UserStorageProvisionsApi.createUserStorageProvision"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async deleteUserStorageProvision(userStorageProvisionId, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.deleteUserStorageProvision(userStorageProvisionId, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["UserStorageProvisionsApi.deleteUserStorageProvision"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async getUserStorageProvision(userStorageProvisionId, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getUserStorageProvision(userStorageProvisionId, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["UserStorageProvisionsApi.getUserStorageProvision"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async listUserStorageProvisions(provisionType, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.listUserStorageProvisions(provisionType, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["UserStorageProvisionsApi.listUserStorageProvisions"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async updateUserStorageProvision(userStorageProvisionId, userStorageProvisionInputDTO, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.updateUserStorageProvision(userStorageProvisionId, userStorageProvisionInputDTO, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["UserStorageProvisionsApi.updateUserStorageProvision"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    }
  };
};
var UserStorageProvisionsApiFactory = function(configuration, basePath, axios2) {
  const localVarFp = UserStorageProvisionsApiFp(configuration);
  return {
    createUserStorageProvision(requestParameters, options) {
      return localVarFp.createUserStorageProvision(requestParameters.userStorageProvisionInputDTO, options).then((request) => request(axios2, basePath));
    },
    deleteUserStorageProvision(requestParameters, options) {
      return localVarFp.deleteUserStorageProvision(requestParameters.userStorageProvisionId, options).then((request) => request(axios2, basePath));
    },
    getUserStorageProvision(requestParameters, options) {
      return localVarFp.getUserStorageProvision(requestParameters.userStorageProvisionId, options).then((request) => request(axios2, basePath));
    },
    listUserStorageProvisions(requestParameters = {}, options) {
      return localVarFp.listUserStorageProvisions(requestParameters.provisionType, options).then((request) => request(axios2, basePath));
    },
    updateUserStorageProvision(requestParameters, options) {
      return localVarFp.updateUserStorageProvision(requestParameters.userStorageProvisionId, requestParameters.userStorageProvisionInputDTO, options).then((request) => request(axios2, basePath));
    }
  };
};

class UserStorageProvisionsApi extends BaseAPI {
  createUserStorageProvision(requestParameters, options) {
    return UserStorageProvisionsApiFp(this.configuration).createUserStorageProvision(requestParameters.userStorageProvisionInputDTO, options).then((request) => request(this.axios, this.basePath));
  }
  deleteUserStorageProvision(requestParameters, options) {
    return UserStorageProvisionsApiFp(this.configuration).deleteUserStorageProvision(requestParameters.userStorageProvisionId, options).then((request) => request(this.axios, this.basePath));
  }
  getUserStorageProvision(requestParameters, options) {
    return UserStorageProvisionsApiFp(this.configuration).getUserStorageProvision(requestParameters.userStorageProvisionId, options).then((request) => request(this.axios, this.basePath));
  }
  listUserStorageProvisions(requestParameters = {}, options) {
    return UserStorageProvisionsApiFp(this.configuration).listUserStorageProvisions(requestParameters.provisionType, options).then((request) => request(this.axios, this.basePath));
  }
  updateUserStorageProvision(requestParameters, options) {
    return UserStorageProvisionsApiFp(this.configuration).updateUserStorageProvision(requestParameters.userStorageProvisionId, requestParameters.userStorageProvisionInputDTO, options).then((request) => request(this.axios, this.basePath));
  }
}
var ListUserStorageProvisionsProvisionTypeEnum = {
  Content: "CONTENT",
  Metadata: "METADATA",
  Redundancy: "REDUNDANCY"
};
var UsersApiAxiosParamCreator = function(configuration) {
  return {
    createUser: async (userCreateInputDTO, options = {}) => {
      assertParamExists("createUser", "userCreateInputDTO", userCreateInputDTO);
      const localVarPath = `/api/v1/server/users`;
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "POST", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      localVarHeaderParameter["Content-Type"] = "application/json";
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      localVarRequestOptions.data = serializeDataIfNeeded(userCreateInputDTO, localVarRequestOptions, configuration);
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    deleteUser: async (userId, options = {}) => {
      assertParamExists("deleteUser", "userId", userId);
      const localVarPath = `/api/v1/server/users/{userId}`.replace(`{${"userId"}}`, encodeURIComponent(String(userId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "DELETE", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    getUser: async (userId, options = {}) => {
      assertParamExists("getUser", "userId", userId);
      const localVarPath = `/api/v1/server/users/{userId}`.replace(`{${"userId"}}`, encodeURIComponent(String(userId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    listActiveUserSessions: async (userId, options = {}) => {
      assertParamExists("listActiveUserSessions", "userId", userId);
      const localVarPath = `/api/v1/server/users/{userId}/sessions`.replace(`{${"userId"}}`, encodeURIComponent(String(userId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    listUsers: async (offset, limit, isAdmin, sort, search, options = {}) => {
      const localVarPath = `/api/v1/server/users`;
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      if (offset !== undefined) {
        localVarQueryParameter["offset"] = offset;
      }
      if (limit !== undefined) {
        localVarQueryParameter["limit"] = limit;
      }
      if (isAdmin !== undefined) {
        localVarQueryParameter["isAdmin"] = isAdmin;
      }
      if (sort !== undefined) {
        localVarQueryParameter["sort"] = sort;
      }
      if (search !== undefined) {
        localVarQueryParameter["search"] = search;
      }
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    updateUser: async (userId, userUpdateInputDTO, options = {}) => {
      assertParamExists("updateUser", "userId", userId);
      assertParamExists("updateUser", "userUpdateInputDTO", userUpdateInputDTO);
      const localVarPath = `/api/v1/server/users/{userId}`.replace(`{${"userId"}}`, encodeURIComponent(String(userId)));
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "PATCH", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      localVarHeaderParameter["Content-Type"] = "application/json";
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      localVarRequestOptions.data = serializeDataIfNeeded(userUpdateInputDTO, localVarRequestOptions, configuration);
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    }
  };
};
var UsersApiFp = function(configuration) {
  const localVarAxiosParamCreator = UsersApiAxiosParamCreator(configuration);
  return {
    async createUser(userCreateInputDTO, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.createUser(userCreateInputDTO, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["UsersApi.createUser"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async deleteUser(userId, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.deleteUser(userId, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["UsersApi.deleteUser"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async getUser(userId, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getUser(userId, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["UsersApi.getUser"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async listActiveUserSessions(userId, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.listActiveUserSessions(userId, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["UsersApi.listActiveUserSessions"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async listUsers(offset, limit, isAdmin, sort, search, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.listUsers(offset, limit, isAdmin, sort, search, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["UsersApi.listUsers"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async updateUser(userId, userUpdateInputDTO, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.updateUser(userId, userUpdateInputDTO, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["UsersApi.updateUser"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    }
  };
};
var UsersApiFactory = function(configuration, basePath, axios2) {
  const localVarFp = UsersApiFp(configuration);
  return {
    createUser(requestParameters, options) {
      return localVarFp.createUser(requestParameters.userCreateInputDTO, options).then((request) => request(axios2, basePath));
    },
    deleteUser(requestParameters, options) {
      return localVarFp.deleteUser(requestParameters.userId, options).then((request) => request(axios2, basePath));
    },
    getUser(requestParameters, options) {
      return localVarFp.getUser(requestParameters.userId, options).then((request) => request(axios2, basePath));
    },
    listActiveUserSessions(requestParameters, options) {
      return localVarFp.listActiveUserSessions(requestParameters.userId, options).then((request) => request(axios2, basePath));
    },
    listUsers(requestParameters = {}, options) {
      return localVarFp.listUsers(requestParameters.offset, requestParameters.limit, requestParameters.isAdmin, requestParameters.sort, requestParameters.search, options).then((request) => request(axios2, basePath));
    },
    updateUser(requestParameters, options) {
      return localVarFp.updateUser(requestParameters.userId, requestParameters.userUpdateInputDTO, options).then((request) => request(axios2, basePath));
    }
  };
};

class UsersApi extends BaseAPI {
  createUser(requestParameters, options) {
    return UsersApiFp(this.configuration).createUser(requestParameters.userCreateInputDTO, options).then((request) => request(this.axios, this.basePath));
  }
  deleteUser(requestParameters, options) {
    return UsersApiFp(this.configuration).deleteUser(requestParameters.userId, options).then((request) => request(this.axios, this.basePath));
  }
  getUser(requestParameters, options) {
    return UsersApiFp(this.configuration).getUser(requestParameters.userId, options).then((request) => request(this.axios, this.basePath));
  }
  listActiveUserSessions(requestParameters, options) {
    return UsersApiFp(this.configuration).listActiveUserSessions(requestParameters.userId, options).then((request) => request(this.axios, this.basePath));
  }
  listUsers(requestParameters = {}, options) {
    return UsersApiFp(this.configuration).listUsers(requestParameters.offset, requestParameters.limit, requestParameters.isAdmin, requestParameters.sort, requestParameters.search, options).then((request) => request(this.axios, this.basePath));
  }
  updateUser(requestParameters, options) {
    return UsersApiFp(this.configuration).updateUser(requestParameters.userId, requestParameters.userUpdateInputDTO, options).then((request) => request(this.axios, this.basePath));
  }
}
var ListUsersSortEnum = {
  CreatedAtAsc: "createdAt-asc",
  CreatedAtDesc: "createdAt-desc",
  EmailAsc: "email-asc",
  EmailDesc: "email-desc",
  NameAsc: "name-asc",
  NameDesc: "name-desc",
  UsernameAsc: "username-asc",
  UsernameDesc: "username-desc",
  UpdatedAtAsc: "updatedAt-asc",
  UpdatedAtDesc: "updatedAt-desc"
};
var ViewerApiAxiosParamCreator = function(configuration) {
  return {
    getViewer: async (options = {}) => {
      const localVarPath = `/api/v1/viewer`;
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "GET", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    },
    updateViewer: async (viewerUpdateInputDTO, options = {}) => {
      assertParamExists("updateViewer", "viewerUpdateInputDTO", viewerUpdateInputDTO);
      const localVarPath = `/api/v1/viewer`;
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }
      const localVarRequestOptions = { method: "PUT", ...baseOptions, ...options };
      const localVarHeaderParameter = {};
      const localVarQueryParameter = {};
      await setBearerAuthToObject(localVarHeaderParameter, configuration);
      localVarHeaderParameter["Content-Type"] = "application/json";
      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
      localVarRequestOptions.data = serializeDataIfNeeded(viewerUpdateInputDTO, localVarRequestOptions, configuration);
      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions
      };
    }
  };
};
var ViewerApiFp = function(configuration) {
  const localVarAxiosParamCreator = ViewerApiAxiosParamCreator(configuration);
  return {
    async getViewer(options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getViewer(options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["ViewerApi.getViewer"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    },
    async updateViewer(viewerUpdateInputDTO, options) {
      const localVarAxiosArgs = await localVarAxiosParamCreator.updateViewer(viewerUpdateInputDTO, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath = operationServerMap["ViewerApi.updateViewer"]?.[localVarOperationServerIndex]?.url;
      return (axios2, basePath) => createRequestFunction(localVarAxiosArgs, axios_default, BASE_PATH, configuration)(axios2, localVarOperationServerBasePath || basePath);
    }
  };
};
var ViewerApiFactory = function(configuration, basePath, axios2) {
  const localVarFp = ViewerApiFp(configuration);
  return {
    getViewer(options) {
      return localVarFp.getViewer(options).then((request) => request(axios2, basePath));
    },
    updateViewer(requestParameters, options) {
      return localVarFp.updateViewer(requestParameters.viewerUpdateInputDTO, options).then((request) => request(axios2, basePath));
    }
  };
};

class ViewerApi extends BaseAPI {
  getViewer(options) {
    return ViewerApiFp(this.configuration).getViewer(options).then((request) => request(this.axios, this.basePath));
  }
  updateViewer(requestParameters, options) {
    return ViewerApiFp(this.configuration).updateViewer(requestParameters.viewerUpdateInputDTO, options).then((request) => request(this.axios, this.basePath));
  }
}
// src/configuration.ts
class Configuration {
  apiKey;
  username;
  password;
  accessToken;
  basePath;
  serverIndex;
  baseOptions;
  formDataCtor;
  constructor(param = {}) {
    this.apiKey = param.apiKey;
    this.username = param.username;
    this.password = param.password;
    this.accessToken = param.accessToken;
    this.basePath = param.basePath;
    this.serverIndex = param.serverIndex;
    this.baseOptions = param.baseOptions;
    this.formDataCtor = param.formDataCtor;
  }
  isJsonMime(mime) {
    const jsonMime = new RegExp("^(application/json|[^;/ \t]+/[^;/ \t]+[+]json)[ \t]*(;.*)?$", "i");
    return mime !== null && (jsonMime.test(mime) || mime.toLowerCase() === "application/json-patch+json");
  }
}
// src/schema.ts
var schema = {
  openapi: "3.1.0",
  paths: {
    "/api/v1/auth/login": {
      post: {
        operationId: "login",
        parameters: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/LoginCredentialsDTO"
              }
            }
          }
        },
        responses: {
          "201": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/LoginResponse"
                }
              }
            }
          }
        },
        summary: "Authenticate the user and return access and refresh tokens.",
        tags: [
          "Auth"
        ]
      }
    },
    "/api/v1/auth/signup": {
      post: {
        operationId: "signup",
        parameters: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/SignupCredentialsDTO"
              }
            }
          }
        },
        responses: {
          "201": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SignupResponse"
                }
              }
            }
          }
        },
        summary: "Register a new user.",
        tags: [
          "Auth"
        ]
      }
    },
    "/api/v1/auth/logout": {
      post: {
        operationId: "logout",
        parameters: [],
        responses: {
          "201": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  type: "boolean"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Logout. Kill the current session.",
        tags: [
          "Auth"
        ]
      }
    },
    "/api/v1/auth/{refreshToken}": {
      post: {
        operationId: "refreshToken",
        parameters: [
          {
            name: "refreshToken",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "201": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/TokenRefreshResponse"
                }
              }
            }
          }
        },
        summary: "Refresh a session with a refresh token.",
        tags: [
          "Auth"
        ]
      }
    },
    "/api/v1/viewer": {
      get: {
        operationId: "getViewer",
        parameters: [],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ViewerGetResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        tags: [
          "Viewer"
        ]
      },
      put: {
        operationId: "updateViewer",
        parameters: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ViewerUpdateInputDTO"
              }
            }
          }
        },
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ViewerGetResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        tags: [
          "Viewer"
        ]
      }
    },
    "/api/v1/server/users": {
      post: {
        operationId: "createUser",
        parameters: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UserCreateInputDTO"
              }
            }
          }
        },
        responses: {
          "201": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserGetResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Create a user.",
        tags: [
          "Users"
        ]
      },
      get: {
        operationId: "listUsers",
        parameters: [
          {
            name: "offset",
            required: false,
            in: "query",
            schema: {
              type: "number"
            }
          },
          {
            name: "limit",
            required: false,
            in: "query",
            schema: {
              type: "number"
            }
          },
          {
            name: "isAdmin",
            required: false,
            in: "query",
            schema: {
              type: "boolean"
            }
          },
          {
            name: "sort",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "createdAt-asc",
                "createdAt-desc",
                "email-asc",
                "email-desc",
                "name-asc",
                "name-desc",
                "username-asc",
                "username-desc",
                "updatedAt-asc",
                "updatedAt-desc"
              ]
            }
          },
          {
            name: "search",
            required: false,
            in: "query",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserListResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "List the users.",
        tags: [
          "Users"
        ]
      }
    },
    "/api/v1/server/users/{userId}": {
      patch: {
        operationId: "updateUser",
        parameters: [
          {
            name: "userId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UserUpdateInputDTO"
              }
            }
          }
        },
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserGetResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Update a user.",
        tags: [
          "Users"
        ]
      },
      get: {
        operationId: "getUser",
        parameters: [
          {
            name: "userId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserGetResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Get a user by id.",
        tags: [
          "Users"
        ]
      },
      delete: {
        operationId: "deleteUser",
        parameters: [
          {
            name: "userId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: ""
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Delete a server user by id.",
        tags: [
          "Users"
        ]
      }
    },
    "/api/v1/server/users/{userId}/sessions": {
      get: {
        operationId: "listActiveUserSessions",
        parameters: [
          {
            name: "userId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserSessionListResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        tags: [
          "Users"
        ]
      }
    },
    "/api/v1/folders/{folderId}": {
      get: {
        operationId: "getFolder",
        parameters: [
          {
            name: "folderId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/FolderGetResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Get a folder by id.",
        tags: [
          "Folders"
        ]
      },
      delete: {
        operationId: "deleteFolder",
        parameters: [
          {
            name: "folderId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: ""
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Delete a folder by id.",
        tags: [
          "Folders"
        ]
      },
      put: {
        operationId: "updateFolder",
        parameters: [
          {
            name: "folderId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/FolderUpdateInputDTO"
              }
            }
          }
        },
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/FolderUpdateResponseDTO"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Update a folder by id.",
        tags: [
          "Folders"
        ]
      }
    },
    "/api/v1/folders/{folderId}/metadata": {
      get: {
        operationId: "getFolderMetadata",
        parameters: [
          {
            name: "folderId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/FolderGetMetadataResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Get the metadata for a folder by id.",
        tags: [
          "Folders"
        ]
      }
    },
    "/api/v1/folders": {
      get: {
        operationId: "listFolders",
        parameters: [
          {
            name: "offset",
            required: false,
            in: "query",
            schema: {
              type: "number"
            }
          },
          {
            name: "limit",
            required: false,
            in: "query",
            schema: {
              type: "number"
            }
          },
          {
            name: "sort",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "name-asc",
                "name-desc",
                "createdAt-asc",
                "createdAt-desc",
                "updatedAt-asc",
                "updatedAt-desc"
              ]
            }
          },
          {
            name: "search",
            required: false,
            in: "query",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/FolderListResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "List folders.",
        tags: [
          "Folders"
        ]
      },
      post: {
        operationId: "createFolder",
        parameters: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/FolderCreateInputDTO"
              }
            }
          }
        },
        responses: {
          "201": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/FolderCreateResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Create a folder.",
        tags: [
          "Folders"
        ]
      }
    },
    "/api/v1/folders/{folderId}/reindex": {
      post: {
        operationId: "reindexFolder",
        parameters: [
          {
            name: "folderId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "201": {
            description: ""
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Scan the underlying S3 location and update our local representation of it.",
        tags: [
          "Folders"
        ]
      }
    },
    "/api/v1/folders/{folderId}/objects": {
      get: {
        operationId: "listFolderObjects",
        parameters: [
          {
            name: "folderId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          },
          {
            name: "offset",
            required: false,
            in: "query",
            schema: {
              type: "number"
            }
          },
          {
            name: "limit",
            required: false,
            in: "query",
            schema: {
              type: "number"
            }
          },
          {
            name: "search",
            required: false,
            in: "query",
            schema: {
              type: "string"
            }
          },
          {
            name: "sort",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "size-asc",
                "size-desc",
                "filename-asc",
                "filename-desc",
                "objectKey-asc",
                "objectKey-desc",
                "createdAt-asc",
                "createdAt-desc",
                "updatedAt-asc",
                "updatedAt-desc"
              ]
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/FolderObjectListResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "List folder objects by folderId.",
        tags: [
          "Folders"
        ]
      }
    },
    "/api/v1/folders/{folderId}/objects/{objectKey}": {
      get: {
        operationId: "getFolderObject",
        parameters: [
          {
            name: "folderId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          },
          {
            name: "objectKey",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/FolderObjectGetResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Get a folder object by folderId and objectKey.",
        tags: [
          "Folders"
        ]
      },
      delete: {
        operationId: "deleteFolderObject",
        parameters: [
          {
            name: "folderId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          },
          {
            name: "objectKey",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: ""
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Delete a folder object by folderId and objectKey.",
        tags: [
          "Folders"
        ]
      },
      post: {
        operationId: "refreshFolderObjectS3Metadata",
        parameters: [
          {
            name: "folderId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          },
          {
            name: "objectKey",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "201": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/FolderObjectGetResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Scan the object again in the underlying storage, and update its state in our db.",
        tags: [
          "Folders"
        ]
      }
    },
    "/api/v1/folders/{folderId}/presigned-urls": {
      post: {
        operationId: "createPresignedUrls",
        parameters: [
          {
            name: "folderId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/FolderCreateSignedUrlInputDTO"
              }
            }
          }
        },
        responses: {
          "201": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/FolderCreateSignedUrlsResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Create presigned urls for objects in a folder.",
        tags: [
          "Folders"
        ]
      }
    },
    "/api/v1/folders/{folderId}/apps/{appIdentifier}/trigger/{taskKey}": {
      post: {
        operationId: "handleAppTaskTrigger",
        parameters: [
          {
            name: "folderId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          },
          {
            name: "appIdentifier",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          },
          {
            name: "taskKey",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/TriggerAppTaskInputDTO"
              }
            }
          }
        },
        responses: {
          "201": {
            description: ""
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Handle app task trigger",
        tags: [
          "Folders"
        ]
      }
    },
    "/api/v1/folders/{folderId}/shares/{userId}": {
      get: {
        operationId: "getFolderShares",
        parameters: [
          {
            name: "folderId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          },
          {
            name: "userId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/FolderShareGetResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Get folder share for a user",
        tags: [
          "Folders"
        ]
      },
      post: {
        operationId: "upsertFolderShare",
        parameters: [
          {
            name: "folderId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          },
          {
            name: "userId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/FolderShareCreateInputDTO"
              }
            }
          }
        },
        responses: {
          "201": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/FolderShareGetResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Add or update a folder share",
        tags: [
          "Folders"
        ]
      },
      delete: {
        operationId: "removeFolderShare",
        parameters: [
          {
            name: "folderId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          },
          {
            name: "userId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: ""
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Remove a folder share",
        tags: [
          "Folders"
        ]
      }
    },
    "/api/v1/folders/{folderId}/shares": {
      get: {
        operationId: "listFolderShares",
        parameters: [
          {
            name: "folderId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/FolderShareListResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "List folder shares",
        tags: [
          "Folders"
        ]
      }
    },
    "/api/v1/folders/{folderId}/user-share-options": {
      get: {
        operationId: "listFolderShareUsers",
        parameters: [
          {
            name: "folderId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          },
          {
            name: "offset",
            required: false,
            in: "query",
            schema: {
              type: "number"
            }
          },
          {
            name: "limit",
            required: false,
            in: "query",
            schema: {
              type: "number"
            }
          },
          {
            name: "search",
            required: false,
            in: "query",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/FolderShareUserListResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "List prospective folder share users",
        tags: [
          "Folders"
        ]
      }
    },
    "/api/v1/access-keys": {
      get: {
        operationId: "listAccessKeys",
        parameters: [
          {
            name: "offset",
            required: false,
            in: "query",
            schema: {
              type: "number"
            }
          },
          {
            name: "limit",
            required: false,
            in: "query",
            schema: {
              type: "number"
            }
          },
          {
            name: "sort",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "accessKeyId-asc",
                "accessKeyId-desc",
                "accessKeyHashId-asc",
                "accessKeyHashId-desc",
                "endpoint-asc",
                "endpoint-desc",
                "region-asc",
                "region-desc",
                "updatedAt-asc",
                "updatedAt-desc"
              ]
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AccessKeyListResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "List access keys.",
        tags: [
          "AccessKeys"
        ]
      }
    },
    "/api/v1/access-keys/{accessKeyHashId}": {
      get: {
        operationId: "getAccessKey",
        parameters: [
          {
            name: "accessKeyHashId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AccessKeyGetResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Get an access key by id.",
        tags: [
          "AccessKeys"
        ]
      }
    },
    "/api/v1/access-keys/{accessKeyHashId}/rotate": {
      post: {
        operationId: "rotateAccessKey",
        parameters: [
          {
            name: "accessKeyHashId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RotateAccessKeyInputDTO"
              }
            }
          }
        },
        responses: {
          "201": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AccessKeyRotateResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Rotate an access key.",
        tags: [
          "AccessKeys"
        ]
      }
    },
    "/api/v1/access-keys/{accessKeyHashId}/buckets": {
      get: {
        operationId: "listAccessKeyBuckets",
        parameters: [
          {
            name: "accessKeyHashId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AccessKeyBucketsListResponseDTO"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "List buckets for an access key.",
        tags: [
          "AccessKeys"
        ]
      }
    },
    "/api/v1/server/access-keys": {
      get: {
        operationId: "listServerAccessKeys",
        parameters: [
          {
            name: "offset",
            required: false,
            in: "query",
            schema: {
              type: "number"
            }
          },
          {
            name: "limit",
            required: false,
            in: "query",
            schema: {
              type: "number"
            }
          },
          {
            name: "sort",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "accessKeyId-asc",
                "accessKeyId-desc",
                "accessKeyHashId-asc",
                "accessKeyHashId-desc",
                "endpoint-asc",
                "endpoint-desc",
                "region-asc",
                "region-desc",
                "updatedAt-asc",
                "updatedAt-desc"
              ]
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AccessKeyListResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "List server access keys.",
        tags: [
          "ServerAccessKeys"
        ]
      }
    },
    "/api/v1/server/access-keys/{accessKeyHashId}": {
      get: {
        operationId: "getServerAccessKey",
        parameters: [
          {
            name: "accessKeyHashId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AccessKeyGetResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Get server access key by id.",
        tags: [
          "ServerAccessKeys"
        ]
      }
    },
    "/api/v1/server/access-keys/{accessKeyHashId}/rotate": {
      post: {
        operationId: "rotateServerAccessKey",
        parameters: [
          {
            name: "accessKeyHashId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RotateAccessKeyInputDTO"
              }
            }
          }
        },
        responses: {
          "201": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AccessKeyRotateResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Rotate a server access key.",
        tags: [
          "ServerAccessKeys"
        ]
      }
    },
    "/api/v1/server/access-keys/{accessKeyHashId}/buckets": {
      get: {
        operationId: "listServerAccessKeyBuckets",
        parameters: [
          {
            name: "accessKeyHashId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AccessKeyBucketsListResponseDTO"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "List buckets for an access key.",
        tags: [
          "ServerAccessKeys"
        ]
      }
    },
    "/api/v1/server/settings": {
      get: {
        operationId: "getServerSettings",
        parameters: [],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SettingsGetResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Get the server settings object.",
        tags: [
          "Server"
        ]
      }
    },
    "/api/v1/server/settings/{settingKey}": {
      put: {
        operationId: "setServerSetting",
        parameters: [
          {
            name: "settingKey",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/SetSettingInputDTO"
              }
            }
          }
        },
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SettingSetResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Set a setting in the server settings objects.",
        tags: [
          "Server"
        ]
      },
      delete: {
        operationId: "resetServerSetting",
        parameters: [
          {
            name: "settingKey",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SettingSetResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Reset a setting in the server settings objects.",
        tags: [
          "Server"
        ]
      }
    },
    "/api/v1/server/user-storage-provisions": {
      get: {
        operationId: "listUserStorageProvisions",
        parameters: [
          {
            name: "provisionType",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "CONTENT",
                "METADATA",
                "REDUNDANCY"
              ]
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserStorageProvisionListResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "List the user storage provisions.",
        tags: [
          "UserStorageProvisions"
        ]
      },
      post: {
        operationId: "createUserStorageProvision",
        parameters: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UserStorageProvisionInputDTO"
              }
            }
          }
        },
        responses: {
          "201": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserStorageProvisionListResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Create a new user storage provision.",
        tags: [
          "UserStorageProvisions"
        ]
      }
    },
    "/api/v1/server/user-storage-provisions/{userStorageProvisionId}": {
      get: {
        operationId: "getUserStorageProvision",
        parameters: [
          {
            name: "userStorageProvisionId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserStorageProvisionGetResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Get a user storage provision by id.",
        tags: [
          "UserStorageProvisions"
        ]
      },
      put: {
        operationId: "updateUserStorageProvision",
        parameters: [
          {
            name: "userStorageProvisionId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UserStorageProvisionInputDTO"
              }
            }
          }
        },
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserStorageProvisionListResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Update a server provision by id.",
        tags: [
          "UserStorageProvisions"
        ]
      },
      delete: {
        operationId: "deleteUserStorageProvision",
        parameters: [
          {
            name: "userStorageProvisionId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserStorageProvisionListResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Delete a server provision by id.",
        tags: [
          "UserStorageProvisions"
        ]
      }
    },
    "/api/v1/server/server-storage-location": {
      get: {
        operationId: "getServerStorageLocation",
        parameters: [],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ServerStorageLocationGetResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Get the server storage location.",
        tags: [
          "ServerStorageLocation"
        ]
      },
      post: {
        operationId: "setServerStorageLocation",
        parameters: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ServerStorageLocationInputDTO"
              }
            }
          }
        },
        responses: {
          "201": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ServerStorageLocationGetResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Create a new server provision.",
        tags: [
          "ServerStorageLocation"
        ]
      },
      delete: {
        operationId: "deleteServerStorageLocation",
        parameters: [],
        responses: {
          "200": {
            description: ""
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Delete any set server storage location.",
        tags: [
          "ServerStorageLocation"
        ]
      }
    },
    "/api/v1/server/tasks/{taskId}": {
      get: {
        operationId: "getTask",
        parameters: [
          {
            name: "taskId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/TaskGetResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Get a task by id.",
        tags: [
          "ServerTasks"
        ]
      }
    },
    "/api/v1/server/tasks": {
      get: {
        operationId: "listTasks",
        parameters: [
          {
            name: "objectKey",
            required: false,
            in: "query",
            schema: {
              type: "string"
            }
          },
          {
            name: "sort",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "createdAt-asc",
                "createdAt-desc",
                "updatedAt-asc",
                "updatedAt-desc"
              ]
            }
          },
          {
            name: "search",
            required: false,
            in: "query",
            schema: {
              type: "string"
            }
          },
          {
            name: "includeWaiting",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "true"
              ]
            }
          },
          {
            name: "includeRunning",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "true"
              ]
            }
          },
          {
            name: "includeComplete",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "true"
              ]
            }
          },
          {
            name: "includeFailed",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "true"
              ]
            }
          },
          {
            name: "offset",
            required: false,
            in: "query",
            schema: {
              type: "number"
            }
          },
          {
            name: "limit",
            required: false,
            in: "query",
            schema: {
              type: "number"
            }
          },
          {
            name: "folderId",
            required: false,
            in: "query",
            schema: {
              format: "uuid",
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/TaskListResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "List tasks.",
        tags: [
          "ServerTasks"
        ]
      }
    },
    "/api/v1/folders/{folderId}/tasks/{taskId}": {
      get: {
        operationId: "getFolderTask",
        parameters: [
          {
            name: "folderId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          },
          {
            name: "taskId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/TaskGetResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Get a folder task by id.",
        tags: [
          "Tasks"
        ]
      }
    },
    "/api/v1/folders/{folderId}/tasks": {
      get: {
        operationId: "listFolderTasks",
        parameters: [
          {
            name: "objectKey",
            required: false,
            in: "query",
            schema: {
              type: "string"
            }
          },
          {
            name: "sort",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "createdAt-asc",
                "createdAt-desc",
                "updatedAt-asc",
                "updatedAt-desc"
              ]
            }
          },
          {
            name: "search",
            required: false,
            in: "query",
            schema: {
              type: "string"
            }
          },
          {
            name: "includeWaiting",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "true"
              ]
            }
          },
          {
            name: "includeRunning",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "true"
              ]
            }
          },
          {
            name: "includeComplete",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "true"
              ]
            }
          },
          {
            name: "includeFailed",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "true"
              ]
            }
          },
          {
            name: "offset",
            required: false,
            in: "query",
            schema: {
              type: "number"
            }
          },
          {
            name: "limit",
            required: false,
            in: "query",
            schema: {
              type: "number"
            }
          },
          {
            name: "folderId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/TaskListResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "List tasks.",
        tags: [
          "Tasks"
        ]
      }
    },
    "/api/v1/server/events/{eventId}": {
      get: {
        operationId: "getEvent",
        parameters: [
          {
            name: "eventId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/EventGetResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Get an event by id.",
        tags: [
          "ServerEvents"
        ]
      }
    },
    "/api/v1/server/events": {
      get: {
        operationId: "listEvents",
        parameters: [
          {
            name: "sort",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "createdAt-asc",
                "createdAt-desc",
                "updatedAt-asc",
                "updatedAt-desc"
              ]
            }
          },
          {
            name: "folderId",
            required: false,
            in: "query",
            schema: {
              format: "uuid",
              type: "string"
            }
          },
          {
            name: "objectKey",
            required: false,
            in: "query",
            schema: {
              type: "string"
            }
          },
          {
            name: "search",
            required: false,
            in: "query",
            schema: {
              type: "string"
            }
          },
          {
            name: "includeTrace",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "true"
              ]
            }
          },
          {
            name: "includeDebug",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "true"
              ]
            }
          },
          {
            name: "includeInfo",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "true"
              ]
            }
          },
          {
            name: "includeWarning",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "true"
              ]
            }
          },
          {
            name: "includeError",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "true"
              ]
            }
          },
          {
            name: "offset",
            required: false,
            in: "query",
            schema: {
              type: "number"
            }
          },
          {
            name: "limit",
            required: false,
            in: "query",
            schema: {
              type: "number"
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/EventListResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "List events.",
        tags: [
          "ServerEvents"
        ]
      }
    },
    "/api/v1/folders/{folderId}/events/{eventId}": {
      get: {
        operationId: "getFolderEvent",
        parameters: [
          {
            name: "folderId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          },
          {
            name: "eventId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/EventGetResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "Get a folder event by id.",
        tags: [
          "FolderEvents"
        ]
      }
    },
    "/api/v1/folders/{folderId}/events": {
      get: {
        operationId: "listFolderEvents",
        parameters: [
          {
            name: "sort",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "createdAt-asc",
                "createdAt-desc",
                "updatedAt-asc",
                "updatedAt-desc"
              ]
            }
          },
          {
            name: "objectKey",
            required: false,
            in: "query",
            schema: {
              type: "string"
            }
          },
          {
            name: "search",
            required: false,
            in: "query",
            schema: {
              type: "string"
            }
          },
          {
            name: "includeTrace",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "true"
              ]
            }
          },
          {
            name: "includeDebug",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "true"
              ]
            }
          },
          {
            name: "includeInfo",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "true"
              ]
            }
          },
          {
            name: "includeWarning",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "true"
              ]
            }
          },
          {
            name: "includeError",
            required: false,
            in: "query",
            schema: {
              type: "string",
              enum: [
                "true"
              ]
            }
          },
          {
            name: "offset",
            required: false,
            in: "query",
            schema: {
              type: "number"
            }
          },
          {
            name: "limit",
            required: false,
            in: "query",
            schema: {
              type: "number"
            }
          },
          {
            name: "folderId",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/EventListResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        summary: "List tasks.",
        tags: [
          "FolderEvents"
        ]
      }
    },
    "/api/v1/server/apps": {
      get: {
        operationId: "listApps",
        parameters: [],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AppListResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        tags: [
          "Apps"
        ]
      }
    },
    "/api/v1/server/apps/{appIdentifier}": {
      get: {
        operationId: "getApp",
        parameters: [
          {
            name: "appIdentifier",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AppGetResponse"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        tags: [
          "Apps"
        ]
      }
    },
    "/api/v1/server/apps/{appIdentifier}/workers/{workerIdentifier}/env-vars": {
      put: {
        operationId: "setWorkerScriptEnvVars",
        parameters: [
          {
            name: "appIdentifier",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          },
          {
            name: "workerIdentifier",
            required: true,
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/SetWorkerScriptEnvVarsInputDTO"
              }
            }
          }
        },
        responses: {
          "200": {
            description: "",
            content: {
              "application/json": {
                schema: {
                  type: "object"
                }
              }
            }
          }
        },
        security: [
          {
            bearer: []
          }
        ],
        tags: [
          "Apps"
        ]
      }
    }
  },
  info: {
    title: "@stellariscloud/api",
    description: "The Stellaris Cloud core API",
    version: "1.0",
    contact: {}
  },
  tags: [],
  servers: [],
  components: {
    securitySchemes: {
      bearer: {
        scheme: "bearer",
        bearerFormat: "JWT",
        type: "http"
      }
    },
    schemas: {
      LoginCredentialsDTO: {
        type: "object",
        properties: {
          login: {
            type: "string"
          },
          password: {
            type: "string"
          }
        },
        required: [
          "login",
          "password"
        ]
      },
      LoginResponse: {
        type: "object",
        properties: {
          session: {
            type: "object",
            properties: {
              accessToken: {
                type: "string"
              },
              refreshToken: {
                type: "string"
              },
              expiresAt: {
                type: "string",
                format: "date-time"
              }
            },
            required: [
              "accessToken",
              "refreshToken",
              "expiresAt"
            ]
          }
        },
        required: [
          "session"
        ]
      },
      SignupCredentialsDTO: {
        type: "object",
        properties: {
          username: {
            type: "string",
            minLength: 3,
            maxLength: 64
          },
          email: {
            type: "string",
            minLength: 1,
            format: "email"
          },
          password: {
            type: "string",
            maxLength: 255
          }
        },
        required: [
          "username",
          "password"
        ]
      },
      SignupResponse: {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              id: {
                type: "string",
                format: "uuid"
              },
              name: {
                type: "string",
                nullable: true
              },
              email: {
                type: "string",
                nullable: true
              },
              emailVerified: {
                type: "boolean"
              },
              isAdmin: {
                type: "boolean"
              },
              username: {
                type: "string"
              },
              permissions: {
                type: "array",
                items: {
                  type: "string"
                }
              },
              createdAt: {
                type: "string",
                format: "date-time"
              },
              updatedAt: {
                type: "string",
                format: "date-time"
              }
            },
            required: [
              "id",
              "name",
              "email",
              "emailVerified",
              "isAdmin",
              "username",
              "permissions",
              "createdAt",
              "updatedAt"
            ]
          }
        },
        required: [
          "user"
        ]
      },
      TokenRefreshResponse: {
        type: "object",
        properties: {
          session: {
            type: "object",
            properties: {
              accessToken: {
                type: "string"
              },
              refreshToken: {
                type: "string"
              },
              expiresAt: {
                type: "string",
                format: "date-time"
              }
            },
            required: [
              "accessToken",
              "refreshToken",
              "expiresAt"
            ]
          }
        },
        required: [
          "session"
        ]
      },
      ViewerGetResponse: {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              id: {
                type: "string",
                format: "uuid"
              },
              name: {
                type: "string",
                nullable: true
              },
              email: {
                type: "string",
                nullable: true
              },
              emailVerified: {
                type: "boolean"
              },
              isAdmin: {
                type: "boolean"
              },
              username: {
                type: "string"
              },
              permissions: {
                type: "array",
                items: {
                  type: "string"
                }
              },
              createdAt: {
                type: "string",
                format: "date-time"
              },
              updatedAt: {
                type: "string",
                format: "date-time"
              }
            },
            required: [
              "id",
              "name",
              "email",
              "emailVerified",
              "isAdmin",
              "username",
              "permissions",
              "createdAt",
              "updatedAt"
            ]
          }
        },
        required: [
          "user"
        ]
      },
      ViewerUpdateInputDTO: {
        type: "object",
        properties: {
          name: {
            type: "string"
          }
        },
        required: [
          "name"
        ]
      },
      UserDTO: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid"
          },
          name: {
            type: "string",
            nullable: true
          },
          email: {
            type: "string",
            nullable: true
          },
          emailVerified: {
            type: "boolean"
          },
          isAdmin: {
            type: "boolean"
          },
          username: {
            type: "string"
          },
          permissions: {
            type: "array",
            items: {
              type: "string"
            }
          },
          createdAt: {
            type: "string",
            format: "date-time"
          },
          updatedAt: {
            type: "string",
            format: "date-time"
          }
        },
        required: [
          "id",
          "name",
          "email",
          "emailVerified",
          "isAdmin",
          "username",
          "permissions",
          "createdAt",
          "updatedAt"
        ]
      },
      UserCreateInputDTO: {
        type: "object",
        properties: {
          name: {
            type: "string",
            minLength: 1
          },
          email: {
            type: "string",
            minLength: 1
          },
          emailVerified: {
            type: "boolean"
          },
          isAdmin: {
            type: "boolean"
          },
          username: {
            type: "string"
          },
          password: {
            type: "string"
          },
          permissions: {
            type: "array",
            items: {
              type: "string"
            }
          }
        },
        required: [
          "username",
          "password"
        ]
      },
      UserGetResponse: {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              id: {
                type: "string",
                format: "uuid"
              },
              name: {
                type: "string",
                nullable: true
              },
              email: {
                type: "string",
                nullable: true
              },
              emailVerified: {
                type: "boolean"
              },
              isAdmin: {
                type: "boolean"
              },
              username: {
                type: "string"
              },
              permissions: {
                type: "array",
                items: {
                  type: "string"
                }
              },
              createdAt: {
                type: "string",
                format: "date-time"
              },
              updatedAt: {
                type: "string",
                format: "date-time"
              }
            },
            required: [
              "id",
              "name",
              "email",
              "emailVerified",
              "isAdmin",
              "username",
              "permissions",
              "createdAt",
              "updatedAt"
            ]
          }
        },
        required: [
          "user"
        ]
      },
      UserUpdateInputDTO: {
        type: "object",
        properties: {
          name: {
            oneOf: [
              {
                type: "string",
                minLength: 1
              },
              {
                type: "null"
              }
            ]
          },
          email: {
            oneOf: [
              {
                type: "string",
                minLength: 1
              },
              {
                type: "null"
              }
            ]
          },
          isAdmin: {
            type: "boolean"
          },
          username: {
            type: "string",
            minLength: 2
          },
          password: {
            type: "string",
            minLength: 1
          },
          permissions: {
            type: "array",
            items: {
              type: "string"
            }
          }
        }
      },
      UserListResponse: {
        type: "object",
        properties: {
          meta: {
            type: "object",
            properties: {
              totalCount: {
                type: "number"
              }
            },
            required: [
              "totalCount"
            ]
          },
          result: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid"
                },
                name: {
                  oneOf: [
                    {
                      type: "string"
                    }
                  ],
                  nullable: true
                },
                email: {
                  oneOf: [
                    {
                      type: "string"
                    }
                  ],
                  nullable: true
                },
                emailVerified: {
                  type: "boolean"
                },
                isAdmin: {
                  type: "boolean"
                },
                username: {
                  type: "string"
                },
                permissions: {
                  type: "array",
                  items: {
                    type: "string"
                  }
                },
                createdAt: {
                  type: "string",
                  format: "date-time"
                },
                updatedAt: {
                  type: "string",
                  format: "date-time"
                }
              },
              required: [
                "id",
                "name",
                "email",
                "emailVerified",
                "isAdmin",
                "username",
                "permissions",
                "createdAt",
                "updatedAt"
              ]
            }
          }
        },
        required: [
          "meta",
          "result"
        ]
      },
      UserSessionListResponse: {
        type: "object",
        properties: {
          meta: {
            type: "object",
            properties: {
              totalCount: {
                type: "number"
              }
            },
            required: [
              "totalCount"
            ]
          },
          result: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid"
                },
                expiresAt: {
                  type: "string",
                  format: "date-time"
                },
                createdAt: {
                  type: "string",
                  format: "date-time"
                },
                updatedAt: {
                  type: "string",
                  format: "date-time"
                }
              },
              required: [
                "id",
                "expiresAt",
                "createdAt",
                "updatedAt"
              ]
            }
          }
        },
        required: [
          "meta",
          "result"
        ]
      },
      FolderDTO: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid"
          },
          ownerId: {
            type: "string",
            format: "uuid"
          },
          name: {
            type: "string"
          },
          metadataLocation: {
            type: "object",
            properties: {
              id: {
                type: "string",
                format: "uuid"
              },
              userId: {
                type: "string",
                format: "uuid"
              },
              providerType: {
                type: "string",
                enum: [
                  "SERVER",
                  "USER"
                ]
              },
              label: {
                type: "string"
              },
              endpoint: {
                type: "string"
              },
              region: {
                type: "string"
              },
              bucket: {
                type: "string"
              },
              prefix: {
                type: "string"
              },
              accessKeyId: {
                type: "string"
              },
              accessKeyHashId: {
                type: "string"
              }
            },
            required: [
              "id",
              "providerType",
              "label",
              "endpoint",
              "region",
              "bucket",
              "accessKeyId",
              "accessKeyHashId"
            ]
          },
          contentLocation: {
            type: "object",
            properties: {
              id: {
                type: "string",
                format: "uuid"
              },
              userId: {
                type: "string",
                format: "uuid"
              },
              providerType: {
                type: "string",
                enum: [
                  "SERVER",
                  "USER"
                ]
              },
              label: {
                type: "string"
              },
              endpoint: {
                type: "string"
              },
              region: {
                type: "string"
              },
              bucket: {
                type: "string"
              },
              prefix: {
                type: "string"
              },
              accessKeyId: {
                type: "string"
              },
              accessKeyHashId: {
                type: "string"
              }
            },
            required: [
              "id",
              "providerType",
              "label",
              "endpoint",
              "region",
              "bucket",
              "accessKeyId",
              "accessKeyHashId"
            ]
          },
          createdAt: {
            type: "string",
            format: "date-time"
          },
          updatedAt: {
            type: "string",
            format: "date-time"
          }
        },
        required: [
          "id",
          "ownerId",
          "name",
          "metadataLocation",
          "contentLocation",
          "createdAt",
          "updatedAt"
        ]
      },
      FolderObjectDTO: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid"
          },
          objectKey: {
            type: "string"
          },
          folderId: {
            type: "string",
            format: "uuid"
          },
          hash: {
            type: "string"
          },
          lastModified: {
            type: "number"
          },
          eTag: {
            type: "string"
          },
          sizeBytes: {
            type: "number"
          },
          mimeType: {
            type: "string"
          },
          mediaType: {
            type: "string",
            enum: [
              "IMAGE",
              "VIDEO",
              "AUDIO",
              "DOCUMENT",
              "UNKNOWN"
            ]
          },
          contentMetadata: {
            type: "object",
            additionalProperties: {
              type: "object",
              additionalProperties: {
                oneOf: [
                  {
                    type: "object",
                    properties: {
                      mimeType: {
                        type: "string"
                      },
                      size: {
                        type: "number"
                      },
                      hash: {
                        type: "string"
                      },
                      storageKey: {
                        type: "string"
                      },
                      content: {
                        type: "string",
                        enum: [
                          ""
                        ]
                      }
                    },
                    required: [
                      "mimeType",
                      "size",
                      "hash",
                      "storageKey",
                      "content"
                    ]
                  },
                  {
                    type: "object",
                    properties: {
                      mimeType: {
                        type: "string"
                      },
                      size: {
                        type: "number"
                      },
                      hash: {
                        type: "string",
                        enum: [
                          ""
                        ]
                      },
                      storageKey: {
                        type: "string",
                        enum: [
                          ""
                        ]
                      },
                      content: {
                        type: "string"
                      }
                    },
                    required: [
                      "mimeType",
                      "size",
                      "hash",
                      "storageKey",
                      "content"
                    ]
                  }
                ]
              }
            }
          }
        },
        required: [
          "id",
          "objectKey",
          "folderId",
          "lastModified",
          "eTag",
          "sizeBytes",
          "mimeType",
          "mediaType",
          "contentMetadata"
        ]
      },
      FolderObjectContentMetadataDTO: {
        oneOf: [
          {
            type: "object",
            properties: {
              mimeType: {
                type: "string"
              },
              size: {
                type: "number"
              },
              hash: {
                type: "string"
              },
              storageKey: {
                type: "string"
              },
              content: {
                type: "string",
                enum: [
                  ""
                ]
              }
            },
            required: [
              "mimeType",
              "size",
              "hash",
              "storageKey",
              "content"
            ]
          },
          {
            type: "object",
            properties: {
              mimeType: {
                type: "string"
              },
              size: {
                type: "number"
              },
              hash: {
                type: "string",
                enum: [
                  ""
                ]
              },
              storageKey: {
                type: "string",
                enum: [
                  ""
                ]
              },
              content: {
                type: "string"
              }
            },
            required: [
              "mimeType",
              "size",
              "hash",
              "storageKey",
              "content"
            ]
          }
        ]
      },
      StorageLocationInputDTO: {
        oneOf: [
          {
            type: "object",
            properties: {
              accessKeyId: {
                type: "string"
              },
              secretAccessKey: {
                type: "string"
              },
              endpoint: {
                type: "string"
              },
              bucket: {
                type: "string"
              },
              region: {
                type: "string"
              },
              prefix: {
                type: "string"
              }
            },
            required: [
              "accessKeyId",
              "secretAccessKey",
              "endpoint",
              "bucket",
              "region"
            ]
          },
          {
            type: "object",
            properties: {
              storageProvisionId: {
                type: "string",
                format: "uuid"
              }
            },
            required: [
              "storageProvisionId"
            ]
          },
          {
            type: "object",
            properties: {
              userLocationId: {
                type: "string",
                format: "uuid"
              },
              userLocationBucketOverride: {
                type: "string"
              },
              userLocationPrefixOverride: {
                type: "string"
              }
            },
            required: [
              "userLocationId",
              "userLocationBucketOverride"
            ]
          }
        ]
      },
      FolderGetResponse: {
        type: "object",
        properties: {
          folder: {
            type: "object",
            properties: {
              id: {
                type: "string",
                format: "uuid"
              },
              ownerId: {
                type: "string",
                format: "uuid"
              },
              name: {
                type: "string"
              },
              metadataLocation: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    format: "uuid"
                  },
                  userId: {
                    type: "string",
                    format: "uuid"
                  },
                  providerType: {
                    type: "string",
                    enum: [
                      "SERVER",
                      "USER"
                    ]
                  },
                  label: {
                    type: "string"
                  },
                  endpoint: {
                    type: "string"
                  },
                  region: {
                    type: "string"
                  },
                  bucket: {
                    type: "string"
                  },
                  prefix: {
                    type: "string"
                  },
                  accessKeyId: {
                    type: "string"
                  },
                  accessKeyHashId: {
                    type: "string"
                  }
                },
                required: [
                  "id",
                  "providerType",
                  "label",
                  "endpoint",
                  "region",
                  "bucket",
                  "accessKeyId",
                  "accessKeyHashId"
                ]
              },
              contentLocation: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    format: "uuid"
                  },
                  userId: {
                    type: "string",
                    format: "uuid"
                  },
                  providerType: {
                    type: "string",
                    enum: [
                      "SERVER",
                      "USER"
                    ]
                  },
                  label: {
                    type: "string"
                  },
                  endpoint: {
                    type: "string"
                  },
                  region: {
                    type: "string"
                  },
                  bucket: {
                    type: "string"
                  },
                  prefix: {
                    type: "string"
                  },
                  accessKeyId: {
                    type: "string"
                  },
                  accessKeyHashId: {
                    type: "string"
                  }
                },
                required: [
                  "id",
                  "providerType",
                  "label",
                  "endpoint",
                  "region",
                  "bucket",
                  "accessKeyId",
                  "accessKeyHashId"
                ]
              },
              createdAt: {
                type: "string",
                format: "date-time"
              },
              updatedAt: {
                type: "string",
                format: "date-time"
              }
            },
            required: [
              "id",
              "ownerId",
              "name",
              "metadataLocation",
              "contentLocation",
              "createdAt",
              "updatedAt"
            ]
          },
          permissions: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "FOLDER_REINDEX",
                "FOLDER_FORGET",
                "FOLDER_EDIT",
                "OBJECT_EDIT",
                "OBJECT_MANAGE"
              ]
            }
          }
        },
        required: [
          "folder",
          "permissions"
        ]
      },
      FolderGetMetadataResponse: {
        type: "object",
        properties: {
          totalCount: {
            type: "number"
          },
          totalSizeBytes: {
            type: "number"
          }
        },
        required: [
          "totalCount",
          "totalSizeBytes"
        ]
      },
      FolderListResponse: {
        type: "object",
        properties: {
          meta: {
            type: "object",
            properties: {
              totalCount: {
                type: "number"
              }
            },
            required: [
              "totalCount"
            ]
          },
          result: {
            type: "array",
            items: {
              type: "object",
              properties: {
                permissions: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: [
                      "FOLDER_REINDEX",
                      "FOLDER_FORGET",
                      "FOLDER_EDIT",
                      "OBJECT_EDIT",
                      "OBJECT_MANAGE"
                    ]
                  }
                },
                folder: {
                  type: "object",
                  properties: {
                    id: {
                      type: "string",
                      format: "uuid"
                    },
                    ownerId: {
                      type: "string",
                      format: "uuid"
                    },
                    name: {
                      type: "string"
                    },
                    metadataLocation: {
                      type: "object",
                      properties: {
                        id: {
                          type: "string",
                          format: "uuid"
                        },
                        userId: {
                          type: "string",
                          format: "uuid"
                        },
                        providerType: {
                          type: "string",
                          enum: [
                            "SERVER",
                            "USER"
                          ]
                        },
                        label: {
                          type: "string"
                        },
                        endpoint: {
                          type: "string"
                        },
                        region: {
                          type: "string"
                        },
                        bucket: {
                          type: "string"
                        },
                        prefix: {
                          type: "string"
                        },
                        accessKeyId: {
                          type: "string"
                        },
                        accessKeyHashId: {
                          type: "string"
                        }
                      },
                      required: [
                        "id",
                        "providerType",
                        "label",
                        "endpoint",
                        "region",
                        "bucket",
                        "accessKeyId",
                        "accessKeyHashId"
                      ]
                    },
                    contentLocation: {
                      type: "object",
                      properties: {
                        id: {
                          type: "string",
                          format: "uuid"
                        },
                        userId: {
                          type: "string",
                          format: "uuid"
                        },
                        providerType: {
                          type: "string",
                          enum: [
                            "SERVER",
                            "USER"
                          ]
                        },
                        label: {
                          type: "string"
                        },
                        endpoint: {
                          type: "string"
                        },
                        region: {
                          type: "string"
                        },
                        bucket: {
                          type: "string"
                        },
                        prefix: {
                          type: "string"
                        },
                        accessKeyId: {
                          type: "string"
                        },
                        accessKeyHashId: {
                          type: "string"
                        }
                      },
                      required: [
                        "id",
                        "providerType",
                        "label",
                        "endpoint",
                        "region",
                        "bucket",
                        "accessKeyId",
                        "accessKeyHashId"
                      ]
                    },
                    createdAt: {
                      type: "string",
                      format: "date-time"
                    },
                    updatedAt: {
                      type: "string",
                      format: "date-time"
                    }
                  },
                  required: [
                    "id",
                    "ownerId",
                    "name",
                    "metadataLocation",
                    "contentLocation",
                    "createdAt",
                    "updatedAt"
                  ]
                }
              },
              required: [
                "permissions",
                "folder"
              ]
            }
          }
        },
        required: [
          "meta",
          "result"
        ]
      },
      FolderCreateInputDTO: {
        type: "object",
        properties: {
          name: {
            type: "string",
            maxLength: 256,
            minLength: 1
          },
          metadataLocation: {
            oneOf: [
              {
                type: "object",
                properties: {
                  accessKeyId: {
                    type: "string"
                  },
                  secretAccessKey: {
                    type: "string"
                  },
                  endpoint: {
                    type: "string"
                  },
                  bucket: {
                    type: "string"
                  },
                  region: {
                    type: "string"
                  },
                  prefix: {
                    type: "string"
                  }
                },
                required: [
                  "accessKeyId",
                  "secretAccessKey",
                  "endpoint",
                  "bucket",
                  "region"
                ]
              },
              {
                type: "object",
                properties: {
                  storageProvisionId: {
                    type: "string",
                    format: "uuid"
                  }
                },
                required: [
                  "storageProvisionId"
                ]
              },
              {
                type: "object",
                properties: {
                  userLocationId: {
                    type: "string",
                    format: "uuid"
                  },
                  userLocationBucketOverride: {
                    type: "string"
                  },
                  userLocationPrefixOverride: {
                    type: "string"
                  }
                },
                required: [
                  "userLocationId",
                  "userLocationBucketOverride"
                ]
              }
            ]
          },
          contentLocation: {
            oneOf: [
              {
                type: "object",
                properties: {
                  accessKeyId: {
                    type: "string"
                  },
                  secretAccessKey: {
                    type: "string"
                  },
                  endpoint: {
                    type: "string"
                  },
                  bucket: {
                    type: "string"
                  },
                  region: {
                    type: "string"
                  },
                  prefix: {
                    type: "string"
                  }
                },
                required: [
                  "accessKeyId",
                  "secretAccessKey",
                  "endpoint",
                  "bucket",
                  "region"
                ]
              },
              {
                type: "object",
                properties: {
                  storageProvisionId: {
                    type: "string",
                    format: "uuid"
                  }
                },
                required: [
                  "storageProvisionId"
                ]
              },
              {
                type: "object",
                properties: {
                  userLocationId: {
                    type: "string",
                    format: "uuid"
                  },
                  userLocationBucketOverride: {
                    type: "string"
                  },
                  userLocationPrefixOverride: {
                    type: "string"
                  }
                },
                required: [
                  "userLocationId",
                  "userLocationBucketOverride"
                ]
              }
            ]
          }
        },
        required: [
          "name",
          "metadataLocation",
          "contentLocation"
        ]
      },
      FolderCreateResponse: {
        type: "object",
        properties: {
          folder: {
            type: "object",
            properties: {
              id: {
                type: "string",
                format: "uuid"
              },
              ownerId: {
                type: "string",
                format: "uuid"
              },
              name: {
                type: "string"
              },
              metadataLocation: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    format: "uuid"
                  },
                  userId: {
                    type: "string",
                    format: "uuid"
                  },
                  providerType: {
                    type: "string",
                    enum: [
                      "SERVER",
                      "USER"
                    ]
                  },
                  label: {
                    type: "string"
                  },
                  endpoint: {
                    type: "string"
                  },
                  region: {
                    type: "string"
                  },
                  bucket: {
                    type: "string"
                  },
                  prefix: {
                    type: "string"
                  },
                  accessKeyId: {
                    type: "string"
                  },
                  accessKeyHashId: {
                    type: "string"
                  }
                },
                required: [
                  "id",
                  "providerType",
                  "label",
                  "endpoint",
                  "region",
                  "bucket",
                  "accessKeyId",
                  "accessKeyHashId"
                ]
              },
              contentLocation: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    format: "uuid"
                  },
                  userId: {
                    type: "string",
                    format: "uuid"
                  },
                  providerType: {
                    type: "string",
                    enum: [
                      "SERVER",
                      "USER"
                    ]
                  },
                  label: {
                    type: "string"
                  },
                  endpoint: {
                    type: "string"
                  },
                  region: {
                    type: "string"
                  },
                  bucket: {
                    type: "string"
                  },
                  prefix: {
                    type: "string"
                  },
                  accessKeyId: {
                    type: "string"
                  },
                  accessKeyHashId: {
                    type: "string"
                  }
                },
                required: [
                  "id",
                  "providerType",
                  "label",
                  "endpoint",
                  "region",
                  "bucket",
                  "accessKeyId",
                  "accessKeyHashId"
                ]
              },
              createdAt: {
                type: "string",
                format: "date-time"
              },
              updatedAt: {
                type: "string",
                format: "date-time"
              }
            },
            required: [
              "id",
              "ownerId",
              "name",
              "metadataLocation",
              "contentLocation",
              "createdAt",
              "updatedAt"
            ]
          }
        },
        required: [
          "folder"
        ]
      },
      FolderObjectListResponse: {
        type: "object",
        properties: {
          meta: {
            type: "object",
            properties: {
              totalCount: {
                type: "number"
              }
            },
            required: [
              "totalCount"
            ]
          },
          result: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid"
                },
                objectKey: {
                  type: "string"
                },
                folderId: {
                  type: "string",
                  format: "uuid"
                },
                hash: {
                  type: "string"
                },
                lastModified: {
                  type: "number"
                },
                eTag: {
                  type: "string"
                },
                sizeBytes: {
                  type: "number"
                },
                mimeType: {
                  type: "string"
                },
                mediaType: {
                  type: "string",
                  enum: [
                    "IMAGE",
                    "VIDEO",
                    "AUDIO",
                    "DOCUMENT",
                    "UNKNOWN"
                  ]
                },
                contentMetadata: {
                  type: "object",
                  additionalProperties: {
                    type: "object",
                    additionalProperties: {
                      oneOf: [
                        {
                          type: "object",
                          properties: {
                            mimeType: {
                              type: "string"
                            },
                            size: {
                              type: "number"
                            },
                            hash: {
                              type: "string"
                            },
                            storageKey: {
                              type: "string"
                            },
                            content: {
                              type: "string",
                              enum: [
                                ""
                              ]
                            }
                          },
                          required: [
                            "mimeType",
                            "size",
                            "hash",
                            "storageKey",
                            "content"
                          ]
                        },
                        {
                          type: "object",
                          properties: {
                            mimeType: {
                              type: "string"
                            },
                            size: {
                              type: "number"
                            },
                            hash: {
                              type: "string",
                              enum: [
                                ""
                              ]
                            },
                            storageKey: {
                              type: "string",
                              enum: [
                                ""
                              ]
                            },
                            content: {
                              type: "string"
                            }
                          },
                          required: [
                            "mimeType",
                            "size",
                            "hash",
                            "storageKey",
                            "content"
                          ]
                        }
                      ]
                    }
                  }
                }
              },
              required: [
                "id",
                "objectKey",
                "folderId",
                "lastModified",
                "eTag",
                "sizeBytes",
                "mimeType",
                "mediaType",
                "contentMetadata"
              ]
            }
          }
        },
        required: [
          "meta",
          "result"
        ]
      },
      FolderObjectGetResponse: {
        type: "object",
        properties: {
          folderObject: {
            type: "object",
            properties: {
              id: {
                type: "string",
                format: "uuid"
              },
              objectKey: {
                type: "string"
              },
              folderId: {
                type: "string",
                format: "uuid"
              },
              hash: {
                type: "string"
              },
              lastModified: {
                type: "number"
              },
              eTag: {
                type: "string"
              },
              sizeBytes: {
                type: "number"
              },
              mimeType: {
                type: "string"
              },
              mediaType: {
                type: "string",
                enum: [
                  "IMAGE",
                  "VIDEO",
                  "AUDIO",
                  "DOCUMENT",
                  "UNKNOWN"
                ]
              },
              contentMetadata: {
                type: "object",
                additionalProperties: {
                  type: "object",
                  additionalProperties: {
                    oneOf: [
                      {
                        type: "object",
                        properties: {
                          mimeType: {
                            type: "string"
                          },
                          size: {
                            type: "number"
                          },
                          hash: {
                            type: "string"
                          },
                          storageKey: {
                            type: "string"
                          },
                          content: {
                            type: "string",
                            enum: [
                              ""
                            ]
                          }
                        },
                        required: [
                          "mimeType",
                          "size",
                          "hash",
                          "storageKey",
                          "content"
                        ]
                      },
                      {
                        type: "object",
                        properties: {
                          mimeType: {
                            type: "string"
                          },
                          size: {
                            type: "number"
                          },
                          hash: {
                            type: "string",
                            enum: [
                              ""
                            ]
                          },
                          storageKey: {
                            type: "string",
                            enum: [
                              ""
                            ]
                          },
                          content: {
                            type: "string"
                          }
                        },
                        required: [
                          "mimeType",
                          "size",
                          "hash",
                          "storageKey",
                          "content"
                        ]
                      }
                    ]
                  }
                }
              }
            },
            required: [
              "id",
              "objectKey",
              "folderId",
              "lastModified",
              "eTag",
              "sizeBytes",
              "mimeType",
              "mediaType",
              "contentMetadata"
            ]
          }
        },
        required: [
          "folderObject"
        ]
      },
      FolderCreateSignedUrlInputDTO: {
        type: "array",
        items: {
          type: "object",
          properties: {
            objectIdentifier: {
              type: "string"
            },
            method: {
              type: "string",
              enum: [
                "DELETE",
                "PUT",
                "GET"
              ]
            }
          },
          required: [
            "objectIdentifier",
            "method"
          ]
        }
      },
      FolderCreateSignedUrlsResponse: {
        type: "object",
        properties: {
          urls: {
            type: "array",
            items: {
              type: "string"
            }
          }
        },
        required: [
          "urls"
        ]
      },
      TriggerAppTaskInputDTO: {
        type: "object",
        properties: {
          objectKey: {
            type: "string"
          },
          inputParams: {}
        }
      },
      FolderShareGetResponse: {
        type: "object",
        properties: {
          share: {
            type: "object",
            properties: {
              userId: {
                type: "string",
                format: "uuid"
              },
              permissions: {
                type: "array",
                items: {
                  type: "string",
                  enum: [
                    "FOLDER_REINDEX",
                    "FOLDER_FORGET",
                    "FOLDER_EDIT",
                    "OBJECT_EDIT",
                    "OBJECT_MANAGE"
                  ]
                }
              }
            },
            required: [
              "userId",
              "permissions"
            ]
          }
        },
        required: [
          "share"
        ]
      },
      FolderShareListResponse: {
        type: "object",
        properties: {
          meta: {
            type: "object",
            properties: {
              totalCount: {
                type: "number"
              }
            },
            required: [
              "totalCount"
            ]
          },
          result: {
            type: "array",
            items: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  format: "uuid"
                },
                permissions: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: [
                      "FOLDER_REINDEX",
                      "FOLDER_FORGET",
                      "FOLDER_EDIT",
                      "OBJECT_EDIT",
                      "OBJECT_MANAGE"
                    ]
                  }
                }
              },
              required: [
                "userId",
                "permissions"
              ]
            }
          }
        },
        required: [
          "meta",
          "result"
        ]
      },
      FolderShareUserListResponse: {
        type: "object",
        properties: {
          meta: {
            type: "object",
            properties: {
              totalCount: {
                type: "number"
              }
            },
            required: [
              "totalCount"
            ]
          },
          result: {
            type: "array",
            items: {
              type: "object",
              properties: {
                username: {
                  type: "string"
                },
                id: {
                  type: "string"
                }
              },
              required: [
                "username",
                "id"
              ]
            }
          }
        },
        required: [
          "meta",
          "result"
        ]
      },
      FolderShareCreateInputDTO: {
        type: "object",
        properties: {
          permissions: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "FOLDER_REINDEX",
                "FOLDER_FORGET",
                "FOLDER_EDIT",
                "OBJECT_EDIT",
                "OBJECT_MANAGE"
              ]
            }
          }
        },
        required: [
          "permissions"
        ]
      },
      FolderUpdateInputDTO: {
        type: "object",
        properties: {
          name: {
            type: "string",
            maxLength: 256,
            minLength: 1
          }
        },
        required: [
          "name"
        ]
      },
      FolderUpdateResponseDTO: {
        type: "object",
        properties: {
          folder: {
            type: "object",
            properties: {
              id: {
                type: "string",
                format: "uuid"
              },
              ownerId: {
                type: "string",
                format: "uuid"
              },
              name: {
                type: "string"
              },
              metadataLocation: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    format: "uuid"
                  },
                  userId: {
                    type: "string",
                    format: "uuid"
                  },
                  providerType: {
                    type: "string",
                    enum: [
                      "SERVER",
                      "USER"
                    ]
                  },
                  label: {
                    type: "string"
                  },
                  endpoint: {
                    type: "string"
                  },
                  region: {
                    type: "string"
                  },
                  bucket: {
                    type: "string"
                  },
                  prefix: {
                    type: "string"
                  },
                  accessKeyId: {
                    type: "string"
                  },
                  accessKeyHashId: {
                    type: "string"
                  }
                },
                required: [
                  "id",
                  "providerType",
                  "label",
                  "endpoint",
                  "region",
                  "bucket",
                  "accessKeyId",
                  "accessKeyHashId"
                ]
              },
              contentLocation: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    format: "uuid"
                  },
                  userId: {
                    type: "string",
                    format: "uuid"
                  },
                  providerType: {
                    type: "string",
                    enum: [
                      "SERVER",
                      "USER"
                    ]
                  },
                  label: {
                    type: "string"
                  },
                  endpoint: {
                    type: "string"
                  },
                  region: {
                    type: "string"
                  },
                  bucket: {
                    type: "string"
                  },
                  prefix: {
                    type: "string"
                  },
                  accessKeyId: {
                    type: "string"
                  },
                  accessKeyHashId: {
                    type: "string"
                  }
                },
                required: [
                  "id",
                  "providerType",
                  "label",
                  "endpoint",
                  "region",
                  "bucket",
                  "accessKeyId",
                  "accessKeyHashId"
                ]
              },
              createdAt: {
                type: "string",
                format: "date-time"
              },
              updatedAt: {
                type: "string",
                format: "date-time"
              }
            },
            required: [
              "id",
              "ownerId",
              "name",
              "metadataLocation",
              "contentLocation",
              "createdAt",
              "updatedAt"
            ]
          }
        },
        required: [
          "folder"
        ]
      },
      AccessKeyPublicDTO: {
        type: "object",
        properties: {
          accessKeyId: {
            type: "string"
          },
          accessKeyHashId: {
            type: "string"
          },
          endpoint: {
            type: "string"
          },
          endpointDomain: {
            type: "string"
          },
          region: {
            type: "string"
          },
          folderCount: {
            type: "number"
          }
        },
        required: [
          "accessKeyId",
          "accessKeyHashId",
          "endpoint",
          "endpointDomain",
          "region",
          "folderCount"
        ]
      },
      AccessKeyListResponse: {
        type: "object",
        properties: {
          meta: {
            type: "object",
            properties: {
              totalCount: {
                type: "number"
              }
            },
            required: [
              "totalCount"
            ]
          },
          result: {
            type: "array",
            items: {
              type: "object",
              properties: {
                accessKeyId: {
                  type: "string"
                },
                accessKeyHashId: {
                  type: "string"
                },
                endpoint: {
                  type: "string"
                },
                endpointDomain: {
                  type: "string"
                },
                region: {
                  type: "string"
                },
                folderCount: {
                  type: "number"
                }
              },
              required: [
                "accessKeyId",
                "accessKeyHashId",
                "endpoint",
                "endpointDomain",
                "region",
                "folderCount"
              ]
            }
          }
        },
        required: [
          "meta",
          "result"
        ]
      },
      AccessKeyGetResponse: {
        type: "object",
        properties: {
          accessKey: {
            type: "object",
            properties: {
              accessKeyId: {
                type: "string"
              },
              accessKeyHashId: {
                type: "string"
              },
              endpoint: {
                type: "string"
              },
              endpointDomain: {
                type: "string"
              },
              region: {
                type: "string"
              },
              folderCount: {
                type: "number"
              }
            },
            required: [
              "accessKeyId",
              "accessKeyHashId",
              "endpoint",
              "endpointDomain",
              "region",
              "folderCount"
            ]
          }
        },
        required: [
          "accessKey"
        ]
      },
      RotateAccessKeyInputDTO: {
        type: "object",
        properties: {
          accessKeyId: {
            type: "string"
          },
          secretAccessKey: {
            type: "string"
          }
        },
        required: [
          "accessKeyId",
          "secretAccessKey"
        ]
      },
      AccessKeyRotateResponse: {
        type: "object",
        properties: {
          accessKeyHashId: {
            type: "string"
          }
        },
        required: [
          "accessKeyHashId"
        ]
      },
      AccessKeyBucketsListResponseDTO: {
        type: "object",
        properties: {
          result: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string"
                },
                createdDate: {
                  type: "string",
                  format: "date-time"
                }
              },
              required: [
                "name"
              ]
            }
          }
        },
        required: [
          "result"
        ]
      },
      SettingsGetResponse: {
        type: "object",
        properties: {
          settings: {
            type: "object",
            properties: {
              SIGNUP_ENABLED: {
                type: "boolean"
              },
              SIGNUP_PERMISSIONS: {
                type: "array",
                items: {
                  type: "string"
                }
              },
              SERVER_HOSTNAME: {
                type: "string",
                nullable: true
              }
            },
            required: [
              "SIGNUP_PERMISSIONS",
              "SERVER_HOSTNAME"
            ]
          }
        },
        required: [
          "settings"
        ]
      },
      SetSettingInputDTO: {
        type: "object",
        properties: {
          value: {}
        }
      },
      SettingSetResponse: {
        type: "object",
        properties: {
          settingKey: {
            type: "string"
          },
          settingValue: {}
        },
        required: [
          "settingKey"
        ]
      },
      UserStorageProvisionDTO: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid"
          },
          accessKeyHashId: {
            type: "string"
          },
          endpoint: {
            type: "string"
          },
          bucket: {
            type: "string"
          },
          region: {
            type: "string"
          },
          accessKeyId: {
            type: "string"
          },
          prefix: {
            type: "string"
          },
          provisionTypes: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "CONTENT",
                "METADATA",
                "REDUNDANCY"
              ]
            },
            minItems: 1
          },
          label: {
            type: "string",
            maxLength: 32
          },
          description: {
            type: "string",
            maxLength: 128
          }
        },
        required: [
          "id",
          "accessKeyHashId",
          "endpoint",
          "bucket",
          "region",
          "accessKeyId",
          "provisionTypes",
          "label",
          "description"
        ]
      },
      UserStorageProvisionListResponse: {
        type: "object",
        properties: {
          result: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid"
                },
                accessKeyHashId: {
                  type: "string"
                },
                endpoint: {
                  type: "string"
                },
                bucket: {
                  type: "string"
                },
                region: {
                  type: "string"
                },
                accessKeyId: {
                  type: "string"
                },
                prefix: {
                  type: "string"
                },
                provisionTypes: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: [
                      "CONTENT",
                      "METADATA",
                      "REDUNDANCY"
                    ]
                  },
                  minItems: 1
                },
                label: {
                  type: "string",
                  maxLength: 32
                },
                description: {
                  type: "string",
                  maxLength: 128
                }
              },
              required: [
                "id",
                "accessKeyHashId",
                "endpoint",
                "bucket",
                "region",
                "accessKeyId",
                "provisionTypes",
                "label",
                "description"
              ]
            }
          }
        },
        required: [
          "result"
        ]
      },
      UserStorageProvisionGetResponse: {
        type: "object",
        properties: {
          userStorageProvision: {
            type: "object",
            properties: {
              id: {
                type: "string",
                format: "uuid"
              },
              accessKeyHashId: {
                type: "string"
              },
              endpoint: {
                type: "string"
              },
              bucket: {
                type: "string"
              },
              region: {
                type: "string"
              },
              accessKeyId: {
                type: "string"
              },
              prefix: {
                type: "string"
              },
              provisionTypes: {
                type: "array",
                items: {
                  type: "string",
                  enum: [
                    "CONTENT",
                    "METADATA",
                    "REDUNDANCY"
                  ]
                },
                minItems: 1
              },
              label: {
                type: "string",
                maxLength: 32
              },
              description: {
                type: "string",
                maxLength: 128
              }
            },
            required: [
              "id",
              "accessKeyHashId",
              "endpoint",
              "bucket",
              "region",
              "accessKeyId",
              "provisionTypes",
              "label",
              "description"
            ]
          }
        },
        required: [
          "userStorageProvision"
        ]
      },
      UserStorageProvisionInputDTO: {
        type: "object",
        properties: {
          label: {
            type: "string",
            maxLength: 32
          },
          description: {
            type: "string",
            maxLength: 128
          },
          endpoint: {
            type: "string"
          },
          bucket: {
            type: "string"
          },
          region: {
            type: "string"
          },
          accessKeyId: {
            type: "string"
          },
          secretAccessKey: {
            type: "string"
          },
          prefix: {
            type: "string"
          },
          provisionTypes: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "CONTENT",
                "METADATA",
                "REDUNDANCY"
              ]
            },
            minItems: 1
          }
        },
        required: [
          "label",
          "description",
          "endpoint",
          "bucket",
          "region",
          "accessKeyId",
          "secretAccessKey",
          "provisionTypes"
        ]
      },
      ServerStorageLocationDTO: {
        type: "object",
        properties: {
          accessKeyHashId: {
            type: "string"
          },
          accessKeyId: {
            type: "string"
          },
          endpoint: {
            type: "string"
          },
          bucket: {
            type: "string"
          },
          region: {
            type: "string"
          },
          prefix: {
            type: "string",
            minLength: 1,
            nullable: true
          }
        },
        required: [
          "accessKeyHashId",
          "accessKeyId",
          "endpoint",
          "bucket",
          "region",
          "prefix"
        ]
      },
      ServerStorageLocationGetResponse: {
        type: "object",
        properties: {
          serverStorageLocation: {
            type: "object",
            properties: {
              accessKeyHashId: {
                type: "string"
              },
              accessKeyId: {
                type: "string"
              },
              endpoint: {
                type: "string"
              },
              bucket: {
                type: "string"
              },
              region: {
                type: "string"
              },
              prefix: {
                type: "string",
                minLength: 1,
                nullable: true
              }
            },
            required: [
              "accessKeyHashId",
              "accessKeyId",
              "endpoint",
              "bucket",
              "region",
              "prefix"
            ]
          }
        }
      },
      ServerStorageLocationInputDTO: {
        type: "object",
        properties: {
          accessKeyId: {
            type: "string",
            minLength: 1
          },
          secretAccessKey: {
            type: "string",
            minLength: 1
          },
          endpoint: {
            type: "string",
            format: "uri"
          },
          bucket: {
            type: "string",
            minLength: 1
          },
          region: {
            type: "string",
            minLength: 1
          },
          prefix: {
            oneOf: [
              {
                type: "string",
                minLength: 1,
                nullable: true
              },
              {}
            ]
          }
        },
        required: [
          "accessKeyId",
          "secretAccessKey",
          "endpoint",
          "bucket",
          "region"
        ]
      },
      TaskGetResponse: {
        type: "object",
        properties: {
          task: {
            type: "object",
            properties: {
              id: {
                type: "string",
                format: "uuid"
              },
              taskKey: {
                type: "string"
              },
              ownerIdentifier: {
                type: "string"
              },
              triggeringEventId: {
                type: "string",
                format: "uuid"
              },
              subjectFolderId: {
                type: "string",
                format: "uuid"
              },
              subjectObjectKey: {
                type: "string"
              },
              handlerId: {
                type: "string"
              },
              inputData: {
                type: "object",
                additionalProperties: {
                  oneOf: [
                    {
                      type: "string"
                    },
                    {
                      type: "number"
                    }
                  ]
                }
              },
              errorAt: {
                type: "string",
                format: "date-time"
              },
              errorCode: {
                type: "string"
              },
              errorMessage: {
                type: "string"
              },
              taskDescription: {
                type: "object",
                properties: {
                  textKey: {
                    type: "string"
                  },
                  variables: {
                    type: "object",
                    additionalProperties: {
                      type: "string"
                    }
                  }
                },
                required: [
                  "textKey",
                  "variables"
                ]
              },
              updates: {
                type: "array",
                items: {}
              },
              startedAt: {
                type: "string",
                format: "date-time"
              },
              completedAt: {
                type: "string",
                format: "date-time"
              },
              createdAt: {
                type: "string",
                format: "date-time"
              },
              updatedAt: {
                type: "string",
                format: "date-time"
              }
            },
            required: [
              "id",
              "taskKey",
              "ownerIdentifier",
              "triggeringEventId",
              "inputData",
              "taskDescription",
              "updates",
              "createdAt",
              "updatedAt"
            ]
          }
        },
        required: [
          "task"
        ]
      },
      TaskListResponse: {
        type: "object",
        properties: {
          meta: {
            type: "object",
            properties: {
              totalCount: {
                type: "number"
              }
            },
            required: [
              "totalCount"
            ]
          },
          result: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid"
                },
                taskKey: {
                  type: "string"
                },
                ownerIdentifier: {
                  type: "string"
                },
                triggeringEventId: {
                  type: "string",
                  format: "uuid"
                },
                subjectFolderId: {
                  type: "string",
                  format: "uuid"
                },
                subjectObjectKey: {
                  type: "string"
                },
                handlerId: {
                  type: "string"
                },
                inputData: {
                  type: "object",
                  additionalProperties: {
                    oneOf: [
                      {
                        type: "string"
                      },
                      {
                        type: "number"
                      }
                    ]
                  }
                },
                errorAt: {
                  type: "string",
                  format: "date-time"
                },
                errorCode: {
                  type: "string"
                },
                errorMessage: {
                  type: "string"
                },
                taskDescription: {
                  type: "object",
                  properties: {
                    textKey: {
                      type: "string"
                    },
                    variables: {
                      type: "object",
                      additionalProperties: {
                        type: "string"
                      }
                    }
                  },
                  required: [
                    "textKey",
                    "variables"
                  ]
                },
                updates: {
                  type: "array",
                  items: {}
                },
                startedAt: {
                  type: "string",
                  format: "date-time"
                },
                completedAt: {
                  type: "string",
                  format: "date-time"
                },
                createdAt: {
                  type: "string",
                  format: "date-time"
                },
                updatedAt: {
                  type: "string",
                  format: "date-time"
                }
              },
              required: [
                "id",
                "taskKey",
                "ownerIdentifier",
                "triggeringEventId",
                "inputData",
                "taskDescription",
                "updates",
                "createdAt",
                "updatedAt"
              ]
            }
          }
        },
        required: [
          "meta",
          "result"
        ]
      },
      TaskDTO: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid"
          },
          taskKey: {
            type: "string"
          },
          ownerIdentifier: {
            type: "string"
          },
          triggeringEventId: {
            type: "string",
            format: "uuid"
          },
          subjectFolderId: {
            type: "string",
            format: "uuid"
          },
          subjectObjectKey: {
            type: "string"
          },
          handlerId: {
            type: "string"
          },
          inputData: {
            type: "object",
            additionalProperties: {
              oneOf: [
                {
                  type: "string"
                },
                {
                  type: "number"
                }
              ]
            }
          },
          errorAt: {
            type: "string",
            format: "date-time"
          },
          errorCode: {
            type: "string"
          },
          errorMessage: {
            type: "string"
          },
          taskDescription: {
            type: "object",
            properties: {
              textKey: {
                type: "string"
              },
              variables: {
                type: "object",
                additionalProperties: {
                  type: "string"
                }
              }
            },
            required: [
              "textKey",
              "variables"
            ]
          },
          updates: {
            type: "array",
            items: {}
          },
          startedAt: {
            type: "string",
            format: "date-time"
          },
          completedAt: {
            type: "string",
            format: "date-time"
          },
          createdAt: {
            type: "string",
            format: "date-time"
          },
          updatedAt: {
            type: "string",
            format: "date-time"
          }
        },
        required: [
          "id",
          "taskKey",
          "ownerIdentifier",
          "triggeringEventId",
          "inputData",
          "taskDescription",
          "updates",
          "createdAt",
          "updatedAt"
        ]
      },
      EventDTO: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid"
          },
          eventKey: {
            type: "string"
          },
          level: {
            type: "string",
            enum: [
              "TRACE",
              "DEBUG",
              "INFO",
              "WARN",
              "ERROR"
            ]
          },
          emitterIdentifier: {
            type: "string"
          },
          locationContext: {
            type: "object",
            properties: {
              folderId: {
                type: "string",
                format: "uuid"
              },
              objectKey: {
                type: "string"
              }
            },
            required: [
              "folderId"
            ]
          },
          data: {},
          createdAt: {
            type: "string",
            format: "date-time"
          }
        },
        required: [
          "id",
          "eventKey",
          "level",
          "emitterIdentifier",
          "createdAt"
        ]
      },
      EventGetResponse: {
        type: "object",
        properties: {
          event: {
            type: "object",
            properties: {
              id: {
                type: "string",
                format: "uuid"
              },
              eventKey: {
                type: "string"
              },
              level: {
                type: "string",
                enum: [
                  "TRACE",
                  "DEBUG",
                  "INFO",
                  "WARN",
                  "ERROR"
                ]
              },
              emitterIdentifier: {
                type: "string"
              },
              locationContext: {
                type: "object",
                properties: {
                  folderId: {
                    type: "string",
                    format: "uuid"
                  },
                  objectKey: {
                    type: "string"
                  }
                },
                required: [
                  "folderId"
                ]
              },
              data: {},
              createdAt: {
                type: "string",
                format: "date-time"
              }
            },
            required: [
              "id",
              "eventKey",
              "level",
              "emitterIdentifier",
              "createdAt"
            ]
          }
        },
        required: [
          "event"
        ]
      },
      EventListResponse: {
        type: "object",
        properties: {
          meta: {
            type: "object",
            properties: {
              totalCount: {
                type: "number"
              }
            },
            required: [
              "totalCount"
            ]
          },
          result: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid"
                },
                eventKey: {
                  type: "string"
                },
                level: {
                  type: "string",
                  enum: [
                    "TRACE",
                    "DEBUG",
                    "INFO",
                    "WARN",
                    "ERROR"
                  ]
                },
                emitterIdentifier: {
                  type: "string"
                },
                locationContext: {
                  type: "object",
                  properties: {
                    folderId: {
                      type: "string",
                      format: "uuid"
                    },
                    objectKey: {
                      type: "string"
                    }
                  },
                  required: [
                    "folderId"
                  ]
                },
                data: {},
                createdAt: {
                  type: "string",
                  format: "date-time"
                }
              },
              required: [
                "id",
                "eventKey",
                "level",
                "emitterIdentifier",
                "createdAt"
              ]
            }
          }
        },
        required: [
          "meta",
          "result"
        ]
      },
      AppDTO: {
        type: "object",
        properties: {
          identifier: {
            type: "string"
          },
          publicKey: {
            type: "string"
          },
          config: {
            type: "object",
            properties: {
              description: {
                type: "string"
              },
              requiresStorage: {
                type: "boolean"
              },
              emittableEvents: {
                type: "array",
                items: {
                  type: "string"
                }
              },
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    key: {
                      type: "string"
                    },
                    label: {
                      type: "string"
                    },
                    triggers: {
                      type: "array",
                      items: {
                        discriminator: {
                          propertyName: "type"
                        },
                        oneOf: [
                          {
                            type: "object",
                            properties: {
                              type: {
                                type: "string",
                                enum: [
                                  "event"
                                ]
                              },
                              event: {
                                type: "string"
                              },
                              inputParams: {
                                type: "object",
                                additionalProperties: {
                                  type: "string"
                                }
                              }
                            },
                            required: [
                              "type",
                              "event",
                              "inputParams"
                            ]
                          },
                          {
                            type: "object",
                            properties: {
                              type: {
                                type: "string",
                                enum: [
                                  "objectAction"
                                ]
                              },
                              description: {
                                type: "string"
                              },
                              inputParams: {
                                type: "object",
                                additionalProperties: {
                                  type: "string"
                                }
                              }
                            },
                            required: [
                              "type",
                              "description",
                              "inputParams"
                            ]
                          },
                          {
                            type: "object",
                            properties: {
                              type: {
                                type: "string",
                                enum: [
                                  "folderAction"
                                ]
                              },
                              actionLabel: {
                                type: "string"
                              },
                              inputParams: {
                                type: "object",
                                additionalProperties: {
                                  type: "string"
                                }
                              }
                            },
                            required: [
                              "type",
                              "actionLabel",
                              "inputParams"
                            ]
                          }
                        ]
                      }
                    },
                    folderAction: {
                      type: "object",
                      properties: {
                        description: {
                          type: "string"
                        }
                      },
                      required: [
                        "description"
                      ]
                    },
                    objectAction: {
                      type: "object",
                      properties: {
                        description: {
                          type: "string"
                        }
                      },
                      required: [
                        "description"
                      ]
                    },
                    description: {
                      type: "string"
                    },
                    inputParams: {
                      type: "object",
                      additionalProperties: {
                        type: "object",
                        properties: {
                          type: {
                            type: "string",
                            enum: [
                              "boolean",
                              "string",
                              "number"
                            ]
                          },
                          default: {
                            oneOf: [
                              {
                                type: "string"
                              },
                              {
                                type: "number"
                              },
                              {
                                type: "boolean"
                              }
                            ],
                            nullable: true
                          }
                        },
                        required: [
                          "type"
                        ]
                      }
                    },
                    worker: {
                      type: "string"
                    }
                  },
                  required: [
                    "key",
                    "label",
                    "description"
                  ]
                }
              },
              externalWorkers: {
                type: "array",
                items: {
                  type: "string"
                }
              },
              workerScripts: {
                type: "object",
                additionalProperties: {
                  type: "object",
                  properties: {
                    description: {
                      type: "string"
                    },
                    envVars: {
                      type: "object",
                      additionalProperties: {
                        type: "string"
                      }
                    }
                  },
                  required: [
                    "description"
                  ]
                }
              },
              menuItems: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: {
                      type: "string"
                    },
                    iconPath: {
                      type: "string"
                    },
                    uiName: {
                      type: "string"
                    }
                  },
                  required: [
                    "label",
                    "uiName"
                  ]
                }
              }
            },
            required: [
              "description",
              "requiresStorage",
              "emittableEvents",
              "tasks",
              "menuItems"
            ]
          },
          manifest: {
            type: "array",
            items: {
              type: "object",
              properties: {
                path: {
                  type: "string"
                },
                hash: {
                  type: "string"
                },
                size: {
                  type: "number"
                }
              },
              required: [
                "path",
                "hash",
                "size"
              ]
            }
          },
          externalWorkers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                appIdentifier: {
                  type: "string"
                },
                workerId: {
                  type: "string"
                },
                handledTaskKeys: {
                  type: "array",
                  items: {
                    type: "string"
                  }
                },
                socketClientId: {
                  type: "string"
                },
                ip: {
                  type: "string"
                }
              },
              required: [
                "appIdentifier",
                "workerId",
                "handledTaskKeys",
                "socketClientId",
                "ip"
              ]
            }
          },
          workerScripts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: {
                  type: "string"
                },
                files: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      path: {
                        type: "string"
                      },
                      hash: {
                        type: "string"
                      },
                      size: {
                        type: "number"
                      }
                    },
                    required: [
                      "path",
                      "hash",
                      "size"
                    ]
                  }
                },
                envVars: {
                  type: "object",
                  additionalProperties: {
                    type: "string"
                  }
                },
                identifier: {
                  type: "string"
                }
              },
              required: [
                "description",
                "files",
                "envVars",
                "identifier"
              ]
            }
          },
          createdAt: {
            type: "string",
            format: "date-time"
          },
          updatedAt: {
            type: "string",
            format: "date-time"
          }
        },
        required: [
          "identifier",
          "publicKey",
          "config",
          "manifest",
          "externalWorkers",
          "workerScripts",
          "createdAt",
          "updatedAt"
        ]
      },
      AppListResponse: {
        type: "object",
        properties: {
          meta: {
            type: "object",
            properties: {
              totalCount: {
                type: "number"
              }
            },
            required: [
              "totalCount"
            ]
          },
          result: {
            type: "array",
            items: {
              type: "object",
              properties: {
                identifier: {
                  type: "string"
                },
                publicKey: {
                  type: "string"
                },
                config: {
                  type: "object",
                  properties: {
                    description: {
                      type: "string"
                    },
                    requiresStorage: {
                      type: "boolean"
                    },
                    emittableEvents: {
                      type: "array",
                      items: {
                        type: "string"
                      }
                    },
                    tasks: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          key: {
                            type: "string"
                          },
                          label: {
                            type: "string"
                          },
                          triggers: {
                            type: "array",
                            items: {
                              discriminator: {
                                propertyName: "type"
                              },
                              oneOf: [
                                {
                                  type: "object",
                                  properties: {
                                    type: {
                                      type: "string",
                                      enum: [
                                        "event"
                                      ]
                                    },
                                    event: {
                                      type: "string"
                                    },
                                    inputParams: {
                                      type: "object",
                                      additionalProperties: {
                                        type: "string"
                                      }
                                    }
                                  },
                                  required: [
                                    "type",
                                    "event",
                                    "inputParams"
                                  ]
                                },
                                {
                                  type: "object",
                                  properties: {
                                    type: {
                                      type: "string",
                                      enum: [
                                        "objectAction"
                                      ]
                                    },
                                    description: {
                                      type: "string"
                                    },
                                    inputParams: {
                                      type: "object",
                                      additionalProperties: {
                                        type: "string"
                                      }
                                    }
                                  },
                                  required: [
                                    "type",
                                    "description",
                                    "inputParams"
                                  ]
                                },
                                {
                                  type: "object",
                                  properties: {
                                    type: {
                                      type: "string",
                                      enum: [
                                        "folderAction"
                                      ]
                                    },
                                    actionLabel: {
                                      type: "string"
                                    },
                                    inputParams: {
                                      type: "object",
                                      additionalProperties: {
                                        type: "string"
                                      }
                                    }
                                  },
                                  required: [
                                    "type",
                                    "actionLabel",
                                    "inputParams"
                                  ]
                                }
                              ]
                            }
                          },
                          folderAction: {
                            type: "object",
                            properties: {
                              description: {
                                type: "string"
                              }
                            },
                            required: [
                              "description"
                            ]
                          },
                          objectAction: {
                            type: "object",
                            properties: {
                              description: {
                                type: "string"
                              }
                            },
                            required: [
                              "description"
                            ]
                          },
                          description: {
                            type: "string"
                          },
                          inputParams: {
                            type: "object",
                            additionalProperties: {
                              type: "object",
                              properties: {
                                type: {
                                  type: "string",
                                  enum: [
                                    "boolean",
                                    "string",
                                    "number"
                                  ]
                                },
                                default: {
                                  oneOf: [
                                    {
                                      type: "string"
                                    },
                                    {
                                      type: "number"
                                    },
                                    {
                                      type: "boolean"
                                    }
                                  ],
                                  nullable: true
                                }
                              },
                              required: [
                                "type"
                              ]
                            }
                          },
                          worker: {
                            type: "string"
                          }
                        },
                        required: [
                          "key",
                          "label",
                          "description"
                        ]
                      }
                    },
                    externalWorkers: {
                      type: "array",
                      items: {
                        type: "string"
                      }
                    },
                    workerScripts: {
                      type: "object",
                      additionalProperties: {
                        type: "object",
                        properties: {
                          description: {
                            type: "string"
                          },
                          envVars: {
                            type: "object",
                            additionalProperties: {
                              type: "string"
                            }
                          }
                        },
                        required: [
                          "description"
                        ]
                      }
                    },
                    menuItems: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          label: {
                            type: "string"
                          },
                          iconPath: {
                            type: "string"
                          },
                          uiName: {
                            type: "string"
                          }
                        },
                        required: [
                          "label",
                          "uiName"
                        ]
                      }
                    }
                  },
                  required: [
                    "description",
                    "requiresStorage",
                    "emittableEvents",
                    "tasks",
                    "menuItems"
                  ]
                },
                manifest: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      path: {
                        type: "string"
                      },
                      hash: {
                        type: "string"
                      },
                      size: {
                        type: "number"
                      }
                    },
                    required: [
                      "path",
                      "hash",
                      "size"
                    ]
                  }
                },
                externalWorkers: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      appIdentifier: {
                        type: "string"
                      },
                      workerId: {
                        type: "string"
                      },
                      handledTaskKeys: {
                        type: "array",
                        items: {
                          type: "string"
                        }
                      },
                      socketClientId: {
                        type: "string"
                      },
                      ip: {
                        type: "string"
                      }
                    },
                    required: [
                      "appIdentifier",
                      "workerId",
                      "handledTaskKeys",
                      "socketClientId",
                      "ip"
                    ]
                  }
                },
                workerScripts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      description: {
                        type: "string"
                      },
                      files: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            path: {
                              type: "string"
                            },
                            hash: {
                              type: "string"
                            },
                            size: {
                              type: "number"
                            }
                          },
                          required: [
                            "path",
                            "hash",
                            "size"
                          ]
                        }
                      },
                      envVars: {
                        type: "object",
                        additionalProperties: {
                          type: "string"
                        }
                      },
                      identifier: {
                        type: "string"
                      }
                    },
                    required: [
                      "description",
                      "files",
                      "envVars",
                      "identifier"
                    ]
                  }
                },
                createdAt: {
                  type: "string",
                  format: "date-time"
                },
                updatedAt: {
                  type: "string",
                  format: "date-time"
                }
              },
              required: [
                "identifier",
                "publicKey",
                "config",
                "manifest",
                "externalWorkers",
                "workerScripts",
                "createdAt",
                "updatedAt"
              ]
            }
          }
        },
        required: [
          "meta",
          "result"
        ]
      },
      AppGetResponse: {
        type: "object",
        properties: {
          app: {
            type: "object",
            properties: {
              identifier: {
                type: "string"
              },
              publicKey: {
                type: "string"
              },
              config: {
                type: "object",
                properties: {
                  description: {
                    type: "string"
                  },
                  requiresStorage: {
                    type: "boolean"
                  },
                  emittableEvents: {
                    type: "array",
                    items: {
                      type: "string"
                    }
                  },
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        key: {
                          type: "string"
                        },
                        label: {
                          type: "string"
                        },
                        triggers: {
                          type: "array",
                          items: {
                            discriminator: {
                              propertyName: "type"
                            },
                            oneOf: [
                              {
                                type: "object",
                                properties: {
                                  type: {
                                    type: "string",
                                    enum: [
                                      "event"
                                    ]
                                  },
                                  event: {
                                    type: "string"
                                  },
                                  inputParams: {
                                    type: "object",
                                    additionalProperties: {
                                      type: "string"
                                    }
                                  }
                                },
                                required: [
                                  "type",
                                  "event",
                                  "inputParams"
                                ]
                              },
                              {
                                type: "object",
                                properties: {
                                  type: {
                                    type: "string",
                                    enum: [
                                      "objectAction"
                                    ]
                                  },
                                  description: {
                                    type: "string"
                                  },
                                  inputParams: {
                                    type: "object",
                                    additionalProperties: {
                                      type: "string"
                                    }
                                  }
                                },
                                required: [
                                  "type",
                                  "description",
                                  "inputParams"
                                ]
                              },
                              {
                                type: "object",
                                properties: {
                                  type: {
                                    type: "string",
                                    enum: [
                                      "folderAction"
                                    ]
                                  },
                                  actionLabel: {
                                    type: "string"
                                  },
                                  inputParams: {
                                    type: "object",
                                    additionalProperties: {
                                      type: "string"
                                    }
                                  }
                                },
                                required: [
                                  "type",
                                  "actionLabel",
                                  "inputParams"
                                ]
                              }
                            ]
                          }
                        },
                        folderAction: {
                          type: "object",
                          properties: {
                            description: {
                              type: "string"
                            }
                          },
                          required: [
                            "description"
                          ]
                        },
                        objectAction: {
                          type: "object",
                          properties: {
                            description: {
                              type: "string"
                            }
                          },
                          required: [
                            "description"
                          ]
                        },
                        description: {
                          type: "string"
                        },
                        inputParams: {
                          type: "object",
                          additionalProperties: {
                            type: "object",
                            properties: {
                              type: {
                                type: "string",
                                enum: [
                                  "boolean",
                                  "string",
                                  "number"
                                ]
                              },
                              default: {
                                oneOf: [
                                  {
                                    type: "string"
                                  },
                                  {
                                    type: "number"
                                  },
                                  {
                                    type: "boolean"
                                  }
                                ],
                                nullable: true
                              }
                            },
                            required: [
                              "type"
                            ]
                          }
                        },
                        worker: {
                          type: "string"
                        }
                      },
                      required: [
                        "key",
                        "label",
                        "description"
                      ]
                    }
                  },
                  externalWorkers: {
                    type: "array",
                    items: {
                      type: "string"
                    }
                  },
                  workerScripts: {
                    type: "object",
                    additionalProperties: {
                      type: "object",
                      properties: {
                        description: {
                          type: "string"
                        },
                        envVars: {
                          type: "object",
                          additionalProperties: {
                            type: "string"
                          }
                        }
                      },
                      required: [
                        "description"
                      ]
                    }
                  },
                  menuItems: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: {
                          type: "string"
                        },
                        iconPath: {
                          type: "string"
                        },
                        uiName: {
                          type: "string"
                        }
                      },
                      required: [
                        "label",
                        "uiName"
                      ]
                    }
                  }
                },
                required: [
                  "description",
                  "requiresStorage",
                  "emittableEvents",
                  "tasks",
                  "menuItems"
                ]
              },
              manifest: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    path: {
                      type: "string"
                    },
                    hash: {
                      type: "string"
                    },
                    size: {
                      type: "number"
                    }
                  },
                  required: [
                    "path",
                    "hash",
                    "size"
                  ]
                }
              },
              externalWorkers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    appIdentifier: {
                      type: "string"
                    },
                    workerId: {
                      type: "string"
                    },
                    handledTaskKeys: {
                      type: "array",
                      items: {
                        type: "string"
                      }
                    },
                    socketClientId: {
                      type: "string"
                    },
                    ip: {
                      type: "string"
                    }
                  },
                  required: [
                    "appIdentifier",
                    "workerId",
                    "handledTaskKeys",
                    "socketClientId",
                    "ip"
                  ]
                }
              },
              createdAt: {
                type: "string",
                format: "date-time"
              },
              updatedAt: {
                type: "string",
                format: "date-time"
              },
              workerScripts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    description: {
                      type: "string"
                    },
                    files: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          path: {
                            type: "string"
                          },
                          hash: {
                            type: "string"
                          },
                          size: {
                            type: "number"
                          }
                        },
                        required: [
                          "path",
                          "hash",
                          "size"
                        ]
                      }
                    },
                    envVars: {
                      type: "object",
                      additionalProperties: {
                        type: "string"
                      }
                    },
                    identifier: {
                      type: "string"
                    }
                  },
                  required: [
                    "description",
                    "files",
                    "envVars",
                    "identifier"
                  ]
                }
              }
            },
            required: [
              "identifier",
              "publicKey",
              "config",
              "manifest",
              "externalWorkers",
              "createdAt",
              "updatedAt",
              "workerScripts"
            ]
          }
        },
        required: [
          "app"
        ]
      },
      SetWorkerScriptEnvVarsInputDTO: {
        type: "object",
        properties: {
          envVars: {
            type: "object",
            additionalProperties: {
              type: "string"
            }
          }
        },
        required: [
          "envVars"
        ]
      }
    }
  }
};
export {
  schema,
  ViewerApiFp,
  ViewerApiFactory,
  ViewerApiAxiosParamCreator,
  ViewerApi,
  UsersApiFp,
  UsersApiFactory,
  UsersApiAxiosParamCreator,
  UsersApi,
  UserStorageProvisionsApiFp,
  UserStorageProvisionsApiFactory,
  UserStorageProvisionsApiAxiosParamCreator,
  UserStorageProvisionsApi,
  UserStorageProvisionListResponseResultInnerProvisionTypesEnum,
  UserStorageProvisionInputDTOProvisionTypesEnum,
  UserStorageProvisionDTOProvisionTypesEnum,
  TasksApiFp,
  TasksApiFactory,
  TasksApiAxiosParamCreator,
  TasksApi,
  ServerTasksApiFp,
  ServerTasksApiFactory,
  ServerTasksApiAxiosParamCreator,
  ServerTasksApi,
  ServerStorageLocationApiFp,
  ServerStorageLocationApiFactory,
  ServerStorageLocationApiAxiosParamCreator,
  ServerStorageLocationApi,
  ServerEventsApiFp,
  ServerEventsApiFactory,
  ServerEventsApiAxiosParamCreator,
  ServerEventsApi,
  ServerApiFp,
  ServerApiFactory,
  ServerApiAxiosParamCreator,
  ServerApi,
  ServerAccessKeysApiFp,
  ServerAccessKeysApiFactory,
  ServerAccessKeysApiAxiosParamCreator,
  ServerAccessKeysApi,
  ListUsersSortEnum,
  ListUserStorageProvisionsProvisionTypeEnum,
  ListTasksSortEnum,
  ListTasksIncludeWaitingEnum,
  ListTasksIncludeRunningEnum,
  ListTasksIncludeFailedEnum,
  ListTasksIncludeCompleteEnum,
  ListServerAccessKeysSortEnum,
  ListFoldersSortEnum,
  ListFolderTasksSortEnum,
  ListFolderTasksIncludeWaitingEnum,
  ListFolderTasksIncludeRunningEnum,
  ListFolderTasksIncludeFailedEnum,
  ListFolderTasksIncludeCompleteEnum,
  ListFolderObjectsSortEnum,
  ListFolderEventsSortEnum,
  ListFolderEventsIncludeWarningEnum,
  ListFolderEventsIncludeTraceEnum,
  ListFolderEventsIncludeInfoEnum,
  ListFolderEventsIncludeErrorEnum,
  ListFolderEventsIncludeDebugEnum,
  ListEventsSortEnum,
  ListEventsIncludeWarningEnum,
  ListEventsIncludeTraceEnum,
  ListEventsIncludeInfoEnum,
  ListEventsIncludeErrorEnum,
  ListEventsIncludeDebugEnum,
  ListAccessKeysSortEnum,
  FoldersApiFp,
  FoldersApiFactory,
  FoldersApiAxiosParamCreator,
  FoldersApi,
  FolderShareGetResponseSharePermissionsEnum,
  FolderShareCreateInputDTOPermissionsEnum,
  FolderObjectListResponseResultInnerMediaTypeEnum,
  FolderObjectDTOMediaTypeEnum,
  FolderObjectDTOContentMetadataValueValueOneOfContentEnum,
  FolderObjectDTOContentMetadataValueValueOneOf1StorageKeyEnum,
  FolderObjectDTOContentMetadataValueValueOneOf1HashEnum,
  FolderListResponseResultInnerPermissionsEnum,
  FolderGetResponsePermissionsEnum,
  FolderEventsApiFp,
  FolderEventsApiFactory,
  FolderEventsApiAxiosParamCreator,
  FolderEventsApi,
  FolderDTOMetadataLocationProviderTypeEnum,
  FolderCreateSignedUrlInputDTOInnerMethodEnum,
  EventGetResponseEventLevelEnum,
  EventDTOLevelEnum,
  Configuration,
  AuthApiFp,
  AuthApiFactory,
  AuthApiAxiosParamCreator,
  AuthApi,
  AppsApiFp,
  AppsApiFactory,
  AppsApiAxiosParamCreator,
  AppsApi,
  AppDTOConfigTasksInnerTriggersInnerOneOfTypeEnum,
  AppDTOConfigTasksInnerTriggersInnerOneOf2TypeEnum,
  AppDTOConfigTasksInnerTriggersInnerOneOf1TypeEnum,
  AppDTOConfigTasksInnerInputParamsValueTypeEnum,
  AccessKeysApiFp,
  AccessKeysApiFactory,
  AccessKeysApiAxiosParamCreator,
  AccessKeysApi
};
